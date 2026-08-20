import asyncio
import base64
import io
import json
import os
import re
import time
import wave

import httpx
import requests
from dotenv import load_dotenv

load_dotenv(override=True)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY environment variable required")

TTS_MODEL = "gemini-3.1-flash-tts-preview"
TTS_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{TTS_MODEL}:generateContent"
STREAM_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{TTS_MODEL}:streamGenerateContent"

# Gemini TTS raw PCM 포맷 (프런트 Web Audio 재생용)
PCM_SAMPLE_RATE = 24000
PCM_CHANNELS = 1
PCM_SAMPLE_WIDTH = 2  # 16-bit

DEFAULT_VOICE = "Kore"

# 429(Too Many Requests) 재시도 횟수 / 1회 최대 대기(초).
# preview TTS 모델은 RPM 한도가 낮아 배치 생성 시 429가 일상적으로 발생한다.
RATE_LIMIT_RETRIES = 3
RATE_LIMIT_MAX_WAIT = 20.0

# 긴 텍스트(500~1300자 나레이션)는 통짜 생성 시 오디오가 잘리거나(한 문장만 재생)
# 아예 실패한다 → 문장 단위로 묶어 이 길이 이하 청크로 나눠 생성 후 이어붙인다.
# 180자는 프로덕션에서 정상 생성이 검증된 대화 라인 최대 길이(약 190자) 이하 값.
TTS_CHUNK_MAX_CHARS = 180
TTS_CHUNK_GAP_MS = 250  # 청크(문장 그룹) 사이 무음

_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.?!])\s+")


def splitForTts(text: str) -> list[str]:
    """문장 경계로 나눠 TTS_CHUNK_MAX_CHARS 이하 청크로 그리디 병합.
    (test/tts-regen 검증 및 generate_tts_samples.py 와 동일 규칙)"""
    out, cur = [], ""
    for sent in _SENTENCE_SPLIT_RE.split(text.strip()):
        if cur and len(cur) + 1 + len(sent) > TTS_CHUNK_MAX_CHARS:
            out.append(cur)
            cur = sent
        else:
            cur = f"{cur} {sent}".strip()
    if cur:
        out.append(cur)
    return out

# Gemini TTS 사전정의 화자(prebuilt voice) 중 테스트용으로 노출할 목록
VOICES = ["Kore", "Puck", "Zephyr", "Charon", "Fenrir", "Leda", "Aoede", "Orus", "Erinome"]


def _pcmToWav(pcmData: bytes, sampleRate: int = 24000, channels: int = 1, sampleWidth: int = 2) -> bytes:
    """Gemini TTS는 raw PCM(16bit little-endian, mono, 24kHz)만 반환하므로
    브라우저 <audio> 재생을 위해 WAV 헤더를 씌운다."""
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(channels)
        wav.setsampwidth(sampleWidth)
        wav.setframerate(sampleRate)
        wav.writeframes(pcmData)
    return buffer.getvalue()


def _ttsPayload(text: str, voice: str) -> dict:
    # temperature 를 낮춰 요청마다 음색이 흔들리는 것을 줄인다.
    # (주의) 본문 앞에 지시문(페르소나 등)을 붙이지 말 것. 질문·예시가 든 문장과 합쳐지면
    # 이 TTS 모델이 낭독 대신 지시에 반응해 폭주(finishReason=OTHER, 장시간)한다.
    return {
        "contents": [{"parts": [{"text": text}]}],
        "generationConfig": {
            "temperature": 0.5,
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}
            },
        },
    }


async def gemini_tts(text: str, voice: str = DEFAULT_VOICE) -> bytes:
    """Gemini 3.1 Flash TTS 로 텍스트를 음성(WAV)으로 변환하는 함수.

    TTS_CHUNK_MAX_CHARS 를 넘는 텍스트는 문장 청크로 나눠 순차 생성 후 무음을 사이에
    두고 이어붙인다 (통짜 생성은 잘림·실패). 반환은 항상 단일 WAV."""

    def _call(text: str) -> bytes:
        # timeout 필수: 없으면 무한 대기다. 대화체·프리픽스 입력에서 이 TTS 모델이
        # 낭독 대신 지시로 반응해 폭주(finishReason=OTHER)하면 응답이 오래 걸리는데,
        # 타임아웃이 없으면 gunicorn 워커가 영구히 걸린다. (connect 10s, read 60s)
        # 429(rate limit)는 배치 생성(듣기 지문 라인 병렬 등)에서 일상적으로 발생하므로
        # Retry-After(없으면 지수 백오프)만큼 대기 후 재시도한다. 그 외 에러는 즉시 raise.
        for attempt in range(RATE_LIMIT_RETRIES + 1):
            response = requests.post(
                TTS_URL,
                params={"key": GEMINI_API_KEY},
                json=_ttsPayload(text, voice),
                timeout=(10, 60),
            )
            if response.status_code != 429 or attempt == RATE_LIMIT_RETRIES:
                break
            retryAfter = response.headers.get("Retry-After")
            try:
                delay = float(retryAfter) if retryAfter else 2.0 * (2**attempt)
            except ValueError:
                delay = 2.0 * (2**attempt)
            time.sleep(min(delay, RATE_LIMIT_MAX_WAIT))
        response.raise_for_status()
        data = response.json()

        # Gemini 는 HTTP 200 이어도 오디오를 안 줄 수 있다:
        #  - 입력이 필터에 걸리면 candidates 없이 promptFeedback.blockReason 만 옴
        #  - candidate 는 있어도 finishReason=SAFETY/OTHER 로 parts 가 비어 있음
        #    (질문·대화체 문장에서 낭독 대신 지시로 반응해 폭주하는 케이스)
        # 무방비 인덱싱은 KeyError('candidates') 로 원인을 가리므로, 어떤 텍스트가
        # 왜 실패했는지 드러내는 에러로 바꾼다.
        candidates = data.get("candidates")
        if not candidates:
            feedback = data.get("promptFeedback")
            raise RuntimeError(
                f"Gemini TTS 오디오 없음: candidates 비어 있음 "
                f"(voice={voice}, promptFeedback={feedback}, "
                f"응답키={list(data.keys())}, text={text!r})"
            )
        parts = candidates[0].get("content", {}).get("parts") or []
        inline = parts[0].get("inlineData") if parts else None
        if inline is None:
            finish = candidates[0].get("finishReason")
            raise RuntimeError(
                f"Gemini TTS 오디오 없음: inlineData 없음 "
                f"(voice={voice}, finishReason={finish}, text={text!r})"
            )
        return base64.b64decode(inline["data"])  # raw PCM

    chunks = splitForTts(text) if len(text) > TTS_CHUNK_MAX_CHARS else [text]
    silence = b"\x00" * (PCM_SAMPLE_WIDTH * int(PCM_SAMPLE_RATE * TTS_CHUNK_GAP_MS / 1000))
    # 청크는 병렬 생성 (순차는 긴 지문 하나에 30초~1분). gather 는 입력 순서대로
    # 결과를 돌려주므로 조립 순서는 보장된다. 순간 과요청은 429 재시도가 흡수.
    pcms = await asyncio.gather(*[asyncio.to_thread(_call, c) for c in chunks])
    return _pcmToWav(silence.join(pcms))


# 스트리밍용 공유 클라이언트 — 요청마다 AsyncClient를 만들면 googleapis TLS 핸드셰이크를
# 매번 다시 해 첫 오디오 청크가 100~300ms 늦어진다. keep-alive로 연결을 재사용한다.
# (지연 생성: import 시점에 만들면 이벤트 루프 없는 컨텍스트에서 문제될 수 있음)
_streamClient: httpx.AsyncClient | None = None


def _getStreamClient() -> httpx.AsyncClient:
    global _streamClient
    if _streamClient is None:
        _streamClient = httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0))
    return _streamClient


async def gemini_tts_stream(text: str, voice: str = DEFAULT_VOICE):
    """Gemini 3.1 Flash TTS 스트리밍 — raw PCM(24kHz·모노·16bit) 청크를 순차 yield.

    streamGenerateContent(SSE)를 열어 `data: {json}` 이벤트에서 inlineData.data(base64 PCM)만
    디코드해 흘려보낸다. 생성 즉시 흘려보내므로 프런트가 첫 청크부터 재생할 수 있다.
    """
    client = _getStreamClient()
    async with client.stream(
        "POST",
        STREAM_URL,
        params={"key": GEMINI_API_KEY, "alt": "sse"},
        json=_ttsPayload(text, voice),
    ) as response:
        response.raise_for_status()
        async for line in response.aiter_lines():
            if not line or not line.startswith("data:"):
                continue
            chunk = line[len("data:"):].strip()
            if not chunk or chunk == "[DONE]":
                continue
            try:
                data = json.loads(chunk)
                part = data["candidates"][0]["content"]["parts"][0]["inlineData"]
            except (KeyError, IndexError, ValueError):
                continue  # 오디오 없는 이벤트(메타/usage 등)는 건너뜀
            yield base64.b64decode(part["data"])
