from sqlalchemy import func, text, or_
from sqlalchemy.dialects.mysql import insert as mysql_insert
from sqlalchemy.orm import Session

from persistence import model
from util import timeutils

# dialog
async def getDialog(dialogId: str, db: Session) :
    query = db.query(model.KoChatDialog)
    query = query.filter(model.KoChatDialog.id == dialogId)
    return query.first()

# TTS cache (hash → audio url)
async def getTtsCache(hashKey: str, db: Session) :
    query = db.query(model.KoTtsCache)
    query = query.filter(model.KoTtsCache.hash == hashKey)
    return query.first()

async def upsertTtsCache(hashKey: str, voice: str, msgText: str, url: str, db: Session) :
    # 같은 해시로 동시 생성 요청이 와도 마지막 writer가 overwrite (멱등)
    stmt = mysql_insert(model.KoTtsCache).values(
        hash=hashKey, voice=voice, text=msgText, url=url,
    )
    stmt = stmt.on_duplicate_key_update(
        voice=stmt.inserted.voice, text=stmt.inserted.text, url=stmt.inserted.url,
    )
    db.execute(stmt)

# Chat
async def getUserChat(chatId: int, userId: str, db: Session) :
    query = db.query(model.KoChat)
    query = query.filter(model.KoChat.user_id == userId, model.KoChat.id == chatId)
    return query.first()

async def getUserChatByDialogId(dialogId:int, userId:str, db: Session) :
    query = db.query(model.KoChat)
    query = query.filter(model.KoChat.user_id == userId, model.KoChat.dialog_id == dialogId)
    query = query.order_by(model.KoChat.id.desc())
    return query.first()

async def getChatList(userId: str, db: Session) :
    query = db.query(model.KoChat)
    query = query.filter(model.KoChat.user_id == userId, model.KoChat.is_deleted == False)
    return query.all()

async def getChatListByBookId(bookId: int, userId: str, db: Session) :
    # query = db.query(model.KoChat)
    # query = query.filter(model.KoChat.user_id == userId, model.KoChat.book_id == bookId, model.KoChat.is_deleted == False)
    # return query.all()
    # 1. 서브쿼리: 조건에 맞는 데이터 중 dialog_id별로 가장 큰 id를 추출
    # .subquery() 대신 .scalar_subquery()를 사용하거나
    # 아예 .subquery() 호출을 생략하고 쿼리 객체를 그대로 전달하면 경고가 사라집니다.
    
    max_id_selector = (
        db.query(func.max(model.KoChat.id))
        .filter(
            model.KoChat.user_id == userId,
            model.KoChat.book_id == bookId,
            model.KoChat.is_deleted == False
        )
        .group_by(model.KoChat.dialog_id)
        .scalar_subquery()  # <--- 이 부분이 핵심입니다.
    )

    query = db.query(model.KoChat).filter(model.KoChat.id.in_(max_id_selector))
    
    return query.all()

async def hasCompletedChatOnDate(userId: str, dateStr: str, db: Session) -> bool:
    """해당 날짜에 완료된 미션챗이 있는지 확인 (updated_at 기준)."""
    count = db.query(func.count(model.KoChat.id)).filter(
        model.KoChat.user_id == userId,
        model.KoChat.status == "completed",
        func.date(model.KoChat.updated_at) == dateStr,
    ).scalar()
    return (count or 0) > 0


async def countCompletedChatDaysInRange(userId: str, startDate: str, endDate: str, db: Session) -> int:
    """날짜 범위 내 미션챗 완료가 있는 고유 날짜 수."""
    result = db.query(
        func.count(func.distinct(func.date(model.KoChat.updated_at)))
    ).filter(
        model.KoChat.user_id == userId,
        model.KoChat.status == "completed",
        func.date(model.KoChat.updated_at) >= startDate,
        func.date(model.KoChat.updated_at) <= endDate,
    ).scalar()
    return int(result or 0)


async def countCompletedChatsForBook(userId: str, bookId: int, db: Session) -> int:
    """특정 book의 완료된 고유 dialog 수."""
    result = db.query(
        func.count(func.distinct(model.KoChat.dialog_id))
    ).filter(
        model.KoChat.user_id == userId,
        model.KoChat.book_id == bookId,
        model.KoChat.status == "completed",
    ).scalar()
    return int(result or 0)


async def countDialogsForBook(bookId: int, db: Session) -> int:
    """특정 book의 전체 dialog 수."""
    result = db.query(func.count(model.KoChatDialog.id)).filter(
        model.KoChatDialog.book_id == bookId,
    ).scalar()
    return int(result or 0)


async def getChatMsgList(chatId:int, db: Session) :
    query = db.query(model.KoChatMsg)
    query = query.filter(model.KoChatMsg.chat_id == chatId)
    return query.all()

async def createChat(bookId: int, dialogId: int, userId: str, summary: str, db: Session):
    chat = model.KoChat()
    chat.book_id = bookId
    chat.dialog_id = dialogId
    chat.user_id = userId
    chat.summary = summary
    chat.idx = getMaxIdx(userId, db)
    chat.created_at = timeutils.now()
    chat.updated_at = timeutils.now()
    db.add(chat)
    db.flush()
    db.refresh(chat)
    return chat

def updateChatDate(chatId: int, db: Session):
    sql = "update ko_chat set updated_at = :updatedAt where id = :chatId;"
    params = {"chatId": chatId, "updatedAt": timeutils.now()}
    db.execute(text(sql), params)

async def createMsg(chatId: int, userId: str, question: str, answer: str, db: Session):
    msg = model.KoChatMsg()
    msg.user_id = userId
    msg.chat_id = chatId
    msg.question = question
    msg.answer = answer
    msg.created_at = timeutils.now()
    db.add(msg)
    updateChatDate(chatId, db)
    return chatId

def getMaxIdx(userId: str, db: Session):
    sql = "select ifnull(max(idx), 0) + 1 as nextIdx from ko_chat where user_id = :userId;"
    params = {"userId": userId}
    query = db.execute(text(sql), params).mappings().fetchone()
    return query["nextIdx"]
