from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer

from accepter import auth
from accepter.base import SchoolCreateRequest, SchoolUpdateRequest, ClassLevelCreateRequest, ClassLevelUpdateRequest, makeResponse, makeError
from business import school_business

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


@router.get("/list", dependencies=[Depends(auth.AdminRequired())])
async def getSchoolList():
    data = await school_business.getSchoolList()
    return makeResponse(data)


@router.post("", dependencies=[Depends(auth.MasterAdminRequired())])
async def createSchool(body: SchoolCreateRequest):
    data, error = await school_business.createSchool(body.school_code, body.school_name, body.class_levels)
    if error:
        return makeError(error)
    return makeResponse(data)


# ── ClassLevel ──

@router.get("/{schoolId}/class-levels", dependencies=[Depends(auth.AdminRequired())])
async def getClassLevels(schoolId: int):
    data, error = await school_business.getClassLevels(schoolId)
    if error:
        return makeError(error)
    return makeResponse(data)


@router.post("/{schoolId}/class-levels", dependencies=[Depends(auth.MasterAdminRequired())])
async def createClassLevel(schoolId: int, body: ClassLevelCreateRequest):
    data, error = await school_business.createClassLevel(schoolId, body.label)
    if error:
        return makeError(error)
    return makeResponse(data)


@router.patch("/class-levels/{classLevelId}", dependencies=[Depends(auth.MasterAdminRequired())])
async def updateClassLevel(classLevelId: int, body: ClassLevelUpdateRequest):
    data, error = await school_business.updateClassLevel(classLevelId, body.label)
    if error:
        return makeError(error)
    return makeResponse(data)


# ── School CRUD ──

@router.patch("/{schoolId}", dependencies=[Depends(auth.MasterAdminRequired())])
async def updateSchool(schoolId: int, body: SchoolUpdateRequest):
    updates = body.model_dump(exclude_none=True)
    data, error = await school_business.updateSchool(schoolId, updates)
    if error:
        return makeError(error)
    return makeResponse(data)


@router.delete("/{schoolId}", dependencies=[Depends(auth.MasterAdminRequired())])
async def deleteSchool(schoolId: int):
    data, error = await school_business.deleteSchool(schoolId)
    if error:
        return makeError(error)
    return makeResponse(data)
