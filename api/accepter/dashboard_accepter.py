from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer
from business import dashboard

from accepter.base import makeResponse
from accepter import auth

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


@router.get("", dependencies=[Depends(auth.JWTBearer())])
async def get_dashboard(token: str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await dashboard.getDashboard(userId))
