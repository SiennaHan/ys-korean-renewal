"""열린 범위 — GET /entitlement (access_and_pricing_v1 §04)

이 응답 하나가 앱의 모든 잠금을 결정한다. 게스트 토큰도 받는다.

**앱이 "샀다" 고 말하는 것을 믿지 않는다.** 판정은 서버 조회로만 한다 —
나중에 결제가 붙으면 `POST /purchase/webhook` 이 `ko_entitlement` 를 채우고
이 조회가 그것을 읽는다(§05).
"""
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer

from accepter import auth
from accepter.base import makeResponse
from business import entitlement

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


@router.get("", dependencies=[Depends(auth.JWTBearer())])
async def get_entitlement(token: str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    roles = auth.getRolesFrom(token)
    return makeResponse(await entitlement.getEntitlement(userId, roles))
