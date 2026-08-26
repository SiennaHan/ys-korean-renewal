"""다시 풀기 목록 — dev_spec_v1 §2.3

규칙이 몇 개 얽혀 있어 한자리에 적어 둔다.

  들어오는 것   첫 시도 오답 · 건너뜀 · 플래시카드 "몰라요". **재시도로 맞혀도 남는다**
  나가는 것     다시 풀기에서 정답 1회 → 행 삭제
  같은 날 방지  available_at = 오답 다음 날 KST 00:00. 홈은 그 시각이 지난 것만 낸다.
                결과 화면의 [다시 풀기] 는 이 값을 무시하고 바로 낸다
  상한          보관 60. 넘으면 오래된 것부터 지우되 **attempts >= 3 은 보호한다**
  정렬          attempts 내림 → created_at 오름. 여러 번 틀린 것이 먼저
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import asc, desc
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from persistence import model

KST = timezone(timedelta(hours=9))
CAP = 60
PROTECT_ATTEMPTS = 3


def nextKstMidnightUtc(now: datetime | None = None) -> datetime:
    """다음 KST 자정을 UTC 로. 표는 UTC 로 저장한다(created_at 이 utc_timestamp 다).

    KST 로 넘어가 날짜를 하루 더하고 0시로 자른 뒤 UTC 로 되돌린다. 시간대를 안 씌우고
    9시간을 더하는 식으로 하면 자정 근처에서 하루가 밀린다.
    """
    base = (now or datetime.now(timezone.utc)).astimezone(KST)
    tomorrow = (base + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return tomorrow.astimezone(timezone.utc).replace(tzinfo=None)


async def findOne(userId: str, bookId: int, chapterSeq: int, menuType: str, sub: int,
                  questionId: int, db: Session):
    return db.query(model.KoReviewQueue).filter(
        model.KoReviewQueue.user_id == userId,
        model.KoReviewQueue.book_id == bookId,
        model.KoReviewQueue.chapter_seq == chapterSeq,
        model.KoReviewQueue.menu_type == menuType,
        model.KoReviewQueue.sub == sub,
        model.KoReviewQueue.question_id == questionId,
    ).first()


async def add(userId: str, bookId: int, chapterSeq: int, menuType: str, sub: int,
              questionId: int, reason: str, db: Session):
    """예약한다. 이미 있으면 attempts += 1 하고 available_at 을 다시 미룬다."""
    existing = await findOne(userId, bookId, chapterSeq, menuType, sub, questionId, db)
    if existing:
        existing.attempts = (existing.attempts or 1) + 1
        existing.reason = reason
        existing.available_at = nextKstMidnightUtc()
        db.flush()
        return existing, False

    row = model.KoReviewQueue()
    row.user_id = userId
    row.book_id = bookId
    row.chapter_seq = chapterSeq
    row.menu_type = menuType
    row.sub = sub
    row.question_id = questionId
    row.reason = reason
    row.attempts = 1
    row.available_at = nextKstMidnightUtc()
    db.add(row)
    try:
        db.flush()
        db.refresh(row)
    except IntegrityError:
        db.rollback()
        existing = await findOne(userId, bookId, chapterSeq, menuType, sub, questionId, db)
        if existing:
            return existing, False
        raise
    await prune(userId, db)
    return row, True


async def remove(userId: str, bookId: int, chapterSeq: int, menuType: str, sub: int,
                 questionId: int, db: Session) -> bool:
    """다시 풀기에서 맞혔을 때. 없으면 조용히 지나간다 — 처음부터 맞힌 문항이다."""
    row = await findOne(userId, bookId, chapterSeq, menuType, sub, questionId, db)
    if row is None:
        return False
    db.delete(row)
    db.flush()
    return True


async def removeById(userId: str, rowId: int, db: Session) -> bool:
    """DELETE /review-queue/{id}. **user_id 를 같이 걸어야 한다** — 남의 행을 지우면 안 된다."""
    row = db.query(model.KoReviewQueue).filter(
        model.KoReviewQueue.id == rowId,
        model.KoReviewQueue.user_id == userId,
    ).first()
    if row is None:
        return False
    db.delete(row)
    db.flush()
    return True


async def prune(userId: str, db: Session) -> int:
    """보관 상한 60. 넘으면 오래된 것부터 지우되 attempts >= 3 은 남긴다.

    보호 대상만으로 60 을 넘으면 아무것도 지우지 않는다 — 여러 번 틀린 것을 밀어내면
    상한의 뜻이 사라진다.
    """
    total = db.query(model.KoReviewQueue).filter(
        model.KoReviewQueue.user_id == userId
    ).count()
    if total <= CAP:
        return 0

    victims = db.query(model.KoReviewQueue).filter(
        model.KoReviewQueue.user_id == userId,
        model.KoReviewQueue.attempts < PROTECT_ATTEMPTS,
    ).order_by(asc(model.KoReviewQueue.created_at)).limit(total - CAP).all()
    for row in victims:
        db.delete(row)
    db.flush()
    return len(victims)


async def listForHome(userId: str, limit: int, db: Session):
    """홈 목록 — available_at 이 지난 것만. 한 세션 상한을 걸어 내보낸다."""
    return db.query(model.KoReviewQueue).filter(
        model.KoReviewQueue.user_id == userId,
        model.KoReviewQueue.available_at <= datetime.utcnow(),
    ).order_by(
        desc(model.KoReviewQueue.attempts), asc(model.KoReviewQueue.created_at)
    ).limit(limit).all()


async def listForActivity(userId: str, bookId: int, chapterSeq: int, menuType: str,
                          sub: int, limit: int, db: Session):
    """결과 화면의 [다시 풀기] — 그 활동 몫 전체. **available_at 을 보지 않는다.**"""
    return db.query(model.KoReviewQueue).filter(
        model.KoReviewQueue.user_id == userId,
        model.KoReviewQueue.book_id == bookId,
        model.KoReviewQueue.chapter_seq == chapterSeq,
        model.KoReviewQueue.menu_type == menuType,
        model.KoReviewQueue.sub == sub,
    ).order_by(
        desc(model.KoReviewQueue.attempts), asc(model.KoReviewQueue.created_at)
    ).limit(limit).all()


async def countAll(userId: str, db: Session) -> int:
    """홈 카드의 보관 총계. available_at 을 보지 않는다 — 쌓인 전부다."""
    return db.query(model.KoReviewQueue).filter(
        model.KoReviewQueue.user_id == userId
    ).count()


async def countForActivity(userId: str, bookId: int, chapterSeq: int, menuType: str,
                           sub: int, db: Session) -> int:
    """결과 화면의 "다시 풀 문제 N개"."""
    return db.query(model.KoReviewQueue).filter(
        model.KoReviewQueue.user_id == userId,
        model.KoReviewQueue.book_id == bookId,
        model.KoReviewQueue.chapter_seq == chapterSeq,
        model.KoReviewQueue.menu_type == menuType,
        model.KoReviewQueue.sub == sub,
    ).count()
