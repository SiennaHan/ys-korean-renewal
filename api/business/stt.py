import asyncio
import base64
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
SHADOW_ENABLED = True
SHADOW_SAMPLE_RATE = 1.0
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
            audio_url = await s3utils.public_upload_to_s3(
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
        return {
            "items": [jsonable_encoder(i) for i in items],
            "total": total,
            "limit": limit,
            "offset": offset,
            "kind": kind,
            **summary,
        }
