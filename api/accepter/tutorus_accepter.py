"""발음평가 API 라우터 (Tutorus korpron).

[임시 도입 검증용] 제거 방법은 xternal/tutorus.py 상단 주석 참고.
요청 모델을 accepter/base.py 가 아니라 이 파일 안에 두어, 제거 시 공용 파일을
건드리지 않게 했다.
"""

import shutil

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

from accepter import auth
from accepter.base import makeResponse, makeError
from business import tutorus_pron
from xternal import tutorus

router = APIRouter()

# stt/convert 와 동일하게 인증은 선택. 토큰이 있으면 로그용 user_id 만 확보한다.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


class PronunciationRequest(BaseModel):
    reference: str          # 정답 문장 (공백 기준 100단어 이내)
    base64sound: str        # 녹음 파일 base64 (webm/opus, wav, mp4 모두 허용)
    includeRaw: bool = False  # 원본 응답 포함 여부 (검증 기간 디버깅용)


@router.post("/pronunciation")
async def pronunciation(
    req: PronunciationRequest,
    token: str = Depends(oauth2_scheme),
):
    user_id = None
    if token:
        try:
            user_id = auth.getUserIdFrom(token)
        except Exception:
            user_id = None

    try:
        result = await tutorus_pron.evaluatePronunciation(
            req.reference, req.base64sound, req.includeRaw
        )
    except tutorus.TutorusError as e:
        print(f"[tutorus] 발음평가 실패 (user={user_id}): {e.message}")
        return makeError(e.message, e.code)
    except Exception as e:
        print(f"[tutorus] 발음평가 예외 (user={user_id}): {e}")
        return makeError("발음평가에 실패했습니다.", 500)

    return makeResponse(result)


@router.post("/pronunciation/shadow/{shadow_id}")
async def pronunciation_shadow(
    shadow_id: int,
    token: str = Depends(auth.MasterAdminRequired()),
):
    """STT 비교 화면에서 해당 행의 학생 음성을 온디맨드로 발음평가한다.
    결과는 저장하지 않는다(누를 때마다 계산)."""
    try:
        result = await tutorus_pron.evaluateShadow(shadow_id)
    except tutorus.TutorusError as e:
        print(f"[tutorus] shadow 발음평가 실패 (id={shadow_id}): {e.message}")
        return makeError(e.message, e.code)
    except Exception as e:
        print(f"[tutorus] shadow 발음평가 예외 (id={shadow_id}): {e}")
        return makeError("발음평가에 실패했습니다.", 500)

    return makeResponse(result)


@router.get("/health")
async def health():
    """설정/연결 상태 확인용. 검증 기간에만 쓰고 제거 시 같이 사라진다."""
    status = {
        "enabled": tutorus.PRONUNCIATION_ENABLED,
        "ffmpeg": bool(shutil.which("ffmpeg")),
        "tokenOk": False,
        "detail": None,
    }
    if tutorus.PRONUNCIATION_ENABLED:
        try:
            tutorus._authenticate()
            status["tokenOk"] = True
        except Exception as e:
            status["detail"] = str(e)[:200]
    return makeResponse(status)
