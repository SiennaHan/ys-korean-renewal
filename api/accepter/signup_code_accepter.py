"""기관 발급 코드 — 어드민 라우트.

**이 파일은 아무것도 판단하지 않는다.** 토큰에서 `sub` 만 꺼내 business 에 넘긴다.
역할·학교·한도는 전부 `business/signup_code_business.py` 가 정한다 —
`AdminRequired` 만으로는 부족하기 때문이다(`student_admin` 도 통과한다).

**거절을 `HTTPException(403)` 으로 내지 않는다.** 어드민 앱은 401·403 을 받으면
토큰을 지우고 로그인 화면으로 보낸다(`admin/src/api/api.ts`). 「권한이 없습니다」가
로그아웃이 되면 안 된다. `makeError` 는 HTTP 200 에 `result:false` 를 실어 낸다 —
`accepter/entitlement_guard.py` 가 402 를 고른 것과 같은 이유다.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.security import OAuth2PasswordBearer

from accepter import auth
from accepter.base import (SignupCodeCreateRequest, SignupCodeUpdateRequest,
                           makeError, makeResponse)
from business import signup_code_business

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


@router.get("/list", dependencies=[Depends(auth.AdminRequired())])
async def listSignupCodes(
    school_code: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    token: str = Depends(oauth2_scheme),
):
    """학교 관리자는 `school_code` 쿼리를 보내도 자기 학교로 덮인다(business 가 한다)."""
    data, error = await signup_code_business.listCodes(
        auth.getUserIdFrom(token), school_code, status, search)
    if error:
        return makeError(error)
    return makeResponse(data)


@router.post("", dependencies=[Depends(auth.AdminRequired())])
async def createSignupCode(body: SignupCodeCreateRequest, token: str = Depends(oauth2_scheme)):
    data, error = await signup_code_business.issueFromRequest(auth.getUserIdFrom(token), body)
    if error:
        return makeError(error)
    return makeResponse(data)


@router.get("/{codeId}/uses", dependencies=[Depends(auth.AdminRequired())])
async def listSignupCodeUses(codeId: int, token: str = Depends(oauth2_scheme)):
    data, error = await signup_code_business.listUses(auth.getUserIdFrom(token), codeId)
    if error:
        return makeError(error)
    return makeResponse(data)


@router.patch("/{codeId}", dependencies=[Depends(auth.AdminRequired())])
async def updateSignupCode(codeId: int, body: SignupCodeUpdateRequest,
                           token: str = Depends(oauth2_scheme)):
    data, error = await signup_code_business.updateFromRequest(
        auth.getUserIdFrom(token), codeId, body)
    if error:
        return makeError(error)
    return makeResponse(data)


@router.delete("/{codeId}", dependencies=[Depends(auth.AdminRequired())])
async def revokeSignupCode(codeId: int, token: str = Depends(oauth2_scheme)):
    """**행을 지우지 않는다** — `status='revoked'` 로 둔다. 사용 이력이 이 행을 가리킨다."""
    data, error = await signup_code_business.revokeCode(auth.getUserIdFrom(token), codeId)
    if error:
        return makeError(error)
    return makeResponse(data)
