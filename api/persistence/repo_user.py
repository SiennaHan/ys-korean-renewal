from sqlalchemy import or_
from sqlalchemy.orm import Session
from persistence import model


async def findByEmail(email: str, db: Session):
    return db.query(model.KoUser).filter(model.KoUser.email == email).first()


async def findById(userId: int, db: Session):
    return db.query(model.KoUser).filter(model.KoUser.id == userId).first()


async def findAdminList(db: Session, approved: bool = None):
    query = db.query(model.KoUser).filter(
        model.KoUser.role.in_(["master_admin", "school_admin", "student_admin"])
    )
    if approved is not None:
        query = query.filter(model.KoUser.is_approved == approved)
    return query.order_by(model.KoUser.created_at.desc()).all()


async def findAdminListBySchool(db: Session, school_code: str):
    return db.query(model.KoUser).filter(
        model.KoUser.role == "student_admin",
        model.KoUser.school_code == school_code,
        model.KoUser.is_approved == True
    ).order_by(model.KoUser.created_at.desc()).all()


async def findStudentsBySchoolCode(schoolCode: str, db: Session, search: str = None):
    query = db.query(model.KoUser).filter(
        model.KoUser.role == "student",
        model.KoUser.school_code == schoolCode
    )
    if search:
        keyword = f"%{search}%"
        query = query.filter(
            or_(
                model.KoUser.name.like(keyword),
                model.KoUser.student_number.like(keyword)
            )
        )
    return query.order_by(model.KoUser.created_at.desc()).all()


async def findAllStudents(db: Session, search: str = None):
    query = db.query(model.KoUser).filter(
        model.KoUser.role == "student"
    )
    if search:
        keyword = f"%{search}%"
        query = query.filter(
            or_(
                model.KoUser.name.like(keyword),
                model.KoUser.student_number.like(keyword)
            )
        )
    return query.order_by(model.KoUser.created_at.desc()).all()


async def createUser(user: model.KoUser, db: Session):
    db.add(user)
    db.flush()
    db.refresh(user)
    return user


async def updateUser(userId: int, updates: dict, db: Session):
    user = db.query(model.KoUser).filter(model.KoUser.id == userId).first()
    if not user:
        return None
    for key, value in updates.items():
        if hasattr(user, key):
            setattr(user, key, value)
    db.flush()
    db.refresh(user)
    return user


async def deleteUser(userId: int, db: Session):
    user = db.query(model.KoUser).filter(model.KoUser.id == userId).first()
    if user:
        db.delete(user)
        db.flush()
    return user
