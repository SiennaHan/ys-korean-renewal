import time, jwt, os, base64
from typing import Dict, List, Optional
from dotenv import load_dotenv
import uuid

from fastapi import Request, HTTPException
from fastapi.openapi.models import OAuthFlows as OAuthFlowsModel
from fastapi.security import OAuth2
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.security.utils import get_authorization_scheme_param

load_dotenv(override=True)

JWT_SECRET = os.environ.get('JWT_SECRET')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM')

def createGuestId(): 
    guestId = "guest-" + str(uuid.uuid4())
    return guestId

def makeSuccess(data: any) :
    return {"valid": True, "data": data}

def makeFailure(data: any) :
    return {"valid": False, "data": data}

def signAsGuestId(guestId: str) :
    return signJwt(None, guestId, ["guest"])

def signJwt(userId: str, guestId: str, roles: List[str]) -> Dict[str, str]:
    sub = guestId if not guestId is None else userId
    payload = {
        "sub": sub,
        "roles": roles,
        "iat": time.time(),
        "exp": time.time() + ((60 * 60 * 24) * 30) # (60sec * 60min * 24hour) * 30 day , unit: sec
    }
    SECRET = base64.b64decode(JWT_SECRET)
    token = jwt.encode(payload, SECRET, algorithm=JWT_ALGORITHM)

    return token

def decode_jwt(token: str) -> dict:
    try:
        SECRET = base64.b64decode(JWT_SECRET)
        decoded_token = jwt.decode(token, SECRET, algorithms=[JWT_ALGORITHM])
        return decoded_token if decoded_token["exp"] >= time.time() else None
    except Exception as e:
        # print('jwt error =>', e)
        return None

def getUserIdFrom(token: str) -> str:
    decoded_token = decode_jwt(token)
    userId = decoded_token["sub"]
    return userId

def getRolesFrom(token: str) -> List[str]:
    decoded_token = decode_jwt(token)
    return decoded_token.get("roles", [])

def getEmailFrom(token: str) -> str:
    decoded_token = decode_jwt(token)
    return decoded_token.get("email", "")

def getSchoolCodeFrom(token: str) -> str:
    decoded_token = decode_jwt(token)
    return decoded_token.get("school_code")

def signAdminJwt(userId: int, email: str, roles: List[str], schoolCode: str = None) -> str:
    payload = {
        "sub": str(userId),
        "email": email,
        "roles": roles,
        "school_code": schoolCode,
        "iat": time.time(),
        "exp": time.time() + ((60 * 60 * 24) * 30)
    }
    SECRET = base64.b64decode(JWT_SECRET)
    return jwt.encode(payload, SECRET, algorithm=JWT_ALGORITHM)

def isWithdrawn(token: str) -> bool:
    """이 토큰의 주인이 탈퇴한 계정인가.

    **토큰만 봐서는 알 수 없어서 DB 를 읽는다.** JWT 는 30일이고 무효화 장치가
    없다. 탈퇴할 때 `is_active` 를 내리면 **다시 로그인하는 것만** 막힐 뿐,
    이미 켜 둔 앱은 최대 30일을 더 쓴다 — `access_ended_at` 을 만들 때 적어 둔
    것과 같은 구멍이다(BLOCKERS §11). 탈퇴는 되돌릴 수 없으므로 그 30일을
    열어 둘 수 없다.

    **게스트는 읽지 않는다.** `sub` 가 숫자가 아니면 계정이 아니다
    (`signAsGuestId` 가 `guest-<uuid>` 를 넣는다). 로그인 없이 도는 요청에
    질의를 더하지 않으려는 것이다.

    **판정에 실패하면 통과시킨다.** 여기서 막으면 DB 가 흔들릴 때 로그인한
    사람 전부가 튕긴다 — 탈퇴 계정이 잠깐 더 도는 쪽이 덜 나쁘다.
    `entitlement_guard` 는 반대로 실패하면 막는데, 그쪽은 유료 콘텐츠라
    새는 것이 더 나쁘기 때문이다.
    """
    try:
        payload = decode_jwt(token)
        sub = (payload or {}).get("sub")
        if not sub or not str(sub).isdigit():
            return False
        # **여기서 부른다** — 모듈 맨 위에서 하면 persistence 가 auth 를 쓰게
        # 될 때 순환 import 가 된다. 이 파일은 지금 DB 를 하나도 모른다
        from persistence import model
        from persistence.database import sessionScope
        with sessionScope() as db:
            row = (db.query(model.KoUser.withdrawn_at)
                     .filter(model.KoUser.id == int(sub)).first())
        return bool(row and row[0])
    except Exception as e:
        print(f"[auth] 탈퇴 여부 판정 실패 — {e!r}")
        return False


class JWTBearer(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTBearer, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request):
        credentials: HTTPAuthorizationCredentials = await super(JWTBearer, self).__call__(request)
        # print('JWTBearer > __call__ =>', credentials)
        if credentials:
            if not credentials.scheme == "Bearer":
                raise HTTPException(status_code=403, detail="Invalid authentication scheme.")
            if not self.verify_jwt(credentials.credentials):
                raise HTTPException(status_code=403, detail="Invalid token or expired token.")
            # **탈퇴한 계정의 살아 있는 토큰을 여기서 끊는다.** 보호 라우트 전부가
            # 이 관문을 지나므로 한 곳이면 된다. 403 인 이유는 앱이 401·403 에서
            # 세션을 지우기 때문이다(`app/src/api/api.ts`) — 탈퇴한 사람은
            # 로그아웃되는 것이 맞다. 402 를 쓰는 `entitlement_guard` 와 반대다
            if isWithdrawn(credentials.credentials):
                raise HTTPException(status_code=403, detail="Withdrawn account.")
            return credentials.credentials
        else:
            raise HTTPException(status_code=403, detail="Invalid authorization code.")

    def verify_jwt(self, jwtoken: str) -> bool:
        isTokenValid: bool = False
        try:
            payload = decode_jwt(jwtoken)
            # print('JWTBearer > verify_jwt =>', payload)
        except:
            payload = None
        if payload:
            isTokenValid = True

        return isTokenValid


class AdminRequired(JWTBearer):
    """Requires master_admin, school_admin, or student_admin role"""
    async def __call__(self, request: Request):
        token = await super().__call__(request)
        roles = getRolesFrom(token)
        if "master_admin" not in roles and "school_admin" not in roles and "student_admin" not in roles:
            raise HTTPException(status_code=403, detail="Admin access required.")
        return token


class MasterAdminRequired(JWTBearer):
    """Requires master_admin role"""
    async def __call__(self, request: Request):
        token = await super().__call__(request)
        roles = getRolesFrom(token)
        if "master_admin" not in roles:
            raise HTTPException(status_code=403, detail="Master admin access required.")
        return token
