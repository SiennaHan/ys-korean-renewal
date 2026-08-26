"""다시 풀기 목록 — dev_spec_v1 §2.3 · §3

한 세션에 내보내는 상한이 10 이다(§2.3). 60 을 한 번에 내면 압도한다 —
과당 26.7문항 실측 기준으로 60은 7~8과 분량이다.
"""
from fastapi.encoders import jsonable_encoder

from persistence import repo_review_queue
from persistence.database import sessionScope

SESSION_LIMIT = 10


def _serialize(row):
    return {
        "id": row.id,
        "bookId": row.book_id,
        "chapterSeq": row.chapter_seq,
        "menuType": row.menu_type,
        "sub": row.sub,
        "questionId": row.question_id,
        "reason": row.reason,
        "attempts": row.attempts,
        "availableAt": jsonable_encoder(row.available_at),
    }


async def listQueue(userId: str, scope: str, bookId, chapterSeq, menuType, sub: int):
    """scope=home 은 available_at 이 지난 것만, scope=activity 는 그 활동분 전체다.

    응답에 `total` 을 같이 낸다 — 홈 카드가 보관 총계를 보여 주는데, 세션 상한(10)
    때문에 `items` 길이로는 총계를 알 수 없다.
    """
    with sessionScope() as db:
        if scope == "activity":
            rows = await repo_review_queue.listForActivity(
                userId, bookId, chapterSeq, menuType, sub, SESSION_LIMIT, db
            )
        else:
            rows = await repo_review_queue.listForHome(userId, SESSION_LIMIT, db)
        return {
            "items": [_serialize(r) for r in rows],
            "total": await repo_review_queue.countAll(userId, db),
        }


async def removeOne(userId: str, rowId: int):
    with sessionScope() as db:
        return {"removed": await repo_review_queue.removeById(userId, rowId, db)}
