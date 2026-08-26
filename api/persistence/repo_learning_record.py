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
    """첫 시도만 기록한다. 두 번째 이후 시도는 기존 행을 그대로 둔다.

    dev_spec_v1 §2.1 이 확정한 규칙이다 — "correct_count · ko_learning_record ·
    진행바 칸 상태 전부 첫 시도 기준. 두 번째 이후 시도는 기록하지 않는다."
    선택지 활동이 재시도형이라(오답이어도 정답을 공개하지 않고 맞힐 때까지 다시
    고르게 한다) 덮어쓰면 **정답률이 전부 100% 로 왜곡된다.** 2026-08-26 까지
    이 함수는 덮어쓰고 있었다.

    (행, 새로 만들었나) 를 돌려준다. 호출부가 "첫 시도일 때만" 할 일을 가른다 —
    학습 단어 수 같은 누적값이 재시도마다 늘어나면 안 된다.
    """
    existing = await findOne(userId, bookId, chapterSeq, menuType, questionId, db)
    if existing:
        return existing, False

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
        # 같은 순간에 다른 요청이 먼저 넣었다. 그쪽이 첫 시도다 — 덮지 않는다.
        db.rollback()
        existing = await findOne(userId, bookId, chapterSeq, menuType, questionId, db)
        if existing:
            return existing, False
        raise
    return record, True


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
