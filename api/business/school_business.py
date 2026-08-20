from fastapi.encoders import jsonable_encoder

from persistence.database import sessionScope
from persistence import repo_school, repo_class_level, model


async def getSchoolList():
    with sessionScope() as db:
        schools = await repo_school.findAll(db)
        return jsonable_encoder(schools)


async def createSchool(schoolCode: str, schoolName: str, classLevels: str = None):
    with sessionScope() as db:
        existing = await repo_school.findByCode(schoolCode, db)
        if existing:
            return None, "이미 등록된 학교 코드입니다."

        school = model.KoSchool()
        school.school_code = schoolCode
        school.school_name = schoolName
        school.class_levels = classLevels

        created = await repo_school.createSchool(school, db)
        return jsonable_encoder(created), None


async def updateSchool(schoolId: int, updates: dict):
    with sessionScope() as db:
        updated = await repo_school.updateSchool(schoolId, updates, db)
        if not updated:
            return None, "학교를 찾을 수 없습니다."
        return jsonable_encoder(updated), None


async def deleteSchool(schoolId: int):
    with sessionScope() as db:
        deleted = await repo_school.deleteSchool(schoolId, db)
        if not deleted:
            return None, "학교를 찾을 수 없습니다."
        return {"success": True}, None


# ── ClassLevel ──

async def getClassLevels(schoolId: int):
    with sessionScope() as db:
        school = await repo_school.findById(schoolId, db)
        if not school:
            return None, "학교를 찾을 수 없습니다."
        levels = await repo_class_level.findBySchoolId(schoolId, db)
        return jsonable_encoder(levels), None


async def createClassLevel(schoolId: int, label: str):
    with sessionScope() as db:
        school = await repo_school.findById(schoolId, db)
        if not school:
            return None, "학교를 찾을 수 없습니다."

        cl = model.KoClassLevel()
        cl.school_id = schoolId
        cl.label = label

        created = await repo_class_level.create(cl, db)
        return jsonable_encoder(created), None


async def updateClassLevel(classLevelId: int, label: str):
    with sessionScope() as db:
        updated = await repo_class_level.update(classLevelId, label, db)
        if not updated:
            return None, "반 정보를 찾을 수 없습니다."
        return jsonable_encoder(updated), None
