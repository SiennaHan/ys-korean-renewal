from sqlalchemy.orm import Session
from sqlalchemy import case, func
from sqlalchemy.exc import IntegrityError

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
    """스트릭용 — **응답이 있었던 날만** 낸다.

    전에는 행이 있는 날을 다 냈다. 그 행은 학습 세션 핑이 만들므로
    **아무것도 안 풀고 활동 화면을 열어만 봐도 스트릭이 올랐다.**
    기획 확정(2026-08-27): 응답 하나와 그 채점 결과를 봐야 오른다.
    """
    return db.query(model.KoDailyActivity.activity_date).filter(
        model.KoDailyActivity.user_id == userId,
        model.KoDailyActivity.responded.is_(True),
    ).order_by(model.KoDailyActivity.activity_date.desc()).limit(limit).all()


async def findLatest(userId: str, db: Session):
    """가장 최근 활동 조회 (이어서 학습하기)"""
    return db.query(model.KoDailyActivity).filter(
        model.KoDailyActivity.user_id == userId,
    ).order_by(model.KoDailyActivity.activity_date.desc()).first()


async def ensureExists(userId: str, dateStr: str, db: Session):
    """오늘 날짜의 행이 없으면 만든다.

    **읽고 나서 쓰는 사이에 다른 요청이 끼어들 수 있다.** 이 함수는 학습 세션 핑과
    학습 기록 저장이 같이 부르는데, 둘이 같은 순간에 오면 **둘 다 "없다" 를 읽고
    둘 다 넣는다.** 그러면 하루가 두 줄이 되고 학습 시간이 두 줄로 갈려
    주간 차트가 실제보다 적게 나온다.

    2026-08-27 에 `uq_user_date` 를 모델에 넣으면서 이 자리를 같이 고쳤다 —
    유니크만 걸고 여기를 안 고치면 그 경합이 **500 으로 바뀔 뿐**이다.
    진 쪽은 예외를 받아 되돌리고 이긴 쪽의 행을 다시 읽는다.
    """
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
    try:
        db.flush()
        db.refresh(activity)
        return activity
    except IntegrityError:
        # 같은 순간에 다른 요청이 먼저 넣었다. 그쪽 행을 쓴다
        db.rollback()
        return await findByDate(userId, dateStr, db)


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


async def markResponded(userId: str, dateStr: str, db: Session):
    """그날 **응답이 하나라도 있었다** 고 표시한다 — 스트릭의 기준.

    부르는 자리는 하나다: 학습 기록이 저장될 때(건너뜀 제외).
    화면은 채점한 뒤에 기록을 보내므로, 그 호출이 곧 "응답했고 채점 결과를 봤다" 다
    (기획 확정 2026-08-27).
    """
    activity = await ensureExists(userId, dateStr, db)
    if activity is not None and not activity.responded:
        activity.responded = True
        db.flush()
    return activity


async def summaryByUsers(userIds: list, db: Session) -> dict:
    """학생별 활동 합계. `{user_id: {...}}`.

    **`responded` 로 가른다.** 이 표의 행은 학습 세션 핑이 만들어서
    **활동 화면을 열어만 봐도 하루가 한 줄 생긴다**(이 모델의 docstring).
    그래서 「활동한 날」을 행 수로 세면 열어만 본 날이 섞인다 —
    스트릭이 그 실수로 한 번 부풀었던 자리다.

    `study_seconds` 는 responded 와 무관하게 다 더한다 — 열어 두고 들은 시간도
    학습 시간이다. **두 수의 기준이 다르다는 것을 화면 라벨이 말해야 한다.**
    """
    if not userIds:
        return {}
    keys = [str(u) for u in userIds]
    M = model.KoDailyActivity
    rows = (
        db.query(
            M.user_id,
            func.coalesce(func.sum(case((M.responded == True, 1), else_=0)), 0).label("active_days"),
            func.coalesce(func.sum(M.study_seconds), 0).label("study_seconds"),
            func.coalesce(func.sum(M.modules_done), 0).label("modules_done"),
            func.max(case((M.responded == True, M.activity_date), else_=None)).label("last_active_date"),
        )
        .filter(M.user_id.in_(keys))
        .group_by(M.user_id)
        .all()
    )
    return {
        r.user_id: {
            "activeDays": int(r.active_days or 0),
            "studySeconds": int(r.study_seconds or 0),
            "modulesDone": int(r.modules_done or 0),
            "lastActiveDate": r.last_active_date,
        }
        for r in rows
    }
