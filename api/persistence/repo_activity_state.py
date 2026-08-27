"""활동 상태 — dev_spec_v1 §2.1

미학습은 행이 없는 것으로 표현하므로 `findOne` 이 None 을 내는 것이 정상이다.
"""
from datetime import datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from persistence import model


async def findOne(userId: str, bookId: int, chapterSeq: int, menuType: str, sub: int, db: Session):
    return db.query(model.KoActivityState).filter(
        model.KoActivityState.user_id == userId,
        model.KoActivityState.book_id == bookId,
        model.KoActivityState.chapter_seq == chapterSeq,
        model.KoActivityState.menu_type == menuType,
        model.KoActivityState.sub == sub,
    ).first()


async def findByChapter(userId: str, bookId: int, chapterSeq: int, db: Session):
    return db.query(model.KoActivityState).filter(
        model.KoActivityState.user_id == userId,
        model.KoActivityState.book_id == bookId,
        model.KoActivityState.chapter_seq == chapterSeq,
    ).all()


async def enter(userId: str, bookId: int, chapterSeq: int, menuType: str, sub: int,
                totalItems, db: Session):
    """활동 진입. 없으면 in_progress 로 만들고, 있으면 상태를 건드리지 않는다.

    **완료한 활동에 다시 들어와도 completed 를 되돌리지 않는다** — 연습 세션이다
    (G2 §6-1). 그래서 이 함수는 state 를 쓰지 않고 읽기만 한다.

    totalItems 는 넘어온 값이 있을 때만 갱신한다. 콘텐츠가 늘면 분모가 바뀌는데,
    클라이언트가 세어 넘기는 값이라 없을 때 0 으로 덮으면 진행률이 깨진다.
    """
    existing = await findOne(userId, bookId, chapterSeq, menuType, sub, db)
    if existing:
        if totalItems is not None:
            existing.total_items = totalItems
        db.flush()
        return existing, False

    row = model.KoActivityState()
    row.user_id = userId
    row.book_id = bookId
    row.chapter_seq = chapterSeq
    row.menu_type = menuType
    row.sub = sub
    row.state = "in_progress"
    row.total_items = totalItems
    db.add(row)
    try:
        db.flush()
        db.refresh(row)
    except IntegrityError:
        # 같은 순간에 다른 요청이 먼저 넣었다 — 그쪽을 쓴다
        db.rollback()
        existing = await findOne(userId, bookId, chapterSeq, menuType, sub, db)
        if existing:
            return existing, False
        raise
    return row, True


async def saveProgress(userId: str, bookId: int, chapterSeq: int, menuType: str, sub: int,
                       currentItemIndex: int, db: Session):
    """문항을 옮길 때마다, 그리고 ✕ 로 나갈 때도 부른다(G2 §3.1 "저장 없이 나가기 없음").

    행이 없으면 만들지 않는다 — 진입을 거치지 않은 저장은 잃어버린 호출이고,
    여기서 만들면 total_items 를 모르는 반쪽 행이 생긴다.
    """
    row = await findOne(userId, bookId, chapterSeq, menuType, sub, db)
    if row is None:
        return None
    row.current_item_index = currentItemIndex
    db.flush()
    return row


async def complete(userId: str, bookId: int, chapterSeq: int, menuType: str, sub: int,
                   answeredCount, gradedCount, correctCount, db: Session):
    """마지막 문항에 응답했을 때. 이미 완료였으면 completed_at 을 덮지 않는다 —
    처음 끝낸 시각이 기록으로서 뜻이 있다.

    세 수는 넘어온 값이 있을 때만 쓴다. 서버가 ko_learning_record 로 다시 셀 수도
    있지만, 발음처럼 채점하지 않는 활동은 그 표에 안 남아서 클라이언트가 아는 것이
    더 정확하다.

    **이미 완료한 활동이면 세 수도 덮지 않는다** — shell_spec §32. 완료한 활동에
    다시 들어온 것은 연습 세션이고, 연습 결과로 원래 성적이 바뀌면 안 된다.
    클라이언트가 연습에서 이 API 를 아예 안 부르는 것이 1차 방어이고
    (`use-activity-state.ts`), 여기가 2차다 — 한쪽만으로는 못 막는다.
    """
    row = await findOne(userId, bookId, chapterSeq, menuType, sub, db)
    if row is None:
        return None
    if row.state == "completed":
        # 연습 세션이다. 아무것도 바꾸지 않고 최초 기록을 그대로 낸다
        return row
    if answeredCount is not None:
        row.answered_count = answeredCount
    if gradedCount is not None:
        row.graded_count = gradedCount
    if correctCount is not None:
        row.correct_count = correctCount
    row.state = "completed"
    row.completed_at = datetime.utcnow()
    db.flush()
    return row
