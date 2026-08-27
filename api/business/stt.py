import asyncio
import base64
import os
import random
import re
import time
from typing import Optional
from uuid import uuid4

from fastapi import BackgroundTasks, HTTPException
from fastapi.encoders import jsonable_encoder

from persistence.database import sessionScope
from persistence import repo_stt
from util import s3utils
from xternal import openai, rtzr, tutorus

# shadow 수집 on/off 및 샘플링 비율(1.0 = 전부). 데이터 충분히 모으면 낮추거나 끄면 됨.
# 엔진 비교(shadow)를 얼마나 켤지. **환경에서 받는다.**
# 전에는 코드에 True · 1.0 이 박혀 있어 **모든 학습자 음성이 전량 보관**됐다
# (2026-08-27 발견 — BLOCKERS). 비교가 목적이면 표본이면 된다.
# 기본을 0.1 로 둔다 — 켜 두되 열에 하나만. 끄려면 STT_SHADOW_ENABLED=0.
SHADOW_ENABLED = os.getenv("STT_SHADOW_ENABLED", "1") not in ("0", "false", "False")
SHADOW_SAMPLE_RATE = float(os.getenv("STT_SHADOW_SAMPLE_RATE", "0.1"))
SHADOW_DIR = "stt/shadow"


def _normalize(text: Optional[str]) -> Optional[str]:
    if text is None:
        return None
    return re.sub(r"[\s\.\,\?\!]", "", text)


def _levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cost = 0 if ca == cb else 1
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost))
        prev = cur
    return prev[-1]


def _diff_kind(other_text: Optional[str], openai_text: Optional[str], is_match) -> str:
    """불일치 유형 분류(모니터링 보조용, 정답이 아니라 휴리스틱).
    비교 상대(other_text)는 VITO(rtzr) 전사 — Clova 제거 후 남은 상용 STT 기준선.
    - match: 정규화 후 동일
    - ortho: 자소분리 흔적이 있거나 편집거리 1~2 (되/돼, 할게/할께 등 표기 오변환)
    - content: 그 외 실제 단어 차이
    - na: openai 실패
    """
    if openai_text is None:
        return "na"
    if is_match:
        return "match"
    raw = (other_text or "") + (openai_text or "")
    # 호환용 자모 블록(U+3130~U+318F)이 섞이면 자소분리 STT 산출물로 간주
    if any(0x3130 <= ord(ch) <= 0x318F for ch in raw):
        return "ortho"
    a = _normalize(other_text) or ""
    b = _normalize(openai_text) or ""
    d = _levenshtein(a, b)
    if 0 < d <= 2:
        return "ortho"
    return "content"


async def transcribeWithShadow(
    user_id: Optional[str],
    base64sound: str,
    background_tasks: Optional[BackgroundTasks] = None,
) -> str:
    """사용자에게는 OpenAI 전사 결과를 반환한다(주 전사기).
    폴백은 없다 — OpenAI 가 실패하면 503 으로 알린다(과거 Clova 폴백은 제거됨).
    VITO/Tutorus 비교는 어드민 모니터링용으로 백그라운드에서 기록한다."""
    try:
        audio_bytes = base64.b64decode(base64sound.encode("utf-8"))
    except Exception:
        audio_bytes = None

    t0 = time.perf_counter()
    openai_text = None
    openai_ms = None
    try:
        if audio_bytes is None:
            raise ValueError("base64 decode failed")
        openai_text = await openai.transcribe(audio_bytes)
        openai_ms = int((time.perf_counter() - t0) * 1000)
    except Exception as e:
        print(f"[stt] openai 전사 실패: {e}")
        raise HTTPException(status_code=503, detail="음성 인식에 실패했습니다. 다시 시도해 주세요.")

    primary_text = openai_text

    if (
        SHADOW_ENABLED
        and background_tasks is not None
        and random.random() < SHADOW_SAMPLE_RATE
    ):
        background_tasks.add_task(
            _run_shadow, user_id, base64sound, openai_text, openai_ms
        )

    return primary_text


async def _run_shadow(
    user_id: Optional[str], base64sound: str, openai_text: Optional[str], openai_ms: Optional[int]
):
    audio_url = None
    rtzr_text = None
    rtzr_ms = None
    tutorus_text = None
    tutorus_ms = None
    err = None
    rtzr_err = None
    tutorus_err = None

    try:
        audio_bytes = base64.b64decode(base64sound.encode("utf-8"))
    except Exception as e:
        audio_bytes = None
        err = f"decode: {e}"

    if audio_bytes:
        try:
            # **비공개로 올린다.** 학습자의 목소리다 — 주소를 아는 사람이
            # 로그인 없이 듣게 두면 안 된다. 들으려면 presign 이 필요하다
            audio_url = await s3utils.private_upload_to_s3(
                audio_bytes, SHADOW_DIR, f"{uuid4().hex}.webm", "audio/webm"
            )
        except Exception as e:
            err = ((err + " | ") if err else "") + f"s3: {e}"

        # VITO·Tutorus 전사를 병렬로 수행 (OpenAI 는 주 전사로 이미 계산됨).
        # 한쪽 실패가 다른 쪽에 영향 없도록 gather.
        async def _rtzr():
            t = time.perf_counter()
            text = await rtzr.transcribe(audio_bytes)
            return text, int((time.perf_counter() - t) * 1000)

        # 비원어민 발음을 교정 없이 전사 → 학습자가 실제로 어떻게 발음했는지 비교용
        async def _tutorus():
            t = time.perf_counter()
            text = await tutorus.transcribe(audio_bytes)
            return text, int((time.perf_counter() - t) * 1000)

        lanes = [_rtzr()]
        if tutorus.STT_ENABLED:
            lanes.append(_tutorus())

        results = await asyncio.gather(*lanes, return_exceptions=True)
        rtzr_res = results[0]
        tutorus_res = results[1] if len(results) > 1 else None

        if isinstance(rtzr_res, Exception):
            rtzr_err = f"rtzr: {rtzr_res}"
        else:
            rtzr_text, rtzr_ms = rtzr_res

        if isinstance(tutorus_res, Exception):
            tutorus_err = f"tutorus: {tutorus_res}"
        elif tutorus_res is not None:
            tutorus_text, tutorus_ms = tutorus_res

    # Clova 제거 후 비교 기준선은 VITO(rtzr) 전사.
    is_match = None
    if openai_text is not None and rtzr_text is not None:
        is_match = _normalize(rtzr_text) == _normalize(openai_text)
    diff_kind = _diff_kind(rtzr_text, openai_text, is_match)

    try:
        with sessionScope() as db:
            await repo_stt.insertShadow(
                db,
                user_id=user_id,
                audio_url=audio_url,
                openai_text=openai_text,
                openai_model=openai.STT_MODEL,
                rtzr_text=rtzr_text,
                rtzr_model=rtzr.STT_MODEL,
                tutorus_text=tutorus_text,
                tutorus_model=tutorus.STT_MODEL,
                openai_ms=openai_ms,
                rtzr_ms=rtzr_ms,
                tutorus_ms=tutorus_ms,
                is_match=is_match,
                diff_kind=diff_kind,
                openai_error=(err[:300] if err else None),
                rtzr_error=(rtzr_err[:300] if rtzr_err else None),
                tutorus_error=(tutorus_err[:300] if tutorus_err else None),
            )
    except Exception as e:
        print(f"[stt-shadow] insert failed: {e}")


async def listShadow(limit: int, offset: int, kind: str):
    with sessionScope() as db:
        items, total = await repo_stt.listShadow(db, limit, offset, kind)
        summary = await repo_stt.countSummary(db)
        # 음성은 비공개다. 어드민이 들을 수 있게 **짧게 사는 주소**로 바꿔 낸다 —
        # 목록에 담긴 채로 새어 나가도 몇 분 뒤에는 못 듣는다
        def _withPresigned(row):
            d = jsonable_encoder(row)
            if d.get("audio_url"):
                try:
                    d["audio_url"] = s3utils.presign(d["audio_url"])
                except Exception as e:
                    print(f"[stt-shadow] presign 실패 — {e!r}")
                    d["audio_url"] = None
            return d

        return {
            "items": [_withPresigned(i) for i in items],
            "total": total,
            "limit": limit,
            "offset": offset,
            "kind": kind,
            **summary,
        }


# ── 보관 기간 ─────────────────────────────────────────────────────────
# 며칠 지나면 지울지. **기간은 개인정보 처리방침에 적을 값이라 기획이 정한다** —
# 여기서는 기계만 만들고 값은 환경에서 받는다(phase1/legal_draft_v1.html §03 제4조).
# 0 이면 지우지 않는다 — 정해지지 않았을 때 마음대로 지워 버리지 않기 위해서다.
SHADOW_RETENTION_DAYS = int(os.getenv("STT_SHADOW_RETENTION_DAYS", "0"))


async def pruneShadow(days: int = None, limit: int = 500, dryRun: bool = False):
    """보관 기간이 지난 음성과 그 행을 지운다.

    **음성 파일을 먼저 지우고 행을 지운다.** 반대로 하면 주소를 잃어버려
    S3 에 파일만 남는다 — 지워야 할 것이 조용히 살아남는 쪽이 더 나쁘다.

    저절로 돌지 않는다. `api/tools/prune_stt_shadow.py` 를 **크론에 걸어야 한다** —
    요청 처리 중에 몰래 돌리면 언제 지워지는지 아무도 모르게 된다.
    """
    from datetime import datetime, timedelta

    days = SHADOW_RETENTION_DAYS if days is None else days
    if days <= 0:
        return {"skipped": "보관 기간이 정해지지 않았다 (STT_SHADOW_RETENTION_DAYS)"}

    cutoff = datetime.utcnow() - timedelta(days=days)
    with sessionScope() as db:
        rows = await repo_stt.listShadowOlderThan(db, cutoff, limit)
        targets = [(r.id, r.audio_url) for r in rows]

    if dryRun:
        return {"days": days, "would_delete": len(targets), "cutoff": cutoff.isoformat()}

    # **성공한 것만 골라 지운다.** 처음에 실패 개수만 세었더니 하나라도 실패하면
    # 잘 지워진 것까지 행이 남았다 — 그러면 다음 번에 이미 없는 파일을 또 지우려 든다
    okIds, audioFailed = [], 0
    for _id, url in targets:
        if not url:
            okIds.append(_id)  # 음성이 없는 행. 지울 파일도 없다
            continue
        try:
            await s3utils.delete_object(url)
            okIds.append(_id)
        except Exception as e:
            audioFailed += 1
            print(f"[stt-shadow] 음성 삭제 실패 — id[{_id}] {e!r}")

    # 파일을 못 지운 행은 남긴다. 행을 먼저 지우면 주소를 잃어 S3 에 파일만 남는다
    with sessionScope() as db:
        rowsDeleted = await repo_stt.deleteShadowByIds(db, okIds)
    audioDeleted = len([1 for i, u in targets if u and i in set(okIds)])

    return {
        "days": days,
        "cutoff": cutoff.isoformat(),
        "audio_deleted": audioDeleted,
        "audio_failed": audioFailed,
        "rows_deleted": rowsDeleted,
    }
