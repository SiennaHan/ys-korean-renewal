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
    """학교가 보는 목록. **탈퇴한 학생은 빠진다** (기획 확정 2026-08-29).

    탈퇴해도 계정과 학습 데이터는 남지만(`user_withdraw.maskAccount`) 그것은
    마스터가 보라고 남긴 것이고, 학교에는 나가지 않는다. 이름이 가려져 있어도
    마찬가지다 — 학교 화면에 ○ 이 뜨는 것 자체가 「이 학생이 탈퇴했다」를
    말해 준다.

    **그래서 학교의 지난 숫자가 줄어든다.** 학생 수도 활동 합계도 탈퇴한
    사람만큼 빠진다. 아래 `findAllStudents`(마스터)는 그대로 다 센다 —
    두 화면의 합계가 다른 것이 맞다.
    """
    query = db.query(model.KoUser).filter(
        model.KoUser.role == "student",
        model.KoUser.school_code == schoolCode,
        model.KoUser.withdrawn_at.is_(None),
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
    """마스터가 보는 목록. **탈퇴한 학생도 들어간다** (기획 확정 2026-08-29).

    학생들이 어떻게 공부하는지 참고하려고 남긴 것이라 여기서 빼면 남긴 뜻이
    없다. 이름·이메일은 가려져 있다(`shared/withdrawal_scope`).

    `search` 는 이름·학번으로 찾는데, **탈퇴자는 이름으로 안 찾힌다** —
    가린 값이 저장돼 있어서다. 학번으로는 찾힌다(안 가린다).
    """
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
