from typing import List
from persistence.database import sessionScope
from persistence import model, repo_chat, repo_feedback
from xternal import openai

from util import  jsonutils, timeutils
from fastapi.encoders import jsonable_encoder

def create_bot_chat(msg: str):
    return { "role": "assistant", "content": msg }

def create_system_chat(msg: str):
    return { "role": "system", "content": msg }

def create_user_chat(msg: str, chatId: int, userId: str) :
    return { "role": "user", "content": [{ "type": "text", "text": msg }] }

def created_completed_mission(missions: str) :
    return { "role": "system", "content": [{ "type": "text", "text": "현재 완료된 미션 : " + missions }] }

def create_chat_history(system_msg: str, first_msg: str, new_chat:object, chat_history: List[object], completed_mission: str, is_system_rule: bool):
    new_history = []

    if is_system_rule:
        SYSTEM_RULE = create_system_chat(system_msg)
        new_history.append(SYSTEM_RULE)
    
    if not completed_mission is None :
        new_history.append(created_completed_mission(completed_mission))

    BOT_CHAT = create_bot_chat(first_msg)
    new_history.append(BOT_CHAT)

    for chat in chat_history :
        new_history.append(chat)

    new_history.append(new_chat)
    return new_history

def convert_chat_history(entities: List[model.KoChatMsg]):
    history = []
    for entity in entities:
        
        question = jsonutils.to_json(entity.question)
        history.append(question)
        new_chat = {"role": 'assistant', "content": entity.answer}
        history.append(new_chat)
    
    return history

async def getMyChat(dialogId: int, userId: str) :
    with sessionScope() as db:
        myChat = await repo_chat.getUserChatByDialogId(dialogId, userId, db)
        dialog = await repo_chat.getDialog(dialogId, db)

        return {"chat": jsonable_encoder(myChat), "first_msg": dialog.first_msg, "mission": jsonutils.to_json(dialog.mission)}

async def get_chat_list(userId: str):
    with sessionScope() as db:
        encoded_list = []
        chat_list = await repo_chat.getChatList(userId, db)
        for chat in chat_list :
            encoded_list.append(jsonable_encoder(chat))

    return encoded_list

async def get_chat_msg_list(dialogId: int, userId:str):
    with sessionScope() as db:
        encoded_msg_list = []
        encoded_feedback_list = []
        chat = await repo_chat.getUserChatByDialogId(dialogId, userId, db)
        print("chat=>", chat)
        # userId 와 chatId 매치여부 확인
        if not chat is None :
            msg_list = await repo_chat.getChatMsgList(chat.id, db)
            print("msg_list=>", msg_list)
            for msg in msg_list :
                # 사용자
                userMsg = {
                   "id": msg.id, "chat_id": msg.chat_id, "is_bot": False,
                   "msg": msg.answer, "created_at": msg.created_at, "user_id": msg.user_id
                }
                _msgJson = jsonutils.to_json(msg.question)
                print("_msgJson =>", _msgJson)
                _question = _msgJson["content"][0]["text"]
                userMsg["msg"] = _question
                encoded_msg_list.append(jsonable_encoder(userMsg))
                # ai
                botMsg = {
                   "id": msg.id, "chat_id": msg.chat_id, "is_bot": True,
                   "msg": msg.answer, "created_at": msg.created_at, "user_id": msg.user_id
                }
                encoded_msg_list.append(jsonable_encoder(botMsg))
            
            feedback_list = await repo_feedback.listFeedback(chat.id, db)
            encoded_feedback_list = jsonable_encoder(feedback_list)

        return {"msgs": encoded_msg_list, "feedbacks": encoded_feedback_list}

async def get_chat_feedback_list(chatId: int, userId:str):
    with sessionScope() as db:
        userChat = await repo_chat.getUserChat(chatId, userId, db)
        if userChat is None: 
            return []

        feedbacks = await repo_feedback.listFeedback(chatId, db)
        return jsonable_encoder(feedbacks)


async def post_chat_stream_json(dialogId: int, chatId: int, userId: str, msg:str):
    print(f"[{timeutils.get_current_datetime_ymdhmss()}] chat => userId[{userId}], dialogId[{dialogId}], msg =", msg)
    with sessionScope() as db:
        chat_id = chatId
        chat_history = []

        chat = await repo_chat.getUserChatByDialogId(dialogId, userId, db)
        
        if chat is None :
            dialog = await repo_chat.getDialog(dialogId, db)
            chat = await repo_chat.createChat(dialog.book_id, dialogId, userId, msg[:200], db)
            chat_id = chat.id
        else :
            chat_id = chat.id
            entities = await repo_chat.getChatMsgList(chat_id, db)
            chat_history = convert_chat_history(entities)

        new_chat = create_user_chat(msg[:2000], chat_id, userId)
        new_content = { "role": "user", "content": new_chat["content"] }

        dialog = await repo_chat.getDialog(dialogId, db)

        chat_all = create_chat_history(dialog.prompt, dialog.first_msg, new_content, chat_history, chat.completed_missions, True)

        if len(chat_all) < 4 : # check user first msg
            userChat = await repo_chat.getUserChat(chat_id, userId, db)
            if not userChat is None:
                userChat.status = 'started'

    data = {"chatId": chat_id}
    yield f"data:{jsonutils.to_string(data)}\n\n"
    answer = ""
    # missionJson = jsonutils.to_json(dialog.mission)
    async for v in openai.quest_stream(chat_all):
        answer = f"{answer}{v}"
        obj = {"word": v}
        data = f"data:{jsonutils.to_string(obj)}\n\n"
        yield data

    with sessionScope() as db:
        await repo_chat.createMsg(chat_id, userId, jsonutils.to_string(new_content), answer, db)


async def post_chat_json(dialogId: int, chatId: int, userId: str, msg:str):
    print(f"[{timeutils.get_current_datetime_ymdhmss()}] chat => userId[{userId}], dialogId[{dialogId}], msg =", msg)
    with sessionScope() as db:
        chat_id = chatId

        chat_history = []

        chat = await repo_chat.getUserChatByDialogId(dialogId, userId, db)
        
        if chat is None :
            dialog = await repo_chat.getDialog(dialogId, db)
            chat = await repo_chat.createChat(dialog.book_id, dialogId, userId, msg[:200], db)
            chat_id = chat.id
        else :
            chat_id = chat.id
            entities = await repo_chat.getChatMsgList(chat_id, db)
            chat_history = convert_chat_history(entities)

        new_chat = create_user_chat(msg[:2000], chat_id, userId)
        new_content = { "role": "user", "content": new_chat["content"] }

        dialog = await repo_chat.getDialog(dialogId, db)

        chat_all = create_chat_history(dialog.prompt, dialog.first_msg, new_content, chat_history, chat.completed_missions, True)

        if len(chat_all) < 4 : # check user first msg
            userChat = await repo_chat.getUserChat(chat_id, userId, db)
            if not userChat is None:
                userChat.status = 'started'

    answer = await openai.quest(chat_all)
    
    with sessionScope() as db:
        await repo_chat.createMsg(chat_id, userId, jsonutils.to_string(new_content), answer, db)

    data = {"chatId": chat_id, "answer": answer}

    return data


async def post_check_mission(dialogId: int, chatId: int, userId: str, msg:str, lang: str = "Korean"):
    print(f"[{timeutils.get_current_datetime_ymdhmss()}] check mission => userId[{userId}], dialogId[{dialogId}], msg =", msg)
    with sessionScope() as db:
        chat_id = chatId
        chat_history = []
        
        chat = await repo_chat.getUserChatByDialogId(dialogId, userId, db)

        if chat is None :
            dialog = await repo_chat.getDialog(dialogId, db)
            chat = await repo_chat.createChat(dialog.book_id, dialogId, userId, msg[:200], db)
            chat_id = chat.id
        else :
            chat_id = chat.id
            entities = await repo_chat.getChatMsgList(chat_id, db)
            chat_history = convert_chat_history(entities)

        new_chat = create_user_chat(msg[:2000], chat_id, userId)
        new_content = { "role": "user", "content": new_chat["content"] }

        dialog = await repo_chat.getDialog(dialogId, db)

        chat_all = create_chat_history(dialog.prompt, dialog.first_msg, new_content, chat_history, None, False)

        feedback = await openai.check_mission(dialog.mission, dialog.scenario, dialog.level, chat_all, lang)

        isAllNatural = feedback["is_context_natural"] and feedback["is_vocabulary_natural"] and feedback["is_pronunciation_correct"] and feedback["is_grammar_correct"]

        feedback["is_all_natural"] = isAllNatural

        print("isAllNatural =>", isAllNatural)
        # 여기서 
        missions = feedback["completed_missions"]
        if not missions is None and len(missions) > 0 :
            if chat.completed_missions is None or chat.completed_missions == "" or chat.completed_missions == "[]":
                chat.completed_missions = jsonutils.to_string(missions)
            else :
                _orgMissions: List[str] = jsonutils.to_json(chat.completed_missions)
                _combined = set(_orgMissions + missions)
                _combined = list(_combined)
                chat.completed_missions = jsonutils.to_string(_combined)

        await repo_feedback.createFeedback(chat_id, userId, jsonutils.to_string(new_chat), jsonutils.to_string(feedback), db)

    return feedback
