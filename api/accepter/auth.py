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
