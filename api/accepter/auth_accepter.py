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
    """회원 탈퇴 — 이름·이메일을 가리고 계정을 잠근다. **지우지는 않는다.**

    무엇이 남고 무엇이 가려지는지는 `shared/withdrawal_scope.py` 가 정한다.
    되돌릴 수 없으므로 비밀번호를 다시 받는다(`WithdrawRequest`).

    **2026-08-29 에 하는 일이 바뀌었다** — 전에는 전부 지웠다(§13). 앱의 탈퇴
    화면도 같은 판에 고쳤다. 정말 지우는 길은 `user_withdraw.purgeAccount` 이고
    **부르는 곳이 아직 없다**(삭제권 행사는 문의로 받아 사람이 처리한다).

    **DELETE 가 아니라 POST 다.** 몸을 실은 DELETE 는 중간 프록시가 몸을
    버리는 경우가 있고, 앱의 `api.delete` 도 몸을 안 받는다.
    """
    userId = auth.getUserIdFrom(token)
    data, error = await user_withdraw.withdrawAccount(userId, body.password)
    if error:
        return makeError(error)
    return makeResponse(data)
