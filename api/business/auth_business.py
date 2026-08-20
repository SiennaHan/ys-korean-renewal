import bcrypt
from fastapi.encoders import jsonable_encoder

from accepter import auth
from persistence.database import sessionScope
from persistence import repo_user, repo_school, model


def hashPassword(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verifyPassword(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


async def signup(email: str, password: str, name: str):
    with sessionScope() as db:
        existing = await repo_user.findByEmail(email, db)
        if existing:
            return None, "이미 등록된 이메일입니다."

        user = model.KoUser()
        user.email = email
        user.password_hash = hashPassword(password)
        user.name = name
        user.role = "school_admin"
        user.is_approved = False
        user.is_active = True

        created = await repo_user.createUser(user, db)
        return jsonable_encoder(created), None


async def login(email: str, password: str):
    with sessionScope() as db:
        user = await repo_user.findByEmail(email, db)
        if not user:
            return None, "이메일 또는 비밀번호가 올바르지 않습니다."

        if user.role not in ["master_admin", "school_admin", "student_admin"]:
            return None, "관리자 계정이 아닙니다."

        if not user.is_active:
            return None, "비활성화된 계정입니다."

        if not user.is_approved:
            return None, "관리자 승인 대기 중입니다."

        if not verifyPassword(password, user.password_hash):
            return None, "이메일 또는 비밀번호가 올바르지 않습니다."

        # 학교 이름 조회
        school_name = None
        if user.school_code:
            school = await repo_school.findByCode(user.school_code, db)
            if school:
                school_name = school.school_name

        token = auth.signAdminJwt(user.id, user.email, [user.role], user.school_code)
        return {
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "schoolCode": user.school_code,
                "schoolName": school_name,
            }
        }, None


async def changePassword(userId: str, currentPassword: str, newPassword: str):
    with sessionScope() as db:
        user = await repo_user.findById(int(userId), db)
        if not user:
            return None, "사용자를 찾을 수 없습니다."

        if not verifyPassword(currentPassword, user.password_hash):
            return None, "현재 비밀번호가 올바르지 않습니다."

        await repo_user.updateUser(int(userId), {
            "password_hash": hashPassword(newPassword)
        }, db)
        return {"success": True}, None
