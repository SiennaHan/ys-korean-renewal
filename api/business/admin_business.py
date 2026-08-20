from fastapi.encoders import jsonable_encoder

from business.auth_business import hashPassword
from persistence.database import sessionScope
from persistence import repo_user, model


async def getAdminList(approved: bool = None):
    with sessionScope() as db:
        admins = await repo_user.findAdminList(db, approved)
        return jsonable_encoder(admins)


async def getAdminListBySchool(school_code: str):
    with sessionScope() as db:
        admins = await repo_user.findAdminListBySchool(db, school_code)
        return jsonable_encoder(admins)


async def checkSchoolAdminPermission(adminId: int, callerSchoolCode: str):
    with sessionScope() as db:
        target = await repo_user.findById(adminId, db)
        if not target:
            return False, "관리자를 찾을 수 없습니다."
        if target.role != "student_admin":
            return False, "학생 관리자만 수정/삭제할 수 있습니다."
        if target.school_code != callerSchoolCode:
            return False, "다른 학교의 관리자는 수정/삭제할 수 없습니다."
        return True, None


async def createAdmin(email: str, password: str, name: str, role: str = "school_admin", school_code: str = None):
    with sessionScope() as db:
        existing = await repo_user.findByEmail(email, db)
        if existing:
            return None, "이미 등록된 이메일입니다."

        user = model.KoUser()
        user.email = email
        user.password_hash = hashPassword(password)
        user.name = name
        user.role = role
        user.school_code = school_code
        user.is_approved = True
        user.is_active = True

        created = await repo_user.createUser(user, db)
        return jsonable_encoder(created), None


async def deleteAdmin(adminId: int):
    with sessionScope() as db:
        deleted = await repo_user.deleteUser(adminId, db)
        if not deleted:
            return None, "관리자를 찾을 수 없습니다."
        return {"success": True}, None


async def approveAdmin(adminId: int):
    with sessionScope() as db:
        updated = await repo_user.updateUser(adminId, {"is_approved": True}, db)
        if not updated:
            return None, "관리자를 찾을 수 없습니다."
        return jsonable_encoder(updated), None


async def rejectAdmin(adminId: int):
    with sessionScope() as db:
        updated = await repo_user.updateUser(adminId, {"is_approved": False, "is_active": False}, db)
        if not updated:
            return None, "관리자를 찾을 수 없습니다."
        return jsonable_encoder(updated), None


async def updateAdmin(adminId: int, updates: dict):
    if "password" in updates:
        updates["password_hash"] = hashPassword(updates.pop("password"))
    with sessionScope() as db:
        updated = await repo_user.updateUser(adminId, updates, db)
        if not updated:
            return None, "관리자를 찾을 수 없습니다."
        return jsonable_encoder(updated), None
