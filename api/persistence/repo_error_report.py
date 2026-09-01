from sqlalchemy import text
from sqlalchemy.orm import Session

from persistence import model
from util import timeutils

async def list(category: str, db: Session) :
    query = db.query(model.KoErrorReport)
    query = query.filter(model.KoErrorReport.category == category)
    return query.all()

async def countByTarget(targetId: str, db: Session) -> int:
    """이 영상(target_id)이 지금까지 몇 번 신고됐나 — 슬랙 메시지의 「누적 신고 수」"""
    return (
        db.query(model.KoErrorReport)
        .filter(model.KoErrorReport.target_id == targetId)
        .count()
    )

async def create(category: str, targetId: str, errorCode: str, errorMsg: str, content: str,
                  segmentStart, matchedLine: str, userId: str, db: Session):
    report = model.KoErrorReport()
    report.category = category
    report.target_id = targetId
    report.error_code = errorCode
    report.error_msg = errorMsg
    report.content = content
    report.segment_start = segmentStart
    report.matched_line = matchedLine
    report.user_id = userId
    report.created_at = timeutils.now()

    db.add(report)
    # id 가 필요하다(자동 증가) — 슬랙 메시지·응답 둘 다 이 행을 참조한다.
    # sessionScope 의 commit 은 with 블록이 끝나야 돈다
    db.flush()
    return report
