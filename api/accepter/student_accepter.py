from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from fastapi.security import OAuth2PasswordBearer

from accepter import auth
from accepter.base import StudentBatchRequest, StudentUpdateRequest, makeResponse, makeError
from business import student_business

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


@router.get("/list", dependencies=[Depends(auth.AdminRequired())])
async def getStudentList(
    school_code: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    token: str = Depends(oauth2_scheme)
):
    roles = auth.getRolesFrom(token)
    # school_admin은 자신의 학교 학생만 조회 (query param 무시)
    if "school_admin" in roles and "master_admin" not in roles:
        school_code = auth.getSchoolCodeFrom(token)
    data = await student_business.getStudentList(school_code, search)
    return makeResponse(data)


@router.get("/instructors", dependencies=[Depends(auth.AdminRequired())])
async def getInstructors(
    school_code: str = Query(...),
):
    data = await student_business.getInstructors(school_code)
    return makeResponse(data)


@router.post("/batch", dependencies=[Depends(auth.AdminRequired())])
async def createStudentBatch(body: StudentBatchRequest):
    data = await student_business.createStudentBatch(body.school_code, body.students)
    return makeResponse(data)


@router.post("/upload", dependencies=[Depends(auth.AdminRequired())])
async def uploadStudents(
    school_code: str = Form(...),
    file: UploadFile = File(...)
):
    if not file.filename.endswith(('.xlsx', '.xls')):
        return makeError("엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.")

    fileBytes = await file.read()
    data = await student_business.createStudentsFromExcel(school_code, fileBytes)
    return makeResponse(data)


@router.patch("/{studentId}", dependencies=[Depends(auth.AdminRequired())])
async def updateStudent(studentId: int, body: StudentUpdateRequest):
    updates = body.model_dump(exclude_none=True)
    data, error = await student_business.updateStudent(studentId, updates)
    if error:
        return makeError(error)
    return makeResponse(data)


@router.delete("/{studentId}", dependencies=[Depends(auth.AdminRequired())])
async def deleteStudent(studentId: int):
    data, error = await student_business.deleteStudent(studentId)
    if error:
        return makeError(error)
    return makeResponse(data)
