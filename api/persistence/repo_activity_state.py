"""활동 상태 — dev_spec_v1 §2.1

미학습은 행이 없는 것으로 표현하므로 `findOne` 이 None 을 내는 것이 정상이다.
"""
from datetime import datetime

from sqlalchemy import func
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

    # **완료 = 건너뛴 문항 없이 모두 응답** (shell_spec §1 전이표 · 2026-08-27 확정).
    #
    # 전에는 마지막 문항에 닿기만 하면 완료였다. 그러면 다 건너뛰고 끝까지 넘긴
    # 것도 완료로 남는다 — 과 목록에 체크가 붙고 "다 했다" 고 보인다.
    #
    # `answeredCount` 는 **클라이언트가 건너뛴 것을 빼고 보낸다**(예:
    # `fill-blank.tsx` 의 `questions.length - skippedCount`). 그래서 여기서
    # 총 문항 수와 견주면 건너뛴 것이 남았는지 알 수 있다.
    #
    # 못 세는 경우는 완료로 본다 — `total_items` 가 없거나(진입 때 문항 수를
    # 몰랐다) `answeredCount` 를 안 보낸 활동이다. 여기서 막으면 **셀 수 없는
    # 활동이 영원히 미완료**가 된다. 세지 못하는 것과 안 한 것은 다르다.
    #
    # **`row.answered_count` 가 아니라 넘어온 `answeredCount` 를 본다.** 칸의
    # 기본값이 0 이라 행을 읽으면 "안 보냈다" 와 "0 을 보냈다" 가 같아진다 —
    # 그러면 응답 수를 안 보내는 활동이 전부 미완료로 남는다(실측으로 잡았다).
    total = row.total_items
    allAnswered = (total is None or total <= 0
                   or answeredCount is None
                   or answeredCount >= total)

    if allAnswered:
        row.state = "completed"
        row.completed_at = datetime.utcnow()
    else:
        # 끝까지 갔지만 건너뛴 것이 남았다. 결과 화면은 뜨고 [다시 풀기]가
        # 그 문항을 가리킨다 — 돌아가 풀면 그때 완료가 된다(시나리오 14)
        row.state = "in_progress"
    db.flush()
    return row


async def markCompletedIfAllAnswered(userId: str, bookId: int, chapterSeq: int,
                                     menuType: str, sub: int, db: Session):
    """응답이 다 찼으면 완료로 올린다. **성적(세 수)은 건드리지 않는다.**

    왜 여기가 필요한가 — 완료를 알리는 `complete()` 는 **다시 풀기 세션에서는
    아예 안 불린다**(`use-activity-state.ts` 의 `retry` · shell_spec §3.3).
    그런데 새 완료 기준(§1, 2026-08-27)에서는 건너뛴 문항이 남으면 미완료이고,
    학습자는 그것을 **다시 풀기에서 푼다.** 그 세션이 아무 말도 안 하면 활동은
    영원히 미완료다 — 브라우저에서 실제로 그렇게 나왔다(6/6 을 풀었는데
    `in_progress`).

    그래서 **문항이 하나 기록될 때마다** 서버가 스스로 본다. 다시 풀기 세션도
    `learning-record` 는 보내므로 이 경로로 완료가 올라간다.

    **건너뛴 문항은 이 표에 행이 없다**(`business/learning_record.py`, 2026-08-27).
    그래서 행 수가 곧 "건너뛰지 않고 응답한 문항 수" 다 — 새 기준이 요구하는 바로 그 수다.

    `learning-record` 를 안 쓰는 활동(자모·롤플레잉·플래시카드·미션대화)에서는
    행이 0 이라 이 함수가 아무 일도 하지 않는다. 그쪽은 자기 `complete()` 경로가
    값을 다시 보내는 방식으로 이미 처리된다.

    **`sub` 로 못 거른다 — `ko_learning_record` 에 그 칸이 없다**(확인함).
    지금은 문제가 안 된다. `sub` 를 여럿 쓰는 것은 자모뿐이고(여섯), 자모는
    이 표에 아무것도 안 쓰기 때문이다. **자모가 학습 기록을 남기게 되면 여기부터
    고쳐야 한다** — 안 그러면 여섯 하위활동의 응답이 한 덩어리로 세어져,
    하나만 다 풀어도 여섯이 전부 완료로 올라간다. 인자로는 받아 두었다.
    """
    row = await findOne(userId, bookId, chapterSeq, menuType, sub, db)
    if row is None or row.state == "completed":
        return row
    total = row.total_items
    if not total or total <= 0:
        return row
    answered = db.query(func.count(model.KoLearningRecord.id)).filter(
        model.KoLearningRecord.user_id == userId,
        model.KoLearningRecord.book_id == bookId,
        model.KoLearningRecord.chapter_seq == chapterSeq,
        model.KoLearningRecord.menu_type == menuType,
    ).scalar() or 0
    if answered >= total:
        row.state = "completed"
        row.completed_at = datetime.utcnow()
        # 세 수는 덮지 않는다 — 원래 세션이 보낸 성적이 정본이다
        db.flush()
    return row


async def progressByUsers(userIds: list, db: Session) -> dict:
    """학생별 진도. `{user_id: {"completed": n, "lastBook": b, "lastChapter": c}}`.

    **완료만 센다**(`state == "completed"`). 이 표는 미학습을 행이 없는 것으로
    표현하므로(모델 docstring) 행 수를 세면 "시작만 한 것" 이 섞인다.

    「마지막 진도」는 **가장 최근에 끝낸 과**다 — 급·과 번호가 가장 큰 과가 아니다.
    학생이 5급을 하다 1급으로 돌아가 복습하는 일이 있고, 그때 번호로 고르면
    화면이 "5급까지 했다" 고 말해 실제와 어긋난다.
    """
    if not userIds:
        return {}
    keys = [str(u) for u in userIds]
    M = model.KoActivityState
    counts = dict(
        db.query(M.user_id, func.count(M.id))
          .filter(M.user_id.in_(keys), M.state == "completed")
          .group_by(M.user_id)
          .all()
    )
    # 가장 최근에 끝낸 한 과. 학생 수만큼 행이므로 한 번에 가져와 파이썬에서 고른다
    latest = {}
    rows = (
        db.query(M.user_id, M.book_id, M.chapter_seq, M.completed_at)
          .filter(M.user_id.in_(keys), M.state == "completed", M.completed_at.isnot(None))
          .order_by(M.completed_at.desc())
          .all()
    )
    for r in rows:
        if r.user_id not in latest:
            latest[r.user_id] = (r.book_id, r.chapter_seq)
    return {
        u: {
            "completed": int(counts.get(u, 0)),
            "lastBook": latest.get(u, (None, None))[0],
            "lastChapter": latest.get(u, (None, None))[1],
        }
        for u in set(list(counts.keys()) + list(latest.keys()))
    }
