import asyncio
import hashlib
import os
import re

from fastapi import HTTPException

from persistence import repo_chat
from persistence.database import sessionScope
from util import s3utils
from xternal import gemini
from xternal import openai as openai_xternal

# ---------------------------------------------------------------------------
# 어드민 목소리 테스트 (/tts/test) — 기존 유지
# ---------------------------------------------------------------------------
VOICES = {
    "gemini": gemini.VOICES,
    "openai": openai_xternal.TTS_VOICES,
}


async def convertTtsTest(provider: str, text: str, voice: str) -> bytes:
    if provider == "gemini":
        return await gemini.gemini_tts(text, voice)
    if provider == "openai":
        return await openai_xternal.tts(text, voice)

    raise HTTPException(status_code=400, detail=f"unknown tts provider: {provider}")


# ---------------------------------------------------------------------------
# 공통 TTS 코어 (provider 추상화 + S3 해시 캐시)
#
# 앱 전역은 추상 목소리 디스크립터 (gender, slot)만 다룬다.
# 제공사별 voice 테이블이 이를 실제 목소리 이름으로 변환한다.
# 제공사 교체 = TTS_PROVIDER 값 + 해당 제공사 voices 테이블만 손대면 끝.
# ---------------------------------------------------------------------------
TTS_PROVIDER = os.getenv("TTS_PROVIDER", "gemini")

# 단어 사전생성 배치의 기본 합성 엔진.
# Gemini TTS 는 짧은 한국어 단어를 세이프티 필터로 오차단(PROHIBITED_CONTENT)하거나,
# 낭독을 폭주시켜 무관한 문장을 생성(예: "한국어" → 긴 문장)하는 문제가 있어 단어에는
# 쓰지 않는다. 런타임 조회에는 영향이 없다(생성은 배치에서만 일어난다).
WORD_PREGEN_PROVIDER = os.getenv("WORD_PREGEN_PROVIDER", "openai")

# synth 는 async (text, voiceName) -> bytes 시그니처를 따른다.
PROVIDERS = {
    "gemini": {
        "synth": gemini.gemini_tts,
        "ext": "wav",
        "mime": "audio/wav",
        "voices": {
            "male": ["Charon", "Orus"],
            "female": ["Erinome", "Kore", "Leda", "Aoede"],
        },
    },
    "openai": {
        "synth": openai_xternal.tts,
        "ext": "mp3",
        "mime": "audio/mpeg",
        "voices": {
            "male": ["onyx", "echo"],
            "female": ["nova", "shimmer"],
        },
    },
}

S3_DIRNAME = "tts/audio"

_GENDER_ALIAS = {"남": "male", "여": "female", "male": "male", "female": "female"}


def _normGender(gender: str) -> str:
    return _GENDER_ALIAS.get((gender or "").strip(), "female")


def resolveVoice(gender: str, slot: int = 0, provider: str | None = None) -> str:
    """추상 (gender, slot) → provider 의 실제 목소리 이름. 풀 초과 시 마지막으로 clamp."""
    pool = PROVIDERS[provider or TTS_PROVIDER]["voices"][_normGender(gender)]
    idx = min(max(slot, 0), len(pool) - 1)
    return pool[idx]


def ttsHash(provider: str, voiceName: str, text: str) -> str:
    # provider 를 키에 포함 → 제공사 교체 시 옛 음원과 섞이지 않고 자동 재생성
    return hashlib.sha256(f"{provider}::{voiceName}::{text}".encode("utf-8")).hexdigest()


# --- 단어(고립 어휘) 캐시 키 ---
# 단어 음성은 사전생성 배치로만 만들고 런타임은 조회만 한다. 따라서 키는 "합성에 쓴
# 제공사"와 분리돼 고정이어야 한다 — 나중에 다른 엔진으로 재생성해도 조회가 그대로
# 히트해야 하기 때문. 아래 값은 기존 자산(2,700여 건)이 저장된 형식을 그대로 따른 것이라
# 문자열에 "naver"/화자명이 남아 있지만, 외부 연동이 아니라 **저장 키**일 뿐이다.
# 바꾸려면 ko_tts_cache.hash 를 전량 재계산해야 하므로 임의로 수정하지 말 것.
WORD_CACHE_PROVIDER = "naver"
WORD_CACHE_VOICES = {"male": "njonghyeok", "female": "nyuna"}


def wordCacheHash(gender: str, text: str) -> str:
    """단어 음성의 캐시 키. 조회(런타임)와 저장(배치)이 반드시 이 함수를 함께 쓴다."""
    return ttsHash(
        WORD_CACHE_PROVIDER, WORD_CACHE_VOICES[_normGender(gender)], text
    )


async def synthesize(text: str, voiceName: str, provider: str | None = None):
    """provider 로 TTS 생성. (audio_bytes, ext, mime) 반환. 제공사 교체 지점은 여기 하나."""
    p = PROVIDERS[provider or TTS_PROVIDER]
    audio = await p["synth"](text, voiceName)
    return audio, p["ext"], p["mime"]


async def getCachedTtsUrl(
    text: str, voiceName: str, db, provider: str | None = None, force: bool = False
) -> dict:
    """⭐ 공통 코어. hash → 캐시 조회 → 미스 시 생성·S3 업로드·upsert.

    같은 (provider, voice, text)는 기능 불문 한 번만 생성된다.
    동시 요청은 upsertTtsCache 의 on_duplicate_key_update + 동일 S3 키 덮어쓰기로
    last-write-wins (멱등) 처리된다.
    force=True 는 캐시를 무시하고 재생성·덮어쓴다 (불량 음원 재생성 배치용).
    """
    provider = provider or TTS_PROVIDER
    hashKey = ttsHash(provider, voiceName, text)

    if not force:
        cached = await repo_chat.getTtsCache(hashKey, db)
        if cached is not None:
            return {"url": cached.url, "cached": True}

    audio, ext, mime = await synthesize(text, voiceName, provider)
    s3url = await s3utils.public_upload_to_s3(audio, S3_DIRNAME, f"{hashKey}.{ext}", mime)
    await repo_chat.upsertTtsCache(hashKey, voiceName, text, s3url, db)

    return {"url": s3url, "cached": False}


async def getCachedTtsUrlByGender(
    text: str, gender: str, slot: int, db, provider: str | None = None
) -> dict:
    return await getCachedTtsUrl(
        text, resolveVoice(gender, slot, provider), db, provider
    )


async def generateAudio(text: str, gender: str) -> dict:
    """단발 TTS (미션챗 AI 메시지·AI 롤플레이). 자체 세션 사용."""
    with sessionScope() as db:
        return await getCachedTtsUrlByGender(text, gender, 0, db)


# 단어 표기에는 발음과 무관한 표시가 섞여 있다:
#  - 뜻 구분용 괄호 주석: "나다 (기침이)"  → TTS가 "기침이"까지 읽으면 안 됨
#  - 접사 표시 하이픈: "-들"              → 하이픈은 읽히면 안 됨
# 화면·데이터의 원본 표기는 유지하고, 음성 합성에 넣기 직전에만 이 표시를 제거한다.
_PAREN_RE = re.compile(r"[\(（][^\)）]*[\)）]")  # 반각/전각 괄호 + 내부 내용


def normalizeWordForTts(text: str) -> str:
    """단어 표기에서 괄호(내용 포함)와 하이픈을 제거한 발음용 텍스트. 결과가 비면 원본 유지."""
    cleaned = _PAREN_RE.sub("", text)
    cleaned = cleaned.replace("-", " ").replace("‐", " ").replace("–", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned or text.strip()


async def getWordAudio(text: str, gender: str = "female") -> dict:
    """단어(고립 어휘) 음성 URL **조회 전용**. 런타임에서는 생성하지 않는다.

    음원은 사전생성 배치(pregenWordAudio)로만 채운다. 요청마다 외부 TTS 를 때리지
    않으므로 비용·지연이 0 이고, 게스트 토큰을 통한 비용성 남용도 원천 차단된다.
    미생성 단어는 url=None 을 반환하며, 프런트는 재생을 건너뛴다.
    괄호 주석·하이픈은 조회 키를 만들기 전에 제거한다(normalizeWordForTts).
    """
    spoken = normalizeWordForTts(text)
    with sessionScope() as db:
        cached = await repo_chat.getTtsCache(wordCacheHash(gender, spoken), db)
        # url 은 반드시 세션 안에서 읽는다 — sessionScope 는 빠져나갈 때 commit·close 하고
        # expire_on_commit 기본값이 True 라, 밖에서 접근하면 DetachedInstanceError 가 난다.
        url = cached.url if cached is not None else None

    if url is None:
        # 배치에서 누락된 단어 — tools/audit_word_tts.py 로 주기적으로 확인할 것
        print(f"[tts/word] 사전생성된 음원 없음: {spoken!r} (gender={gender})")
        return {"url": None, "cached": False}

    return {"url": url, "cached": True}


async def pregenWordAudio(
    text: str, gender: str, db, provider: str, force: bool = False
) -> dict:
    """단어 음성 **사전생성 배치 전용**. 런타임 경로에서는 호출하지 않는다.

    합성 엔진(provider)이 무엇이든 저장 키는 wordCacheHash 로 고정된다 — 그래야
    나중에 다른 엔진으로 재생성해도 getWordAudio 조회가 그대로 히트한다.
    force=True 면 캐시를 무시하고 재생성해 같은 키에 덮어쓴다.
    """
    spoken = normalizeWordForTts(text)
    hashKey = wordCacheHash(gender, spoken)

    if not force:
        cached = await repo_chat.getTtsCache(hashKey, db)
        if cached is not None:
            return {"url": cached.url, "cached": True}

    audio, ext, mime = await synthesize(spoken, resolveVoice(gender, 0, provider), provider)
    s3url = await s3utils.public_upload_to_s3(audio, S3_DIRNAME, f"{hashKey}.{ext}", mime)
    await repo_chat.upsertTtsCache(
        hashKey, WORD_CACHE_VOICES[_normGender(gender)], spoken, s3url, db
    )
    return {"url": s3url, "cached": False}


# ---------------------------------------------------------------------------
# listen-answer (듣고 질문에 답하기) — provider 독립
# 지시문(question)은 음성 없이 화면 표시만 한다. 발화 라인만 TTS 생성.
# ---------------------------------------------------------------------------
def assignSlots(lines: list) -> dict:
    """{speaker: (gender, slot)} — 성별별 distinct 화자를 첫 등장 순서대로 slot(0,1,2..) 부여.

    slot 은 추상값(제공사 무관). 실제 목소리는 resolveVoice 가 결정한다.
    """
    order = {"male": [], "female": []}
    result = {}
    for line in lines:
        spk = line.get("speaker", "")
        if spk in result:
            continue
        gender = _normGender(line.get("voice", "female"))
        seen = order[gender]
        if spk not in seen:
            seen.append(spk)
        result[spk] = (gender, seen.index(spk))
    return result


# 라인 병렬 생성의 동시 요청 상한 (워커 프로세스 단위).
# Gemini TTS preview 모델의 RPM 은 문서에 미공개(프로젝트별 실제 값은 AI Studio 에서
# 확인). 현재 프로젝트는 Tier 2 라 한도가 넉넉해 기본 10 (최장 지문 11라인 커버).
# RPM 이 낮은 프로젝트에 배포할 때는 env 로 낮출 것.
# 상한을 넘겨 429 가 나면 gemini.py 의 Retry-After 재시도가 흡수한다.
TTS_CONCURRENCY = int(os.getenv("TTS_CONCURRENCY", "10"))
_lineTtsSemaphore = asyncio.Semaphore(TTS_CONCURRENCY)


async def _lineUrl(text: str, voiceName: str, force: bool = False) -> str:
    # 배치 병렬 처리를 위해 라인마다 독립 세션 사용
    async with _lineTtsSemaphore:
        with sessionScope() as db:
            res = await getCachedTtsUrl(text, voiceName, db, force=force)
    return res["url"]


async def getListenAudio(lines: list, force: bool = False) -> dict:
    """각 발화 라인의 음성 URL 을 순서대로 반환. 라인은 병렬 생성하되 동시 요청은
    TTS_CONCURRENCY 로 제한한다 (무제한 병렬은 429 폭주). (지시문은 음성 없음)
    force=True 는 캐시를 무시하고 전 라인 재생성 (generate_tts_samples.py 배치용)."""
    slotMap = assignSlots(lines)

    jobs = []
    for line in lines:
        gender, slot = slotMap[line.get("speaker", "")]
        jobs.append((line["text"], resolveVoice(gender, slot)))

    urls = await asyncio.gather(*[_lineUrl(text, voice, force) for text, voice in jobs])
    return {"urls": list(urls)}
