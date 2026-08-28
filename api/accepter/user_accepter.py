from typing import Optional
from fastapi import APIRouter, Header, Depends, Request
from fastapi.security import OAuth2PasswordBearer

from accepter import auth
from accepter.base import (GuestSign, LoginRequest, MigrateRequest, SignupCodeVerifyRequest,
                           StudentSignupRequest, StudentSignupWithCodeRequest, makeResponse)
from business import signup_code_business, user_business

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


@router.post("/sign/code/verify")
async def verifySignupCode(body: SignupCodeVerifyRequest, request: Request):
    """학교 코드를 확인한다 — **무인증**. 학교 이름만 돌려준다.

    **GET 이 아니라 POST 다.** `start.sh` 의 gunicorn 이 access 로그에 request
    line 을 남기므로, 쿼리스트링으로 받으면 코드가 평문으로 디스크에 쌓인다.

    막혔을 때도 HTTP 200 이다. 429 를 내면 앱의 `handleResponse` 가 통째로
    throw 해서 이유가 「가입 실패」로 뭉개진다.
    """
    data, error = await signup_code_business.verifyCode(
        body.code, signup_code_business.clientIpHash(request))
    if error:
        return makeResponse({"error": error})
    return makeResponse(data)


@router.post("/sign/up/code")
async def signUpStudentWithCode(body: StudentSignupWithCodeRequest, request: Request):
    """기관 발급 코드로 가입 — 그 코드가 가리키는 학교의 학생이 된다.

    `/sign/up` 과 **다른 길이다.** 저쪽은 `school_code` 를 비우는 것이 계약이다.
    """
    data, error = await user_business.signUpStudentWithCode(
        body.code, body.email, body.password, body.name, body.guestId,
        signup_code_business.clientIpHash(request))
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
