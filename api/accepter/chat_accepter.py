from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from business import chat

from accepter.base import ChatItem, TranslateReq, makeResponse
from accepter import auth
from xternal import openai

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.post("/check/mission", dependencies=[Depends(auth.JWTBearer())])
async def post_check_mission(body: ChatItem, token:str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await chat.post_check_mission(body.dialogId, body.chatId, userId, body.msg, body.lang))

@router.post("/json", dependencies=[Depends(auth.JWTBearer())])
async def post_chat_json(body: ChatItem, token:str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await chat.post_chat_json(body.dialogId, body.chatId, userId, body.msg))

@router.post("/stream/json", dependencies=[Depends(auth.JWTBearer())])
async def post_chat_stream_json(body: ChatItem, token:str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return StreamingResponse(chat.post_chat_stream_json(body.dialogId, body.chatId, userId, body.msg), media_type="text/event-stream")

@router.get("/{dialogId}/user", dependencies=[Depends(auth.JWTBearer())])
async def get_my_chat(dialogId: str, token:str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await chat.getMyChat(dialogId, userId))

@router.get("/{dialogId}/msgs", dependencies=[Depends(auth.JWTBearer())])
async def get_msg_list(dialogId: str, token:str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await chat.get_chat_msg_list(dialogId, userId))

@router.get("/{chatId}/feedbacks", dependencies=[Depends(auth.JWTBearer())])
async def get_feedback_list(chatId: int, token:str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await chat.get_chat_feedback_list(chatId, userId))

@router.post("/translate", dependencies=[Depends(auth.JWTBearer())])
async def translate(req: TranslateReq):
	return makeResponse(await openai.translate(req))
