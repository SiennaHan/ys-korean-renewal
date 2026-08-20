from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from persistence import model


async def findByUser(userId: str, bookId: int, chapterSeq: int, menuType: str, db: Session):
    query = db.query(model.KoLearningRecord)
    query = query.filter(
        model.KoLearningRecord.user_id == userId,
        model.KoLearningRecord.book_id == bookId,
        model.KoLearningRecord.chapter_seq == chapterSeq,
        model.KoLearningRecord.menu_type == menuType,
    )
    return query.all()


async def findOne(userId: str, bookId: int, chapterSeq: int, menuType: str, questionId: int, db: Session):
    query = db.query(model.KoLearningRecord)
    query = query.filter(
        model.KoLearningRecord.user_id == userId,
        model.KoLearningRecord.book_id == bookId,
        model.KoLearningRecord.chapter_seq == chapterSeq,
        model.KoLearningRecord.menu_type == menuType,
        model.KoLearningRecord.question_id == questionId,
    )
    return query.first()


async def upsert(userId: str, bookId: int, chapterSeq: int, menuType: str, questionId: int, selectedAnswer: str, isCorrect: bool, db: Session):
    existing = await findOne(userId, bookId, chapterSeq, menuType, questionId, db)
    if existing:
        existing.selected_answer = selectedAnswer
        existing.is_correct = isCorrect
        db.flush()
        return existing

    record = model.KoLearningRecord()
    record.user_id = userId
    record.book_id = bookId
    record.chapter_seq = chapterSeq
    record.menu_type = menuType
    record.question_id = questionId
    record.selected_answer = selectedAnswer
    record.is_correct = isCorrect
    db.add(record)
    try:
        db.flush()
        db.refresh(record)
    except IntegrityError:
        db.rollback()
        existing = await findOne(userId, bookId, chapterSeq, menuType, questionId, db)
        if existing:
            existing.selected_answer = selectedAnswer
            existing.is_correct = isCorrect
            db.flush()
            return existing
        raise
    return record


async def getProgress(userId: str, bookId: int, chapterSeq: int, db: Session):
    """Get count of correct records grouped by menu_type."""
    from sqlalchemy import func
    query = db.query(
        model.KoLearningRecord.menu_type,
        func.count(model.KoLearningRecord.id).label("total"),
        func.sum(
            func.cast(model.KoLearningRecord.is_correct, model.Integer)
        ).label("correct"),
    ).filter(
        model.KoLearningRecord.user_id == userId,
        model.KoLearningRecord.book_id == bookId,
        model.KoLearningRecord.chapter_seq == chapterSeq,
    ).group_by(model.KoLearningRecord.menu_type)
    return query.all()


async def getProgressAll(userId: str, db: Session):
    """Get total answered count across all books/chapters grouped by (book, chapter, menu)."""
    from sqlalchemy import func
    query = db.query(
        model.KoLearningRecord.book_id,
        model.KoLearningRecord.chapter_seq,
        model.KoLearningRecord.menu_type,
        func.count(model.KoLearningRecord.id).label("total"),
    ).filter(
        model.KoLearningRecord.user_id == userId,
    ).group_by(
        model.KoLearningRecord.book_id,
        model.KoLearningRecord.chapter_seq,
        model.KoLearningRecord.menu_type,
    )
    return query.all()


async def countTodayMenuTypes(userId: str, todayStr: str, db: Session):
    """오늘 학습한 고유 메뉴 타입 수 (updated_at 기준)."""
    from sqlalchemy import func
    query = db.query(
        func.count(func.distinct(model.KoLearningRecord.menu_type))
    ).filter(
        model.KoLearningRecord.user_id == userId,
        func.date(model.KoLearningRecord.updated_at) == todayStr,
    )
    result = query.scalar()
    return int(result or 0)


async def countWeekMenuActivities(userId: str, startDate: str, endDate: str, db: Session):
    """주간 활동 수: 날짜별 고유 메뉴 타입 수의 합."""
    from sqlalchemy import func, literal_column
    subq = db.query(
        func.count(func.distinct(model.KoLearningRecord.menu_type)).label("cnt")
    ).filter(
        model.KoLearningRecord.user_id == userId,
        func.date(model.KoLearningRecord.updated_at) >= startDate,
        func.date(model.KoLearningRecord.updated_at) <= endDate,
    ).group_by(
        func.date(model.KoLearningRecord.updated_at)
    ).subquery()
    result = db.query(func.sum(subq.c.cnt)).scalar()
    return int(result or 0)


async def findLatestRecord(userId: str, db: Session):
    """가장 최근에 학습한 레코드 1건 (이어서 학습하기 용)."""
    return db.query(model.KoLearningRecord).filter(
        model.KoLearningRecord.user_id == userId,
    ).order_by(model.KoLearningRecord.updated_at.desc()).first()
