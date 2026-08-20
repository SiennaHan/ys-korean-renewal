from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer

from accepter import auth
from accepter.base import AdminSignupRequest, LoginRequest, PasswordChangeRequest, makeResponse, makeError
from business import auth_business

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
