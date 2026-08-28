from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from fastapi.security import OAuth2PasswordBearer

from accepter import auth
from accepter.base import (StudentAccessRequest, StudentBatchRequest, StudentUpdateRequest,
                           StudentWithdrawRequest, makeError, makeResponse)
from business import student_business

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


def _mySchool(token, requested):
    """마스터가 아니면 **토큰의 학교로 덮는다.** `(학교코드, 오류)`.

    **검사가 아니라 덮어쓰기다.** "요청의 school_code 가 내 학교와 같은지" 를
    검사하는 방식이면 필드가 늘 때마다 검사를 빠뜨린다 — 실제로 batch·upload 가
    그렇게 뚫려 있었다(2026-08-28 에 막았다. 그 전까지 아무 학교 관리자가 남의
    학교 학생을 만들고 고치고 지울 수 있었다).

    **`student_admin` 도 여기 걸린다.** `AdminRequired` 는 그 역할도 통과시키는데
    전에는 `school_admin` 만 덮어써서 학생 관리자는 남의 학교를 볼 수 있었다.
    """
    roles = auth.getRolesFrom(token)
    if "master_admin" in roles:
        return requested, None
    mine = auth.getSchoolCodeFrom(token)
    if not mine:
        return None, "소속 학교가 없는 계정입니다. 마스터 관리자에게 문의하세요."
    return mine, None



@router.get("/list", dependencies=[Depends(auth.AdminRequired())])
async def getStudentList(
    school_code: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    token: str = Depends(oauth2_scheme)
):
    school_code, error = _mySchool(token, school_code)
    if error:
        return makeError(error)
    data = await student_business.getStudentList(school_code, search)
    return makeResponse(data)


@router.get("/instructors", dependencies=[Depends(auth.AdminRequired())])
async def getInstructors(
    school_code: str = Query(...),
):
    data = await student_business.getInstructors(school_code)
    return makeResponse(data)


@router.post("/batch", dependencies=[Depends(auth.AdminRequired())])
async def createStudentBatch(body: StudentBatchRequest, token: str = Depends(oauth2_scheme)):
    schoolCode, error = _mySchool(token, body.school_code)
    if error:
        return makeError(error)
    data = await student_business.createStudentBatch(schoolCode, body.students)
    return makeResponse(data)


@router.post("/upload", dependencies=[Depends(auth.AdminRequired())])
async def uploadStudents(
    school_code: str = Form(...),
    file: UploadFile = File(...),
    token: str = Depends(oauth2_scheme)
):
    if not file.filename.endswith(('.xlsx', '.xls')):
        return makeError("엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.")

    school_code, error = _mySchool(token, school_code)
    if error:
        return makeError(error)
    fileBytes = await file.read()
    data = await student_business.createStudentsFromExcel(school_code, fileBytes)
    return makeResponse(data)


# ── 고정 경로를 먼저 등록한다 ──
#
# **순서가 중요하다.** FastAPI 는 등록 순서로 맞추므로 `/{studentId}` 가 먼저
# 있으면 `/student/access` 가 그리로 먹혀 `studentId="access"` 로 422 가 난다
# (2026-08-28 에 실제로 그렇게 났다 — 붙이고 나서 불러 보고 알았다).

@router.patch("/access", dependencies=[Depends(auth.AdminRequired())])
async def setStudentAccess(body: StudentAccessRequest, token: str = Depends(oauth2_scheme)):
    """학교 이용 권한을 끊거나 되살린다 — 학기 종료의 기본 동작이다.

    **`is_active` 를 건드리지 않는다.** 그 칸을 내리면 로그인이 막혀
    「학기가 끝났습니다」라고 설명할 기회가 없다(`ko_user.access_ended_at` 주석).
    끊으면 다음 요청부터 무료 범위로 내려가고 지난 기록은 그대로 보인다.
    """
    mySchool, error = _mySchool(token, None)
    if error:
        return makeError(error)
    data, error = await student_business.setAccess(body.student_ids, body.ended, mySchool)
    if error:
        return makeError(error)
    return makeResponse(data)


@router.post("/withdraw", dependencies=[Depends(auth.AdminRequired())])
async def withdrawStudents(body: StudentWithdrawRequest, token: str = Depends(oauth2_scheme)):
    """학생을 탈퇴시킨다 — **되돌릴 수 없다.**

    `DELETE /student/{id}` 와 다르다. 저쪽은 `ko_user` 행만 지워 학습 기록이
    고아로 남는다. 이 길은 학생이 스스로 탈퇴할 때와 같은 범위를 지운다.
    """
    mySchool, error = _mySchool(token, None)
    if error:
        return makeError(error)
    data, error = await student_business.withdrawStudents(body.student_ids, mySchool)
    if error:
        return makeError(error)
    return makeResponse(data)


@router.patch("/{studentId}", dependencies=[Depends(auth.AdminRequired())])
async def updateStudent(studentId: int, body: StudentUpdateRequest, token: str = Depends(oauth2_scheme)):
    mySchool, error = _mySchool(token, None)
    if error:
        return makeError(error)
    # 마스터는 mySchool 이 None 이라 제한이 없다
    error = await student_business.checkStudentSchool(studentId, mySchool)
    if error:
        return makeError(error)
    updates = body.model_dump(exclude_none=True)
    data, error = await student_business.updateStudent(studentId, updates)
    if error:
        return makeError(error)
    return makeResponse(data)


@router.delete("/{studentId}", dependencies=[Depends(auth.AdminRequired())])
async def deleteStudent(studentId: int, token: str = Depends(oauth2_scheme)):
    mySchool, error = _mySchool(token, None)
    if error:
        return makeError(error)
    # 마스터는 mySchool 이 None 이라 제한이 없다
    error = await student_business.checkStudentSchool(studentId, mySchool)
    if error:
        return makeError(error)
    data, error = await student_business.deleteStudent(studentId)
    if error:
        return makeError(error)
    return makeResponse(data)
