from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer

from accepter import auth
from accepter.base import AdminSignupRequest, LoginRequest, PasswordChangeRequest, WithdrawRequest, makeResponse, makeError
from business import auth_business, user_withdraw

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


@router.post("/signup")
async def signup(body: AdminSignupRequest):
    data, error = await auth_business.signup(body.email, body.password, body.name)
    if error:
        return makeError(error)
    return makeResponse(data)


@router.post("/login")
async def login(body: LoginRequest):
    data, error = await auth_business.login(body.email, body.password)
    if error:
        return makeError(error)
    return makeResponse(data)


@router.patch("/password", dependencies=[Depends(auth.JWTBearer())])
async def changePassword(body: PasswordChangeRequest, token: str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    data, error = await auth_business.changePassword(userId, body.current_password, body.new_password)
    if error:
        return makeError(error)
    return makeResponse(data)


@router.post("/withdraw", dependencies=[Depends(auth.JWTBearer())])
async def withdraw(body: WithdrawRequest, token: str = Depends(oauth2_scheme)):
    """회원 탈퇴 — 계정과 그 계정이 만든 것을 지운다.

    지우는 범위는 `shared/withdrawal_scope.py` 가 정한다. 되돌릴 수 없으므로
    비밀번호를 다시 받는다(`WithdrawRequest`).

    **DELETE 가 아니라 POST 다.** 몸을 실은 DELETE 는 중간 프록시가 몸을
    버리는 경우가 있고, 앱의 `api.delete` 도 몸을 안 받는다.
    """
    userId = auth.getUserIdFrom(token)
    data, error = await user_withdraw.withdrawAccount(userId, body.password)
    if error:
        return makeError(error)
    return makeResponse(data)
