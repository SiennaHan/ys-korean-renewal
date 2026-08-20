"""Tutorus Research 한국어 발음평가(korpron)와 비원어민 STT(korstt) 연동.

[임시 도입 검증용 — 제거 방법]
  1. .env 의 TUTORUS_* 설정 삭제 → 각 기능이 자동으로 비활성화됨
  2. 완전 제거: xternal/tutorus.py, business/tutorus_pron.py,
     accepter/tutorus_accepter.py, TUTORUS_INTEGRATION.md 삭제 후
     server.py 의 [TUTORUS] BEGIN~END 블록 삭제
  다른 파일에 침습적인 변경은 없다. requirements.txt 추가 의존성도 없다.

인증은 Keycloak client_credentials 로 발급받은 JWT(수명 300초)를 Bearer 로 전달한다.
토큰은 만료 30초 전까지 프로세스 내에서 재사용한다.
"""

import asyncio
import base64
import io
import json
import os
import shutil
import subprocess
import threading
import time
import wave

import requests
from dotenv import load_dotenv

load_dotenv(override=True)

CLIENT_ID = os.getenv("TUTORUS_CLIENT_ID")
CLIENT_SECRET = os.getenv("TUTORUS_CLIENT_SECRET")
TOKEN_URL = os.getenv("TUTORUS_TOKEN_URL")
KORPRON_URL = os.getenv("TUTORUS_KORPRON_URL")
KORSTT_WS_URL = os.getenv("TUTORUS_KORSTT_WS_URL")

# 두 API는 공통 인증 정보를 사용하지만 독립적으로 활성화할 수 있다.
PRONUNCIATION_ENABLED = bool(
    CLIENT_ID and CLIENT_SECRET and TOKEN_URL and KORPRON_URL
)
STT_ENABLED = bool(CLIENT_ID and CLIENT_SECRET and TOKEN_URL and KORSTT_WS_URL)
# 기존 외부 참조와의 호환성을 위한 전체 활성 상태.
ENABLED = PRONUNCIATION_ENABLED or STT_ENABLED

TARGET_RATE = 16000  # korpron 요구 사양: 16kHz / 16bit / mono PCM
MAX_REFERENCE_WORDS = 100  # 규격서 §6
STT_MODEL = "nonnative-korstt"
_CHUNK_BYTES = 16000  # korstt 서버 처리 단위와 같은 500ms

_TOKEN_TIMEOUT_SEC = 10
_KORPRON_TIMEOUT_SEC = 60
_STT_RECV_TIMEOUT_SEC = 30
_STT_TOTAL_TIMEOUT_SEC = 120

_token: str | None = None
_token_expire_at: float = 0.0
_token_lock = threading.Lock()


class TutorusError(Exception):
    """발음평가 처리 실패. message 는 클라이언트에 그대로 노출해도 되는 수준으로 유지한다."""

    def __init__(self, message: str, code: int = 502):
        super().__init__(message)
        self.message = message
        self.code = code


# --------------------------------------------------------------------------
# 인증
# --------------------------------------------------------------------------

def _authenticate() -> str:
    """access_token 발급. 유효한 캐시가 있으면 재사용(만료 30초 전까지)."""
    global _token, _token_expire_at

    with _token_lock:
        now = time.time()
        if _token and now < _token_expire_at - 30:
            return _token

        resp = requests.post(
            TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            },
            timeout=_TOKEN_TIMEOUT_SEC,
        )
        if resp.status_code != 200:
            raise TutorusError(
                f"토큰 발급 실패({resp.status_code}): {resp.text[:200]}", 502
            )

        body = resp.json()
        _token = body["access_token"]
        # expires_in 은 초 단위(보통 300). 값이 없으면 보수적으로 60초만 캐시.
        _token_expire_at = now + float(body.get("expires_in", 60))
        return _token


# --------------------------------------------------------------------------
# 오디오 변환 (프런트는 webm/opus 로 녹음하므로 wav 16k mono 로 맞춰야 한다)
# --------------------------------------------------------------------------

def _resample_wav_to_16k_mono(audio_bytes: bytes) -> bytes:
    """이미 RIFF WAV 인 경우 numpy 로만 mono/16kHz/16bit 로 정규화한다.
    numpy 는 requirements.txt 에 이미 있으므로 추가 의존성이 없다."""
    import numpy as np

    with wave.open(io.BytesIO(audio_bytes), "rb") as w:
        channels = w.getnchannels()
        width = w.getsampwidth()
        rate = w.getframerate()
        frames = w.readframes(w.getnframes())

    if width != 2:
        # 8/24/32bit WAV 는 드물다. ffmpeg 로 넘긴다.
        raise ValueError(f"unsupported sample width: {width}")

    samples = np.frombuffer(frames, dtype="<i2")
    if channels > 1:
        samples = samples.reshape(-1, channels).mean(axis=1)

    if rate != TARGET_RATE and len(samples) > 1:
        # 선형보간 리샘플. 발음평가 입력으로는 충분한 품질.
        target_len = int(len(samples) * TARGET_RATE / rate)
        samples = np.interp(
            np.linspace(0, len(samples) - 1, target_len),
            np.arange(len(samples)),
            samples.astype("float64"),
        )

    pcm = np.clip(np.asarray(samples), -32768, 32767).astype("<i2").tobytes()

    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(TARGET_RATE)
        w.writeframes(pcm)
    return out.getvalue()


def _ffmpeg_to_16k_mono(audio_bytes: bytes) -> bytes:
    """webm/opus, mp4, ogg 등은 ffmpeg 로 변환한다."""
    if not shutil.which("ffmpeg"):
        raise TutorusError(
            "ffmpeg 가 필요합니다 (webm/opus 녹음 변환용). "
            "ubuntu: sudo apt install -y ffmpeg / mac: brew install ffmpeg",
            500,
        )

    proc = subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error",
            "-i", "pipe:0",
            "-ac", "1", "-ar", str(TARGET_RATE),
            "-acodec", "pcm_s16le", "-f", "wav",
            "pipe:1",
        ],
        input=audio_bytes,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=30,
    )
    if proc.returncode != 0 or not proc.stdout:
        detail = proc.stderr.decode("utf-8", "ignore")[:200]
        raise TutorusError(f"오디오 변환 실패: {detail}", 400)
    return proc.stdout


def to_wav_16k_mono(audio_bytes: bytes) -> bytes:
    """어떤 포맷이 들어와도 korpron 이 받는 WAV(16kHz/16bit/mono)로 만든다."""
    if not audio_bytes:
        raise TutorusError("오디오 데이터가 비어 있습니다.", 400)

    if audio_bytes[:4] == b"RIFF":
        try:
            return _resample_wav_to_16k_mono(audio_bytes)
        except TutorusError:
            raise
        except Exception:
            # 헤더가 이상한 WAV 는 ffmpeg 에 맡긴다.
            pass

    return _ffmpeg_to_16k_mono(audio_bytes)


def _to_pcm16k(audio_bytes: bytes) -> bytes:
    """브라우저 녹음을 korstt용 raw PCM(16kHz·mono·16bit LE)으로 변환한다."""
    if not audio_bytes:
        raise TutorusError("오디오 데이터가 비어 있습니다.", 400)
    if not shutil.which("ffmpeg"):
        raise TutorusError("ffmpeg가 필요합니다.", 500)

    proc = subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error",
            "-i", "pipe:0",
            "-ac", "1", "-ar", str(TARGET_RATE),
            "-f", "s16le", "-acodec", "pcm_s16le",
            "pipe:1",
        ],
        input=audio_bytes,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=30,
    )
    if proc.returncode != 0 or not proc.stdout:
        detail = proc.stderr.decode("utf-8", "ignore")[:150]
        raise TutorusError(f"오디오 변환 실패: {detail}", 400)
    return proc.stdout


# --------------------------------------------------------------------------
# 발음평가 호출
# --------------------------------------------------------------------------

def _evaluate_blocking(reference: str, wav_bytes: bytes) -> dict:
    import base64

    token = _authenticate()
    body = {
        "argument": {
            "reference": reference,
            "audio": base64.b64encode(wav_bytes).decode("utf-8"),
        }
    }

    resp = requests.post(
        KORPRON_URL,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json=body,
        timeout=_KORPRON_TIMEOUT_SEC,
    )

    if resp.status_code == 401:
        raise TutorusError("발음평가 인증 실패(토큰 무효/만료).", 502)
    if resp.status_code != 200:
        raise TutorusError(
            f"발음평가 요청 실패({resp.status_code}): {resp.text[:200]}", 502
        )

    try:
        result = resp.json()
    except Exception:
        raise TutorusError("발음평가 응답 파싱 실패.", 502)

    # 규격서 §4.4: 인증 실패(401)를 제외한 모든 오류가 HTTP 200 으로 온다.
    # 반드시 본문의 error_code / error 키로 실패를 판별해야 한다.
    if "error_code" in result:
        code = str(result.get("error_code"))
        message = result.get("message", "")
        if code == "201":
            raise TutorusError("발화가 감지되지 않았습니다(무음/잡음).", 422)
        if code == "202":
            raise TutorusError("평가 기준 문장이 비어 있습니다.", 400)
        if message == "TOO_MANY_WORDS":
            raise TutorusError(
                f"문장이 너무 깁니다(최대 {MAX_REFERENCE_WORDS}단어).", 400
            )
        raise TutorusError(f"발음평가 실패({code}): {message}", 502)
    if "error" in result:
        raise TutorusError(f"발음평가 실패: {str(result['error'])[:200]}", 502)

    if "sentenceLevel" not in result:
        raise TutorusError("발음평가 응답 형식이 예상과 다릅니다.", 502)

    return result


async def evaluate(reference: str, audio_bytes: bytes) -> dict:
    """발음평가 원본 응답(sentenceLevel / wordLevel / phoneLevel)을 반환."""
    if not PRONUNCIATION_ENABLED:
        raise TutorusError("발음평가 기능이 설정되지 않았습니다.", 503)

    reference = (reference or "").strip()
    if not reference:
        raise TutorusError("평가 기준 문장이 비어 있습니다.", 400)
    if len(reference.split()) > MAX_REFERENCE_WORDS:
        raise TutorusError(
            f"문장이 너무 깁니다(최대 {MAX_REFERENCE_WORDS}단어).", 400
        )

    wav_bytes = await asyncio.to_thread(to_wav_16k_mono, audio_bytes)
    return await asyncio.to_thread(_evaluate_blocking, reference, wav_bytes)


# --------------------------------------------------------------------------
# 비원어민 STT 호출
# --------------------------------------------------------------------------

async def _stream_stt(pcm: bytes, token: str) -> str:
    import websockets

    headers = {"Authorization": f"Bearer {token}"}
    segments: list[str] = []

    async with websockets.connect(
        KORSTT_WS_URL,
        additional_headers=headers,
        open_timeout=15,
    ) as ws:
        for i in range(0, len(pcm), _CHUNK_BYTES):
            chunk = pcm[i : i + _CHUNK_BYTES]
            await ws.send(base64.b64encode(chunk).decode("utf-8"))

        await ws.send(b"%f0000")

        while True:
            raw = await asyncio.wait_for(
                ws.recv(),
                timeout=_STT_RECV_TIMEOUT_SEC,
            )
            if isinstance(raw, bytes):
                raw = raw.decode("utf-8")
            message_data = json.loads(raw)

            message = message_data.get("message", "")
            if message.startswith("unauthorized"):
                raise TutorusError(message[:150], 502)

            result = message_data.get("result")
            if result:
                segments.append(result)

            if message == "server send final flag":
                break

        await ws.close(1000)

    return " ".join(segments).strip()


async def transcribe(audio_bytes: bytes) -> str:
    """녹음 오디오를 비원어민 STT로 전사한다."""
    if not STT_ENABLED:
        raise TutorusError("비원어민 STT 기능이 설정되지 않았습니다.", 503)

    token = await asyncio.to_thread(_authenticate)
    pcm = await asyncio.to_thread(_to_pcm16k, audio_bytes)
    return await asyncio.wait_for(
        _stream_stt(pcm, token),
        timeout=_STT_TOTAL_TIMEOUT_SEC,
    )
