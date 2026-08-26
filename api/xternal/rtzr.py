import asyncio
import json
import os
import time

import requests
from dotenv import load_dotenv

load_dotenv(override=True)

RTZR_CLIENT_ID = os.getenv("RTZR_CLIENT_ID")
RTZR_CLIENT_SECRET = os.getenv("RTZR_CLIENT_SECRET")

def _creds() -> tuple[str, str]:
    """요청 시점에 자격증명을 요구한다.

    전에는 모듈 최상위에서 바로 raise 했다. business/stt.py 가 이 모듈을
    import 하므로 **두 값이 없으면 서버 자체가 안 떴다** — 학습 흐름은
    리턴제로 STT 가 필요 없는데도 그랬다.
    """
    if not RTZR_CLIENT_ID or not RTZR_CLIENT_SECRET:
        raise RuntimeError(
            "RTZR_CLIENT_ID and RTZR_CLIENT_SECRET environment variables required"
        )
    return RTZR_CLIENT_ID, RTZR_CLIENT_SECRET

BASE_URL = "https://openapi.vito.ai"
# sommers: 리턴제로 최신 범용 한국어 모델
STT_MODEL = "sommers"

# 전사 결과 폴링 설정 (배치 API는 비동기 → 완료까지 폴링)
_POLL_INTERVAL_SEC = 1.0
_POLL_TIMEOUT_SEC = 60.0

# access_token 캐시 (authenticate 응답의 expire_at = 만료 unix ts). 만료 60초 전이면 재발급.
_token: str | None = None
_token_expire_at: float = 0.0


def _authenticate() -> str:
    """client_id/secret 으로 access_token 발급. 유효한 캐시가 있으면 재사용."""
    global _token, _token_expire_at
    now = time.time()
    if _token and now < _token_expire_at - 60:
        return _token

    resp = requests.post(
        f"{BASE_URL}/v1/authenticate",
        data=dict(zip(("client_id", "client_secret"), _creds())),
        timeout=10,
    )
    resp.raise_for_status()
    body = resp.json()
    _token = body["access_token"]
    _token_expire_at = float(body.get("expire_at", now + 3600))
    return _token


def _transcribe_blocking(audio_bytes: bytes, filename: str) -> str:
    """동기 전사 흐름(발급→전사요청→폴링). asyncio.to_thread 로 오프로드해서 사용."""
    token = _authenticate()
    headers = {"Authorization": f"Bearer {token}"}
    config = {"model_name": STT_MODEL, "language": "ko"}

    resp = requests.post(
        f"{BASE_URL}/v1/transcribe",
        headers=headers,
        data={"config": json.dumps(config)},
        files={"file": (filename, audio_bytes)},
        timeout=15,
    )
    resp.raise_for_status()
    transcribe_id = resp.json()["id"]

    deadline = time.time() + _POLL_TIMEOUT_SEC
    while True:
        poll = requests.get(
            f"{BASE_URL}/v1/transcribe/{transcribe_id}",
            headers=headers,
            timeout=10,
        )
        poll.raise_for_status()
        body = poll.json()
        status = body.get("status")
        if status == "completed":
            utterances = body.get("results", {}).get("utterances", [])
            return " ".join(u.get("msg", "") for u in utterances).strip()
        if status == "failed":
            raise RuntimeError(f"rtzr transcribe failed: {body}")
        if time.time() > deadline:
            raise TimeoutError(f"rtzr transcribe timeout (id={transcribe_id})")
        time.sleep(_POLL_INTERVAL_SEC)


async def transcribe(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """리턴제로(VITO) 음성 전사. STT shadow 비교용. 동기 흐름을 스레드로 오프로드."""
    return await asyncio.to_thread(_transcribe_blocking, audio_bytes, filename)
