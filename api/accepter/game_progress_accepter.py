from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer
from business import game_progress

from accepter.base import GameProgressRequest, makeResponse
from accepter import auth

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


@router.post("", dependencies=[Depends(auth.JWTBearer())])
async def save_game_progress(req: GameProgressRequest, token: str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await game_progress.saveProgress(
        userId, req.gameName, req.stageId, req.score, req.extra, req.completed
    ))


@router.get("/{gameName}", dependencies=[Depends(auth.JWTBearer())])
async def list_game_progress(gameName: str, token: str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await game_progress.getProgress(userId, gameName))
