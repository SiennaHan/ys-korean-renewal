from typing import Optional
from fastapi import APIRouter, Header, Depends
from fastapi.security import OAuth2PasswordBearer

from accepter import auth
from accepter.base import GuestSign, LoginRequest, MigrateRequest, makeResponse
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
