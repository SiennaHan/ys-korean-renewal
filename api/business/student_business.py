import io
import openpyxl
from fastapi.encoders import jsonable_encoder

from business.auth_business import hashPassword
from persistence.database import sessionScope
from datetime import datetime, timezone

from persistence import model, repo_activity_state, repo_daily_activity, repo_user


async def getStudentList(schoolCode: str = None, search: str = None):
    """학생 목록. **가입일·활동 합계·진도를 같이 낸다** (기획 2026-08-28).

    학기 종료 판단을 이 한 화면에서 하도록 합쳐 둔 것이다 — 누가 언제 가입해
    얼마나 했는지를 보고 접근을 끊거나 탈퇴시킨다.

    보이는 범위는 **합계 + 급·과 진도**까지다(기획 확정). 문항 단위(무엇을 틀렸나)는
    내지 않는다 — 개인정보 처리방침의 「소속 기관에 대한 학습 현황 제공」이
    어디까지인지 아직 조문으로 안 정해졌다(`legal_draft_v1` 제3조).
    """
    with sessionScope() as db:
        if schoolCode:
            students = await repo_user.findStudentsBySchoolCode(schoolCode, db, search)
        else:
            students = await repo_user.findAllStudents(db, search)
        rows = jsonable_encoder(students)
        ids = [r["id"] for r in rows]
        # 학생 수만큼 질의를 돌리지 않는다 — 표별로 한 번씩 묶어서 센다
        activity = await repo_daily_activity.summaryByUsers(ids, db)
        progress = await repo_activity_state.progressByUsers(ids, db)

    for r in rows:
        key = str(r["id"])
        a = activity.get(key) or {}
        p = progress.get(key) or {}
        r["activeDays"] = a.get("activeDays", 0)
        r["studySeconds"] = a.get("studySeconds", 0)
        r["modulesDone"] = a.get("modulesDone", 0)
        r["lastActiveDate"] = a.get("lastActiveDate")
        r["completedActivities"] = p.get("completed", 0)
        r["lastBook"] = p.get("lastBook")
        r["lastChapter"] = p.get("lastChapter")
    return rows


async def setAccess(studentIds: list, ended: bool, callerSchoolCode: str = None):
    """학교 이용 권한을 끊거나 되살린다. 끊는 것이 **학기 종료의 기본 동작**이다.

    `is_active` 를 쓰지 않는 이유는 `ko_user.access_ended_at` 의 주석에 있다 —
    그 칸을 내리면 로그인 자체가 막혀서 「학기가 끝났다」고 설명할 기회가 없다.

    **되돌릴 수 있다.** 다음 학기에 다시 등록하는 학생은 이 칸만 비우면
    풀이 데이터를 그대로 안고 돌아온다.
    """
    if not studentIds:
        return None, "학생을 선택해 주세요."
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    changed, skipped = [], []
    with sessionScope() as db:
        for sid in studentIds:
            user = await repo_user.findById(int(sid), db)
            # **없는 학생과 남의 학교 학생을 같은 취급으로 건너뛴다** — 다르게
            # 말하면 id 를 훑어 남의 학교에 학생이 몇 명인지 셀 수 있다
            if not user or user.role != "student":
                skipped.append(sid); continue
            if callerSchoolCode and user.school_code != callerSchoolCode:
                skipped.append(sid); continue
            user.access_ended_at = now if ended else None
            changed.append(sid)
        db.flush()
    return {"changed": changed, "skipped": skipped, "endedAt": jsonable_encoder(now) if ended else None}, None


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
    """학생 하나를 지운다 — **탈퇴와 같은 범위다.**

    전에는 `repo_user.deleteUser` 로 **`ko_user` 행만** 지웠다. 어드민 화면의
    「삭제」 버튼이 이 길을 쓰는데, 그러면 학습 기록·복습 큐·대화·음성이
    주인 없이 남았다 — 2026-08-28 에 실제로 재현했다(고아 4행).
    지금은 `user_withdraw.withdrawByAdmin` 을 부른다. 학생이 스스로 탈퇴할 때와
    같은 범위(`shared/withdrawal_scope.py`)를 지운다.

    **누구를 지울 수 있는지는 부르는 쪽이 이미 가렸다** — `checkStudentSchool`.
    """
    from business import user_withdraw

    data, error = await user_withdraw.withdrawByAdmin(str(studentId))
    if error:
        return None, error
    return {"success": True, "deleted": data.get("deleted"),
            "fileDeleteFailed": data.get("file_delete_failed", 0)}, None


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


async def withdrawStudents(studentIds: list, callerSchoolCode: str = None):
    """학생을 탈퇴시킨다 — **되돌릴 수 없다.**

    지우는 범위는 학생이 스스로 탈퇴할 때와 똑같다
    (`user_withdraw.purgeAccount` · `shared/withdrawal_scope.py`) — 학습 기록 12개 표 ·
    S3 음성 · 문의와 첨부까지다. 전에 어드민의 `DELETE /student/{id}` 는
    **`ko_user` 행만** 지워서 나머지가 고아로 남았다(2026-08-28 에 이 길을 만들었다).

    **기본 동작이 아니다**(기획 2026-08-28) — 학기가 끝나면 `setAccess` 로 접근만
    끊고 데이터는 남긴다. 다음 학기에 재등록하는 학생의 풀이 데이터가 남아 있는
    편이 낫다. 이 길은 "너무 오래 안 들어온 학생을 정리해야 할 때" 를 위한 것이다.
    **자동 탈퇴는 두지 않는다** — 사람이 고를 때만 돈다.
    """
    if not studentIds:
        return None, "학생을 선택해 주세요."

    from business import user_withdraw

    done, skipped, failed = [], [], []
    for sid in studentIds:
        # 학교 범위는 매번 다시 본다 — 앞의 탈퇴가 목록을 바꿀 수 있다
        error = await checkStudentSchool(int(sid), callerSchoolCode)
        if error:
            skipped.append(sid)
            continue
        data, err = await user_withdraw.withdrawByAdmin(str(sid))
        if err:
            failed.append({"id": sid, "error": err})
        else:
            done.append({"id": sid, "deleted": data.get("deleted"),
                         "fileDeleteFailed": data.get("file_delete_failed", 0)})
    return {"withdrawn": done, "skipped": skipped, "failed": failed}, None
