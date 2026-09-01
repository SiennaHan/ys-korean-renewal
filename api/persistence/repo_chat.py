from sqlalchemy import func, text, or_
from sqlalchemy.dialects.mysql import insert as mysql_insert
from sqlalchemy.orm import Session

from persistence import model
from util import timeutils

# dialog
class _Dialog :
    """대화 런타임이 쓰는 여섯 칸만 노출하는 껍데기.

    호출부(business/chat.py 8곳 · business/dialog.py 1곳)가 `dialog.prompt` 꼴로
    읽으므로 이름을 그대로 맞춰 준다 — 그래서 이 파일 밖은 안 고쳐도 된다.
    """
    __slots__ = ("book_id", "prompt", "first_msg", "mission", "scenario", "level", "item_id")

    def __init__(self, row) :
        self.item_id   = row.item_id
        self.book_id   = row.book_id
        self.prompt    = row.ai_persona_prompt
        self.first_msg = row.ai_first_line
        self.mission   = row.mission_detail
        self.scenario  = row.situation_ko
        self.level     = str(row.level or row.book_id)


async def getDialog(dialogId: str, db: Session) :
    """`ko_mission_chat` 에서 legacy_id 로 찾는다.

    **전에는 `ko_chat_dialog.id == dialogId` 였다. 그것으로는 못 찾는다.**
    프런트가 넘기는 값은 구 앱 식별자인 문자열(`"C4"`)인데 그 열은 `int
    AUTO_INCREMENT` 다. MySQL 은 `WHERE id = 'C4'` 를 **`id = 0` 으로** 견준다 —
    2026-09-01 에 로컬 DB 에서 확인했다:

        WHERE id = 'C4'   → id=0 행에 걸림
        WHERE id = 'C10'  → 같은 id=0 행에 걸림

    그러니 `id=0` 행이 없으면 **모든 과가 404** 이고, 있으면 **117개 과가 전부
    같은 프롬프트**를 받는다. 어느 쪽이든 맞물리지 않는다.

    그리고 `ko_chat_dialog` 는 **이 저장소가 채울 방법이 없다** — 씨드 스크립트
    여섯 중 그 표를 건드리는 것이 하나도 없다. 원장(v53)이 실제로 흘러드는 표는
    `ko_mission_chat` 이고(`api/seed_textbook_content.py`), 대화가 쓰는 여섯 칸을
    그 표가 전부 갖고 있다. 그래서 읽는 곳을 그쪽으로 옮겼다.

    `legacy_id` 는 `String(20)` 이라 `"C4"` 가 그대로 열쇠가 된다. 사용자 대화
    기록 `ko_chat.dialog_id` 도 이미 `String(10)` 으로 그 값을 담고 있다.
    """
    row = (db.query(model.KoMissionChat)
             .filter(model.KoMissionChat.legacy_id == dialogId)
             .first())
    return _Dialog(row) if row else None

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
