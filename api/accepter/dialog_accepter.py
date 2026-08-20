from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer
from business import dialog

from accepter.base import TtsVoiceGender, makeResponse
from accepter import auth

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.get("/{dialogId}/firstmsg/audio", dependencies=[Depends(auth.JWTBearer())])
async def get_firstmsg_audio(dialogId: str, voice: TtsVoiceGender = TtsVoiceGender.female):
    return makeResponse(await dialog.getFirstMsgAudioUrl(dialogId, voice))

@router.post("/{dialogId}/reset", dependencies=[Depends(auth.JWTBearer())])
async def resetDialog(dialogId: str, token:str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await dialog.resetDialog(dialogId, userId))

@router.post("/{dialogId}/completed/{chatId}", dependencies=[Depends(auth.JWTBearer())])
async def complete_dialog(dialogId: str, chatId: int, token:str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await dialog.completDialog(dialogId, chatId, userId))

@router.get("/{dialogId}/report", dependencies=[Depends(auth.JWTBearer())])
async def get_report(dialogId: str, lang: str = "Korean", token:str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await dialog.getReport(dialogId, userId, lang))

@router.get("/mission/book/{bookId}", dependencies=[Depends(auth.JWTBearer())])
async def get_report(bookId: str, token:str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await dialog.listMission(bookId, userId))