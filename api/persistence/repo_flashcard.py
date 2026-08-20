from sqlalchemy import text, func
from sqlalchemy.orm import Session

from persistence import model
from util import timeutils

async def hasFlashcardActivityOnDate(userId: str, dateStr: str, db: Session) -> bool:
    """해당 날짜에 플래시카드 활동이 있는지 확인 (updated_at 기준)."""
    count = db.query(func.count(model.UserFlashcard.id)).filter(
        model.UserFlashcard.user_id == userId,
        func.date(model.UserFlashcard.updated_at) == dateStr,
    ).scalar()
    return (count or 0) > 0


async def countFlashcardActivityDaysInRange(userId: str, startDate: str, endDate: str, db: Session) -> int:
    """날짜 범위 내 플래시카드 활동이 있는 고유 날짜 수."""
    result = db.query(
        func.count(func.distinct(func.date(model.UserFlashcard.updated_at)))
    ).filter(
        model.UserFlashcard.user_id == userId,
        func.date(model.UserFlashcard.updated_at) >= startDate,
        func.date(model.UserFlashcard.updated_at) <= endDate,
    ).scalar()
    return int(result or 0)


async def countCompletedFlashcardsForBook(userId: str, bookId: int, db: Session) -> int:
    """특정 book의 완료된 고유 flashcard 수 (card_type 무관, flashcard_id 기준)."""
    result = db.query(
        func.count(func.distinct(model.UserFlashcard.flashcard_id))
    ).filter(
        model.UserFlashcard.user_id == userId,
        model.UserFlashcard.book_id == bookId,
        model.UserFlashcard.status == "complete",
    ).scalar()
    return int(result or 0)


# Flashcard
async def listUserFlashcard(userId: str, bookId: int, db: Session) :
    query = db.query(model.UserFlashcard)
    query = query.filter(model.UserFlashcard.user_id == userId, model.UserFlashcard.book_id == bookId)
    return query.all()

async def getUserFlashcard(userId: str, flashcardId: int, cardType: str, db: Session):
    query = db.query(model.UserFlashcard)
    query = query.filter(model.UserFlashcard.user_id == userId
                        , model.UserFlashcard.flashcard_id == flashcardId
                        , model.UserFlashcard.card_type == cardType)
    return query.first()

async def createUserFlashcard(userId: str, bookId: int, flashcardId: int, cardType: str, db: Session):
    userFlashcard = model.UserFlashcard()
    userFlashcard.user_id = userId
    userFlashcard.book_id = bookId
    userFlashcard.flashcard_id = flashcardId
    userFlashcard.card_type = cardType
    userFlashcard.known = 0
    userFlashcard.unknown = 0
    userFlashcard.status = 'new'
    userFlashcard.updated_at = timeutils.now()
    db.add(userFlashcard)
    db.flush()
    db.refresh(userFlashcard)
    return userFlashcard

async def updateUserFlashcardStatus(userId: str, flashcardId: int, cardType: str, status: str, db: Session):
    existing = await getUserFlashcard(userId, flashcardId, cardType, db)
    if existing:
        existing.status = status
        existing.updated_at = timeutils.now()
        db.flush()
        return existing
    return None

async def deleteUserFlashcard(userId: str, flashcardId: int, cardType: str, db: Session):
    query = db.query(model.UserFlashcard)
    query = query.filter(model.UserFlashcard.user_id == userId
                        , model.UserFlashcard.flashcard_id == flashcardId
                        , model.UserFlashcard.card_type == cardType)
    query.delete()

# Flashcard Word
async def listUserFlashcardWord(userId: str, flashcardId: int, db: Session) :
    query = db.query(model.UserFlashcardWord)
    query = query.filter(model.UserFlashcardWord.user_id == userId, model.UserFlashcardWord.flashcard_id == flashcardId)
    return query.all()

async def listUserFlashcardWordByType(userId: str, flashcardId: int, cardType: str, db: Session):
    query = db.query(model.UserFlashcardWord)
    query = query.filter(model.UserFlashcardWord.user_id == userId
                        , model.UserFlashcardWord.flashcard_id == flashcardId
                        , model.UserFlashcardWord.card_type == cardType)
    return query.all()

async def createUserFlashcardWord(userId: str, flashcardId: int, cardType: str, cardId: str, status: str, db: Session):
    word = model.UserFlashcardWord()
    word.user_id = userId
    word.flashcard_id = flashcardId
    word.card_type = cardType
    word.card_id = cardId
    word.status = status
    word.updated_at = timeutils.now()
    db.add(word)

async def upsertUserFlashcardWord(userId: str, flashcardId: int, cardType: str, cardId: str, status: str, db: Session):
    query = db.query(model.UserFlashcardWord)
    query = query.filter(model.UserFlashcardWord.user_id == userId
                        , model.UserFlashcardWord.flashcard_id == flashcardId
                        , model.UserFlashcardWord.card_type == cardType
                        , model.UserFlashcardWord.card_id == cardId)
    existing = query.first()
    if existing:
        existing.status = status
        existing.updated_at = timeutils.now()
        db.flush()
        return existing
    word = model.UserFlashcardWord()
    word.user_id = userId
    word.flashcard_id = flashcardId
    word.card_type = cardType
    word.card_id = cardId
    word.status = status
    word.updated_at = timeutils.now()
    db.add(word)
    db.flush()
    db.refresh(word)
    return word