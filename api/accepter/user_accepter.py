from typing import Optional
from fastapi import APIRouter, Header, Depends
from fastapi.security import OAuth2PasswordBearer

from accepter import auth
from accepter.base import GuestSign, LoginRequest, MigrateRequest, StudentSignupRequest, makeResponse
from business import user_business

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


@router.post("/sign/guest")
async def signAsGuest(body:GuestSign, authorization: Optional[str] = Header(None)):
    hasGuestId = body.guestId == None or body.guestId == 'undefined'
    guestId = auth.createGuestId() if hasGuestId else body.guestId

    if not authorization or not authorization.startswith("Bearer "):
        return makeResponse({"status": "new", "token": createGuestToken(guestId), "guestId": guestId})

    token = authorization.replace("Bearer ", "")
    if not auth.decode_jwt(token) :
        return makeResponse({"status": "new", "token": createGuestToken(guestId), "guestId": guestId})

    return makeResponse({"status": "exist", "token": token, "guestId": guestId})


@router.post("/sign/up")
async def signUpStudent(body: StudentSignupRequest):
    """학생 자체 회원가입 — access_and_pricing_v1 §05 · §09 의 4단계.

    관리자용 `/auth/signup` 과 **다른 길이다.** 저쪽은 school_admin 을
    승인 대기로 만든다 — 개인 가입자가 그리로 가면 아무것도 못 한다.
    """
    data, error = await user_business.signUpStudent(
        body.email, body.password, body.name, body.guestId
    )
    if error:
        return makeResponse({"error": error})
    return makeResponse(data)


@router.post("/sign/login")
async def loginAsStudent(body: LoginRequest):
    data, error = await user_business.loginAsStudent(body.email, body.password)
    if error:
        return makeResponse({"error": error})
    return makeResponse(data)


@router.post("/sign/migrate", dependencies=[Depends(auth.JWTBearer())])
async def migrateGuestData(body: MigrateRequest, token: str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    data = await user_business.migrateGuestData(userId, body.guestId)
    return makeResponse(data)


def createGuestToken(guestId: str):
    newToken = auth.signAsGuestId(guestId)
    return newToken
