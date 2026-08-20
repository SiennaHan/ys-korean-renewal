from sqlalchemy.orm import Session
from sqlalchemy import func

from persistence import model


async def findByDate(userId: str, dateStr: str, db: Session):
    """특정 날짜의 활동 조회"""
    return db.query(model.KoDailyActivity).filter(
        model.KoDailyActivity.user_id == userId,
        model.KoDailyActivity.activity_date == dateStr,
    ).first()


async def findByDateRange(userId: str, startDate: str, endDate: str, db: Session):
    """날짜 범위의 활동 목록 조회"""
    return db.query(model.KoDailyActivity).filter(
        model.KoDailyActivity.user_id == userId,
        model.KoDailyActivity.activity_date >= startDate,
        model.KoDailyActivity.activity_date <= endDate,
    ).order_by(model.KoDailyActivity.activity_date.asc()).all()


async def findRecentDates(userId: str, limit: int, db: Session):
    """최근 활동 날짜 목록 (스트릭 계산용)"""
    return db.query(model.KoDailyActivity.activity_date).filter(
        model.KoDailyActivity.user_id == userId,
    ).order_by(model.KoDailyActivity.activity_date.desc()).limit(limit).all()


async def findLatest(userId: str, db: Session):
    """가장 최근 활동 조회 (이어서 학습하기)"""
    return db.query(model.KoDailyActivity).filter(
        model.KoDailyActivity.user_id == userId,
    ).order_by(model.KoDailyActivity.activity_date.desc()).first()


async def ensureExists(userId: str, dateStr: str, db: Session):
    """오늘 날짜의 활동 row가 없으면 생성"""
    existing = await findByDate(userId, dateStr, db)
    if existing:
        return existing
    activity = model.KoDailyActivity()
    activity.user_id = userId
    activity.activity_date = dateStr
    activity.study_seconds = 0
    activity.modules_done = 0
    activity.words_learned = 0
    db.add(activity)
    db.flush()
    db.refresh(activity)
    return activity


async def updateStudySeconds(userId: str, dateStr: str, totalSec: int, db: Session):
    """학습 시간 갱신"""
    activity = await ensureExists(userId, dateStr, db)
    activity.study_seconds = totalSec
    db.flush()
    return activity


async def incrementWordsLearned(userId: str, dateStr: str, db: Session):
    """학습 단어 수 1 증가"""
    activity = await ensureExists(userId, dateStr, db)
    activity.words_learned = (activity.words_learned or 0) + 1
    db.flush()


async def updateLastStudy(userId: str, dateStr: str, bookId: int, chapterSeq: int, menuType: str, db: Session):
    """마지막 학습 지점 갱신"""
    activity = await ensureExists(userId, dateStr, db)
    activity.last_book_id = bookId
    activity.last_chapter_seq = chapterSeq
    activity.last_menu_type = menuType
    db.flush()
