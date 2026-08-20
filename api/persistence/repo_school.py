from sqlalchemy.orm import Session
from persistence import model


async def findAll(db: Session):
    return db.query(model.KoSchool).order_by(model.KoSchool.created_at.desc()).all()


async def findByCode(schoolCode: str, db: Session):
    return db.query(model.KoSchool).filter(model.KoSchool.school_code == schoolCode).first()


async def findById(schoolId: int, db: Session):
    return db.query(model.KoSchool).filter(model.KoSchool.id == schoolId).first()


async def createSchool(school: model.KoSchool, db: Session):
    db.add(school)
    db.flush()
    db.refresh(school)
    return school


async def updateSchool(schoolId: int, updates: dict, db: Session):
    school = db.query(model.KoSchool).filter(model.KoSchool.id == schoolId).first()
    if not school:
        return None
    for key, value in updates.items():
        if hasattr(school, key):
            setattr(school, key, value)
    db.flush()
    db.refresh(school)
    return school


async def deleteSchool(schoolId: int, db: Session):
    school = db.query(model.KoSchool).filter(model.KoSchool.id == schoolId).first()
    if school:
        db.delete(school)
        db.flush()
    return school
