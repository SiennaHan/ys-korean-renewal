from typing import Optional

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from business import study_session

from accepter.base import makeResponse
from accepter import auth

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


class StudySessionPingRequest(BaseModel):
    context: Optional[str] = None


@router.post("/ping", dependencies=[Depends(auth.JWTBearer())])
async def ping_study_session(req: StudySessionPingRequest, token: str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await study_session.ping(userId, req.context))
