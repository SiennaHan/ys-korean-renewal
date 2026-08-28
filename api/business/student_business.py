import io
import openpyxl
from fastapi.encoders import jsonable_encoder

from business.auth_business import hashPassword
from persistence.database import sessionScope
from persistence import repo_user, model


async def getStudentList(schoolCode: str = None, search: str = None):
    with sessionScope() as db:
        if schoolCode:
            students = await repo_user.findStudentsBySchoolCode(schoolCode, db, search)
        else:
            students = await repo_user.findAllStudents(db, search)
        return jsonable_encoder(students)


async def createStudentBatch(schoolCode: str, students: list):
    results = []
    errors = []

    with sessionScope() as db:
        for i, s in enumerate(students):
            existing = await repo_user.findByEmail(s.email, db)
            if existing:
                errors.append({"row": i + 1, "email": s.email, "error": "이미 등록된 이메일입니다."})
                continue

            user = model.KoUser()
            user.email = s.email
            user.password_hash = hashPassword(s.password)
            user.name = s.name
            user.role = "student"
            user.school_code = schoolCode
            user.phone = s.phone
            user.student_number = s.student_number
            user.class_level = s.class_level
            user.instructor = s.instructor
            user.is_approved = True
            user.is_active = True

            created = await repo_user.createUser(user, db)
            results.append(jsonable_encoder(created))

    return {"created": results, "errors": errors}


async def createStudentsFromExcel(schoolCode: str, fileBytes: bytes):
    wb = openpyxl.load_workbook(io.BytesIO(fileBytes))
    ws = wb.active

    students = []
    errors = []

    # 헤더 행(1행) 건너뛰기, 2행부터 데이터
    for rowIdx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        if not row[0]:  # 이메일이 비어있으면 건너뛰기
            continue

        email = str(row[0]).strip() if row[0] else None
        password = str(row[1]).strip() if row[1] else None
        name = str(row[2]).strip() if row[2] else None

        if not email or not password or not name:
            errors.append({"row": rowIdx, "error": "필수 항목(이메일, 비밀번호, 이름)이 비어있습니다."})
            continue

        phone = str(row[3]).strip() if len(row) > 3 and row[3] else None
        student_number = str(row[4]).strip() if len(row) > 4 and row[4] else None
        class_level = str(row[5]).strip() if len(row) > 5 and row[5] else None
        instructor = str(row[6]).strip() if len(row) > 6 and row[6] else None

        students.append({
            "email": email,
            "password": password,
            "name": name,
            "phone": phone,
            "student_number": student_number,
            "class_level": class_level,
            "instructor": instructor,
        })

    created = []
    with sessionScope() as db:
        for i, s in enumerate(students):
            existing = await repo_user.findByEmail(s["email"], db)
            if existing:
                errors.append({"row": i + 2, "email": s["email"], "error": "이미 등록된 이메일입니다."})
                continue

            user = model.KoUser()
            user.email = s["email"]
            user.password_hash = hashPassword(s["password"])
            user.name = s["name"]
            user.role = "student"
            user.school_code = schoolCode
            user.phone = s["phone"]
            user.student_number = s["student_number"]
            user.class_level = s["class_level"]
            user.instructor = s["instructor"]
            user.is_approved = True
            user.is_active = True

            result = await repo_user.createUser(user, db)
            created.append(jsonable_encoder(result))

    return {"created": created, "errors": errors}


async def getInstructors(schoolCode: str):
    with sessionScope() as db:
        admins = await repo_user.findAdminListBySchool(db, schoolCode)
        return jsonable_encoder(admins)


async def updateStudent(studentId: int, updates: dict):
    with sessionScope() as db:
        updated = await repo_user.updateUser(studentId, updates, db)
        if not updated:
            return None, "학생을 찾을 수 없습니다."
        return jsonable_encoder(updated), None


async def deleteStudent(studentId: int):
    with sessionScope() as db:
        deleted = await repo_user.deleteUser(studentId, db)
        if not deleted:
            return None, "학생을 찾을 수 없습니다."
        return {"success": True}, None


async def checkStudentSchool(studentId: int, callerSchoolCode: str):
    """이 학생을 내가 고치거나 지울 수 있나. 문제가 없으면 None.

    `admin_business.checkSchoolAdminPermission` 과 같은 모양이다. 그쪽은 관리자
    행을 보고 이쪽은 학생 행을 본다 — 전에는 학생 쪽에 대응물이 아예 없어서
    **아무 학교 관리자가 남의 학교 학생을 고치고 지울 수 있었다**(2026-08-28 에 막음).

    `callerSchoolCode` 가 None 이면 마스터라 제한이 없다.
    **없는 학생과 남의 학교 학생에 같은 문구를 낸다** — 다르게 말하면 id 를 훑어
    남의 학교에 학생이 몇 명인지 셀 수 있다.
    """
    with sessionScope() as db:
        target = await repo_user.findById(studentId, db)
        if not target or target.role != "student":
            return "학생을 찾을 수 없습니다."
        if callerSchoolCode and target.school_code != callerSchoolCode:
            return "학생을 찾을 수 없습니다."
        return None
