from sqlalchemy.orm import Session
from persistence import model


async def findBySchoolId(schoolId: int, db: Session):
    return db.query(model.KoClassLevel).filter(
        model.KoClassLevel.school_id == schoolId
    ).order_by(model.KoClassLevel.id.asc()).all()


async def findById(classLevelId: int, db: Session):
    return db.query(model.KoClassLevel).filter(
        model.KoClassLevel.id == classLevelId
    ).first()


async def create(classLevel: model.KoClassLevel, db: Session):
    db.add(classLevel)
    db.flush()
    db.refresh(classLevel)
    return classLevel


async def update(classLevelId: int, label: str, db: Session):
    cl = db.query(model.KoClassLevel).filter(
        model.KoClassLevel.id == classLevelId
    ).first()
    if not cl:
        return None
    cl.label = label
    db.flush()
    db.refresh(cl)
    return cl
