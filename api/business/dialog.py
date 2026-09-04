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
        #
        # **전에는 `if userChat.report is None` 이었고, 그 바로 아래에
        # `userChat.report = ""` 를 먼저 대입했다.** 그래서 두 가지가 깨졌다
        # (2026-09-03 발견) —
        #
        #  ① `create_report` 가 실패하면 `""` 가 그대로 커밋되고, 그 뒤로는
        #     `is None` 이 거짓이라 **총평이 영구히 빈 채로 남는다.** 리포트 화면은
        #     `report.empty*` 대체 문구만 보여 준다.
        #  ② 언어를 바꿔도 다시 만들지 않는다 — 한 번 한국어로 만들면
        #     영어로 봐도 **한국어 총평이 그대로** 나온다.
        #
        # 그래서 죽은 대입을 없애고, **빈 값이거나 저장된 언어가 다르면 다시 만든다.**
        # `_lang` 은 앱이 읽지 않는 키다(`mission-report.tsx` 는 네 항목만 본다).
        stored = jsonutils.to_json(userChat.report) if userChat.report else None
        storedLang = stored.get("_lang") if isinstance(stored, dict) else None
        if not userChat.report or storedLang != lang:
            # **목표 문법 이름을 리포트에 넘긴다**(기획 확정 2026-09-04, `P-c`).
            # 판정은 발화마다 `target_grammar_used` 를 내고 있었는데 리포트가 그 값도,
            # 문법의 이름도 몰랐다. `getDialog` 은 이미 이 함수가 가진 `dialogId` 로
            # 부를 수 있다 — 새 조회 하나로 문법 축 코멘트가 그 이름을 말할 수 있다.
            # 없으면 `None` 이고, 그때 프롬프트는 그 절을 아예 안 붙인다.
            dialog = await repo_chat.getDialog(dialogId, db)
            report = await openai.create_report(
                feedbacksJson, lang, dialog.target_grammar if dialog else None)
            if isinstance(report, dict):
                report = {**report, "_lang": lang}
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


def _key() -> str:
	"""요청 시점에 키를 요구한다.

	전에는 이 자리에서 바로 raise 했다. 모듈 로드 때 던지므로 **OPENAI_API_KEY 가
	없으면 서버 자체가 안 떴다** — dialog_accepter 가 이 모듈을 import 하기 때문이다.
	학습 흐름(로그인·활동·기록 저장)은 이 키가 필요 없는데도 그랬다.
	"""
	if not OPENAI_API_KEY:
		raise RuntimeError("OPENAI_API_KEY environment variable required")
	return OPENAI_API_KEY


TTS_ENDPOINT = "https://api.openai.com/v1/audio/speech"


def headers() -> dict:
	"""쓰는 곳이 아직 없다. 키를 로드 때 끼워 넣지 않으려고 함수로 둔다"""
	return {
		"Authorization": f"Bearer {_key()}",
		"Content-Type": "application/json",
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