"""발음평가 결과 가공 — 원본 응답을 프런트가 바로 쓸 수 있는 형태로 요약한다.

[임시 도입 검증용] 제거 방법은 xternal/tutorus.py 상단 주석 참고.
DB 저장은 하지 않는다(스키마 변경 없음 = 원복 부담 없음).
"""

import asyncio
import base64
import re

import requests

from persistence.database import sessionScope
from persistence import repo_stt
from xternal import tutorus

# 규격서 §4.3 의 proficiencyScore.name → 프런트에서 쓸 키
_SCORE_KEYS = {
    "KO_HOLISTIC": "overall",       # 종합 발음 점수
    "KO_SEGMENT": "segment",        # 음소/분절
    "KO_SPEED": "speed",            # 발화 속도
    "KO_SUPRASEGMENT": "prosody",   # 억양/초분절
    "acoustic": "acoustic",         # 음향 신뢰도
}

# 음소 점수는 LLR 기반이라 0~100 이 아니다. 이 값 미만을 '약한 음소'로 본다.
_WEAK_PHONE_THRESHOLD = 5.0
_WEAK_WORD_THRESHOLD = 60.0
_MAX_WEAK_ITEMS = 5


def _decode_audio(base64sound: str) -> bytes:
    """프런트가 data URI 접두사를 붙여 보내는 경우까지 흡수한다."""
    raw = re.sub(r"^data:audio/[^;]+;base64,", "", base64sound or "", count=1)
    raw = re.sub(r"[^A-Za-z0-9+/=]", "", raw)
    padding = len(raw) % 4
    if padding:
        raw += "=" * (4 - padding)
    try:
        return base64.b64decode(raw)
    except Exception:
        raise tutorus.TutorusError("오디오 디코딩에 실패했습니다.", 400)


def _scores(entries) -> dict:
    out = {}
    for item in entries or []:
        key = _SCORE_KEYS.get(item.get("name"))
        if key:
            out[key] = item.get("score")
    return out


def summarize(result: dict) -> dict:
    """sentenceLevel / wordLevel / phoneLevel → 요약 + 취약 지점."""
    sentence = result.get("sentenceLevel") or {}
    words = result.get("wordLevel") or []
    phones = result.get("phoneLevel") or []

    word_items = []
    for w in words:
        score = None
        for s in w.get("proficiencyScore") or []:
            if s.get("name") == "acoustic":
                score = s.get("score")
        word_items.append(
            {
                "index": w.get("index"),
                "text": w.get("text"),
                "score": score,
                "start": w.get("startTimeInSec"),
                "end": w.get("endTimeInSec"),
            }
        )

    weak_words = sorted(
        (w for w in word_items if isinstance(w["score"], (int, float))
         and w["score"] < _WEAK_WORD_THRESHOLD),
        key=lambda w: w["score"],
    )[:_MAX_WEAK_ITEMS]

    word_text = {w.get("index"): w.get("text") for w in words}
    weak_phones = []
    for group in phones:
        for p in group or []:
            score = p.get("score")
            if isinstance(score, (int, float)) and score < _WEAK_PHONE_THRESHOLD:
                weak_phones.append(
                    {
                        "word": word_text.get(p.get("windex")),
                        "phone": p.get("text"),
                        "score": score,
                        "start": p.get("startTimeInSec"),
                        "end": p.get("endTimeInSec"),
                    }
                )
    weak_phones.sort(key=lambda p: p["score"])
    weak_phones = weak_phones[:_MAX_WEAK_ITEMS]

    start = sentence.get("startTimeInSec")
    end = sentence.get("endTimeInSec")
    duration = None
    if isinstance(start, (int, float)) and isinstance(end, (int, float)):
        duration = round(end - start, 2)

    return {
        "text": sentence.get("text"),
        "score": _scores(sentence.get("proficiencyScore")),
        "durationSec": duration,
        "words": word_items,
        "weakWords": weak_words,
        "weakPhones": weak_phones,
        "intonation": (sentence.get("intonation") or {}).get("data"),
    }


async def evaluatePronunciation(
    reference: str, base64sound: str, include_raw: bool = False
) -> dict:
    audio_bytes = _decode_audio(base64sound)
    result = await tutorus.evaluate(reference, audio_bytes)

    summary = summarize(result)
    if include_raw:
        summary["raw"] = result
    return summary


def _download(url: str) -> bytes:
    resp = requests.get(url, timeout=20)
    if resp.status_code != 200:
        raise tutorus.TutorusError(f"오디오 다운로드 실패({resp.status_code}).", 502)
    return resp.content


async def evaluateShadow(shadow_id: int) -> dict:
    """STT shadow 행의 실제 학생 음성을 발음평가한다 (어드민 온디맨드).

    shadow 에는 '정답 문장'이 없으므로 OpenAI 전사문을 기준으로 삼는다. OpenAI 는
    비원어민 발음을 표준어로 교정해 받아적으므로 "학생이 말하려던 문장"의 근사치로
    쓸 수 있다. 다만 어디까지나 근사치이며, 전사가 틀렸다면 점수도 그만큼 어긋난다.
    (프런트에 reference 를 함께 돌려주어 무엇을 기준으로 채점했는지 보이게 한다.)
    """
    with sessionScope() as db:
        row = await repo_stt.getShadow(db, shadow_id)
        if row is None:
            raise tutorus.TutorusError("해당 기록을 찾을 수 없습니다.", 404)
        audio_url = row.audio_url
        reference = (row.openai_text or row.rtzr_text or "").strip()

    if not audio_url:
        raise tutorus.TutorusError("저장된 오디오가 없습니다.", 400)
    if not reference:
        raise tutorus.TutorusError("기준으로 삼을 전사문이 없습니다.", 400)

    audio_bytes = await asyncio.to_thread(_download, audio_url)
    result = await tutorus.evaluate(reference, audio_bytes)

    summary = summarize(result)
    summary["reference"] = reference
    return summary
