"""문의 — POST /inquiry

**토큰을 요구하지 않는다.** 이 길을 가장 필요로 하는 사람이 비밀번호를 잊어
로그인을 못 하는 사람이다. 인증을 걸면 잠긴 사람이 못 쓰는 문의처가 된다
(2026-08-27 — 실제로 401 이 나서 재설정 화면의 「문의하기」가 죽어 있었다).

토큰이 있으면 누구인지 기록하고, 없으면 `anonymous` 로 남긴다.
답장 주소는 어차피 본문에서 받는다 — 게스트도 계정 이메일이 없기 때문이다.

**열려 있으므로 남용될 수 있다.** 지금은 길이 제한(2000자)과 이메일 형식만 본다.
스팸이 실제로 오면 IP 단위 제한을 붙일 자리다 — BLOCKERS 를 봐라.
"""
from typing import Optional

from fastapi import APIRouter, Header

from accepter import auth
from accepter.base import InquiryRequest, makeResponse
from business import inquiry

router = APIRouter()


def _whoFrom(authorization: Optional[str]) -> str:
    """Bearer 토큰이 있으면 그 주인, 없으면 anonymous. **없어도 실패하지 않는다.**"""
    if not authorization or not authorization.lower().startswith("bearer "):
        return "anonymous"
    try:
        return auth.getUserIdFrom(authorization.split(" ", 1)[1]) or "anonymous"
    except Exception:
        # 만료됐거나 망가진 토큰. 문의를 막을 이유는 아니다
        return "anonymous"


@router.post("")
async def create_inquiry(
    body: InquiryRequest,
    authorization: Optional[str] = Header(None),
    # 앱이 안 보내는 값이라 요청 헤더에서 읽는다. 재현할 때 브라우저·기기를
    # 아는 것이 크게 도움이 된다 — 피드백 허브의 프롬프트에 그대로 들어간다
    user_agent: Optional[str] = Header(None),
):
    data, error = await inquiry.createInquiry(
        _whoFrom(authorization), body.replyEmail, body.topic, body.message,
        body.actual, body.expected,
        body.lang, body.fromPath, body.files, userAgent=(user_agent or ""),
    )
    if error:
        return makeResponse({"error": error})
    return makeResponse(data)
