from sqlalchemy import text
from sqlalchemy.orm import Session

from persistence import model
from util import timeutils

async def list(category: str, db: Session) :
    query = db.query(model.KoErrorReport)
    query = query.filter(model.KoErrorReport.category == category)
    return query.all()

async def create(category: str, targetId: str, errorCode: str, errorMsg: str, content: str, userId: str, db: Session):
    report = model.KoErrorReport()
    report.category = category
    report.target_id = targetId
    report.error_code = errorCode
    report.error_msg = errorMsg
    report.content = content
    report.user_id = userId
    report.created_at = timeutils.now()
    
    db.add(report)
