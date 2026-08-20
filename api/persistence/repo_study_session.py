from sqlalchemy.orm import Session
from sqlalchemy import func

from persistence import model


async def findLatestToday(userId: str, today: str, db: Session):
    """오늘 날짜의 가장 최근 세션 조회"""
    return db.query(model.KoStudySession).filter(
        model.KoStudySession.user_id == userId,
        model.KoStudySession.session_date == today,
    ).order_by(model.KoStudySession.id.desc()).first()


async def create(userId: str, today: str, now, db: Session):
    """새 세션 생성"""
    session = model.KoStudySession()
    session.user_id = userId
    session.session_date = today
    session.started_at = now
    session.last_ping_at = now
    session.duration_sec = 0
    db.add(session)
    db.flush()
    db.refresh(session)
    return session


async def sumDurationToday(userId: str, today: str, db: Session) -> int:
    """오늘의 전체 세션 누적 시간(초)"""
    result = db.query(
        func.coalesce(func.sum(model.KoStudySession.duration_sec), 0)
    ).filter(
        model.KoStudySession.user_id == userId,
        model.KoStudySession.session_date == today,
    ).scalar()
    return int(result)
