from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.security import OAuth2PasswordBearer

from accepter import auth
from accepter.base import AdminCreateRequest, AdminUpdateRequest, makeResponse, makeError
from business import admin_business

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


@router.get("/list")
async def getAdminList(
    approved: Optional[bool] = Query(None),
    token: str = Depends(auth.AdminRequired()),
):
    roles = auth.getRolesFrom(token)
    school_code = auth.getSchoolCodeFrom(token)
    if "master_admin" in roles:
        data = await admin_business.getAdminList(approved)
    else:
        data = await admin_business.getAdminListBySchool(school_code)
    return makeResponse(data)


@router.post("")
async def createAdmin(
    body: AdminCreateRequest,
    token: str = Depends(auth.AdminRequired()),
):
    roles = auth.getRolesFrom(token)
    school_code = auth.getSchoolCodeFrom(token)

    if "master_admin" not in roles:
        if body.role != "student_admin":
            return makeError("학생 관리자만 생성할 수 있습니다.")
        body.school_code = school_code

    data, error = await admin_business.createAdmin(
        email=body.email,
        password=body.password,
        name=body.name,
        role=body.role,
        school_code=body.school_code,
    )
    if error:
        return makeError(error)
    return makeResponse(data)


@router.patch("/{adminId}/approve", dependencies=[Depends(auth.MasterAdminRequired())])
async def approveAdmin(adminId: int):
    data, error = await admin_business.approveAdmin(adminId)
    if error:
        return makeError(error)
    return makeResponse(data)


@router.patch("/{adminId}/reject", dependencies=[Depends(auth.MasterAdminRequired())])
async def rejectAdmin(adminId: int):
    data, error = await admin_business.rejectAdmin(adminId)
    if error:
        return makeError(error)
    return makeResponse(data)


@router.patch("/{adminId}")
async def updateAdmin(
    adminId: int,
    body: AdminUpdateRequest,
    token: str = Depends(auth.AdminRequired()),
):
    roles = auth.getRolesFrom(token)
    school_code = auth.getSchoolCodeFrom(token)

    if "master_admin" not in roles:
        allowed, err = await admin_business.checkSchoolAdminPermission(adminId, school_code)
        if not allowed:
            return makeError(err)
        if body.role and body.role != "student_admin":
            return makeError("학생 관리자 권한만 설정할 수 있습니다.")
        if body.school_code:
            body.school_code = school_code

    updates = body.model_dump(exclude_none=True)
    data, error = await admin_business.updateAdmin(adminId, updates)
    if error:
        return makeError(error)
    return makeResponse(data)


@router.delete("/{adminId}")
async def deleteAdmin(
    adminId: int,
    token: str = Depends(auth.AdminRequired()),
):
    roles = auth.getRolesFrom(token)
    school_code = auth.getSchoolCodeFrom(token)

    if "master_admin" not in roles:
        allowed, err = await admin_business.checkSchoolAdminPermission(adminId, school_code)
        if not allowed:
            return makeError(err)

    data, error = await admin_business.deleteAdmin(adminId)
    if error:
        return makeError(error)
    return makeResponse(data)
