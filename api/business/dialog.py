import os
from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder
import httpx
from accepter.base import GoogleTtsName, TtsVoiceGender
from business import tts
from persistence.database import sessionScope
from persistence import repo_chat, repo_feedback
from util import jsonutils, s3utils
from xternal import openai, gcloud

async def resetDialog(dialogId: int, userId: str):
    with sessionScope() as db:
        orgChat = await repo_chat.getUserChatByDialogId(dialogId, userId, db)
        newChat = await repo_chat.createChat(orgChat.book_id, dialogId, userId, orgChat.summary, db)

        return jsonable_encoder(newChat)
  
async def completDialog(dialogId: int, chatId: int, userId: str):
    with sessionScope() as db:
        chat = await repo_chat.getUserChatByDialogId(dialogId, userId, db)
        chat.status = 'completed'
       
        return jsonable_encoder(chat)
    
async def getReport(dialogId: int, userId:str, lang: str = "Korean"):
    with sessionScope() as db:
        
        userChat = await repo_chat.getUserChatByDialogId(dialogId, userId, db)
        if userChat is None: 
            return None

        feedbacks = await repo_feedback.listFeedback(userChat.id, db)
        
        feedbacksJson = list(((map(lambda feedback: jsonutils.to_json(feedback), feedbacks))))

        # 발음(맞춤법), 문법, 어휘, 내용
        if userChat.report is None :
            userChat.report = ""
            report = await openai.create_report(feedbacksJson, lang)
            userChat.report = jsonutils.to_string(report)
        
        print("userChat=>",jsonable_encoder(userChat))

        return { "chat": jsonable_encoder(userChat), "feedbacks": jsonable_encoder(feedbacksJson) }
    

async def listMission(bookId: int, userId:str):
    with sessionScope() as db:
        generatedList = []
        chatList = await repo_chat.getChatListByBookId(bookId, userId, db)

        for item in chatList :
            generatedList.append(jsonable_encoder(item))
            
        print("chatList=>", generatedList)
       
        return generatedList

##
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
	raise RuntimeError("OPENAI_API_KEY environment variable required")

TTS_ENDPOINT = "https://api.openai.com/v1/audio/speech"
HEADERS = {
	"Authorization": f"Bearer {OPENAI_API_KEY}",
	"Content-Type": "application/json",
	"Accept": "audio/mpeg"
}
async def getFirstMsgAudioUrl(dialogId: str, voice: TtsVoiceGender):
    """
    미션챗 첫 AI 발화의 음성 URL을 반환.
    - 첫 요청: first_msg 를 공통 TTS 코어로 생성해 S3에 저장하고 해시→url 을 DB에 캐싱
    - 이후 요청: 저장된 URL 을 그대로 반환
    해시 = sha256(provider + "::" + voice + "::" + first_msg) 이므로 문장이 수정되면
    키가 바뀌어 항상 화면 텍스트와 일치하는 음성이 재생된다.
    """
    with sessionScope() as db:
        dialog = await repo_chat.getDialog(dialogId, db)
        if dialog is None:
            raise HTTPException(status_code=404, detail="dialog not found")

        return await tts.getCachedTtsUrlByGender(dialog.first_msg, voice.value, 0, db)