from sqlalchemy.orm import Session

from persistence import model


async def create(db: Session, **fields):
    row = model.KoInquiry(**fields)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


async def markNotified(db: Session, inquiryId: int) -> None:
    db.query(model.KoInquiry).filter(model.KoInquiry.id == inquiryId).update(
        {"notified": True}, synchronize_session=False
    )
    db.commit()


async def listPending(db: Session, limit: int = 100):
    """슬랙에 못 꽂힌 것. 웹훅이 죽어 있던 동안의 문의를 다시 보낼 때 쓴다."""
    return (
        db.query(model.KoInquiry)
        .filter(model.KoInquiry.notified.is_(False))
        .order_by(model.KoInquiry.created_at.asc())
        .limit(limit)
        .all()
    )


async def addFile(db: Session, inquiryId: int, s3Key: str, mime: str, size: int):
    row = model.KoInquiryFile(
        inquiry_id=inquiryId, s3_key=s3Key, mime=mime, bytes=size
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


async def listFiles(db: Session, inquiryId: int):
    return (
        db.query(model.KoInquiryFile)
        .filter(model.KoInquiryFile.inquiry_id == inquiryId)
        .order_by(model.KoInquiryFile.id.asc())
        .all()
    )
