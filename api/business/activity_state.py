"""활동 상태 — dev_spec_v1 §2.1 · §3

진입 · 진행 저장 · 완료 셋이다. 완료 응답에 **그 활동의 잔여 다시 풀기 수**를
함께 낸다 — 결과 화면이 "다시 풀 문제 N개" 에 쓴다(§3).
"""
from fastapi.encoders import jsonable_encoder

from persistence import repo_activity_state, repo_review_queue
from persistence.database import sessionScope


def _serialize(row):
    if row is None:
        return None
    return {
        "bookId": row.book_id,
        "chapterSeq": row.chapter_seq,
        "menuType": row.menu_type,
        "sub": row.sub,
        "state": row.state,
        "currentItemIndex": row.current_item_index,
        "totalItems": row.total_items,
        "answeredCount": row.answered_count,
        "gradedCount": row.graded_count,
        "correctCount": row.correct_count,
        "completedAt": jsonable_encoder(row.completed_at),
    }


async def enter(userId: str, bookId: int, chapterSeq: int, menuType: str, sub: int, totalItems):
    """활동 진입.

    **완료한 활동에 다시 들어오면 상태를 바꾸지 않는다** — 연습 세션이다(G2 §6-1).
    응답의 `practice` 가 그것을 알려 준다. 화면이 "다시 풀기" 로 들어온 것인지
    처음인지 구분해야 진행바와 결과 처리가 달라진다.
    """
    with sessionScope() as db:
        row, created = await repo_activity_state.enter(
            userId, bookId, chapterSeq, menuType, sub, totalItems, db
        )
        data = _serialize(row)
        data["created"] = created
        data["practice"] = row.state == "completed"
        return data


async def saveProgress(userId: str, bookId: int, chapterSeq: int, menuType: str, sub: int,
                       currentItemIndex: int):
    """문항 이동마다, 그리고 ✕ 로 나갈 때도 부른다.

    진입을 거치지 않았으면 None 이다 — 만들지 않는다. 반쪽 행(total_items 를 모르는
    행)이 생기면 진행률이 조용히 틀린다.
    """
    with sessionScope() as db:
        row = await repo_activity_state.saveProgress(
            userId, bookId, chapterSeq, menuType, sub, currentItemIndex, db
        )
        return _serialize(row)


async def complete(userId: str, bookId: int, chapterSeq: int, menuType: str, sub: int,
                   answeredCount, gradedCount, correctCount):
    with sessionScope() as db:
        row = await repo_activity_state.complete(
            userId, bookId, chapterSeq, menuType, sub,
            answeredCount, gradedCount, correctCount, db,
        )
        if row is None:
            return None
        data = _serialize(row)
        # 결과 화면의 "다시 풀 문제 N개". 같은 트랜잭션에서 세야 방금 넣은 오답이 반영된다
        data["reviewRemaining"] = await repo_review_queue.countForActivity(
            userId, bookId, chapterSeq, menuType, sub, db
        )
        return data


async def getChapter(userId: str, bookId: int, chapterSeq: int):
    """한 과의 활동 상태 전부. 교재학습 목록이 done 표시에 쓴다."""
    with sessionScope() as db:
        rows = await repo_activity_state.findByChapter(userId, bookId, chapterSeq, db)
        return [_serialize(r) for r in rows]
