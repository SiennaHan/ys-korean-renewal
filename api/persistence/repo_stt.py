from sqlalchemy.orm import Session

from persistence import model


async def insertShadow(db: Session, **fields) :
    row = model.KoSttShadow(**fields)
    db.add(row)
    return row


async def getShadow(db: Session, shadow_id: int) :
    return db.query(model.KoSttShadow).filter(model.KoSttShadow.id == shadow_id).first()


async def listShadow(db: Session, limit: int, offset: int, kind: str) :
    query = db.query(model.KoSttShadow)
    if kind == "mismatch" :
        query = query.filter(model.KoSttShadow.is_match == False)
    elif kind in ("ortho", "content") :
        query = query.filter(model.KoSttShadow.diff_kind == kind)
    total = query.count()
    items = (
        query.order_by(model.KoSttShadow.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return items, total


async def countSummary(db: Session) :
    """유형별 건수 요약 (openai 성공 케이스 기준)."""
    base = db.query(model.KoSttShadow)
    return {
        "evaluated": base.filter(model.KoSttShadow.is_match.isnot(None)).count(),
        "mismatch": base.filter(model.KoSttShadow.is_match == False).count(),
        "ortho": base.filter(model.KoSttShadow.diff_kind == "ortho").count(),
        "content": base.filter(model.KoSttShadow.diff_kind == "content").count(),
    }


async def listShadowOlderThan(db: Session, cutoff, limit: int):
    """보관 기간이 지난 행. 음성 파일을 먼저 지워야 하므로 행 자체를 준다."""
    return (
        db.query(model.KoSttShadow)
        .filter(model.KoSttShadow.created_at < cutoff)
        .order_by(model.KoSttShadow.created_at.asc())
        .limit(limit)
        .all()
    )


async def deleteShadowByIds(db: Session, ids: list) -> int:
    if not ids:
        return 0
    n = (
        db.query(model.KoSttShadow)
        .filter(model.KoSttShadow.id.in_(ids))
        .delete(synchronize_session=False)
    )
    db.commit()
    return n
