from fastapi import APIRouter, Depends, HTTPException

from accepter import auth
from accepter.base import makeResponse
from accepter.game_content_models import (
    ParticleSniperLessonCreate,
    ParticleSniperLessonUpdate,
    ParticleSniperLevelCreate,
    ParticleSniperLevelUpdate,
)
from business import particle_sniper

router = APIRouter()


@router.get("/levels")
async def list_levels():
    return makeResponse(await particle_sniper.getLevels())


@router.get("/sentences")
async def list_sentences():
    return makeResponse(await particle_sniper.getSentences())


@router.get("/lessons", dependencies=[Depends(auth.MasterAdminRequired())])
async def list_lessons_for_edit():
    return makeResponse(await particle_sniper.listLessonsForEdit())


@router.post("/levels", dependencies=[Depends(auth.MasterAdminRequired())])
async def create_level(payload: ParticleSniperLevelCreate):
    result, err = await particle_sniper.createLevel(payload.model_dump())
    if err is not None:
        raise HTTPException(status_code=400, detail=err)
    return makeResponse(result)


@router.post("/lessons", dependencies=[Depends(auth.MasterAdminRequired())])
async def create_lesson(payload: ParticleSniperLessonCreate):
    result, err = await particle_sniper.createLesson(payload.model_dump())
    if err is not None:
        raise HTTPException(status_code=400, detail=err)
    return makeResponse(result)


@router.patch("/levels/{level_id}", dependencies=[Depends(auth.MasterAdminRequired())])
async def update_level(level_id: str, payload: ParticleSniperLevelUpdate):
    result = await particle_sniper.updateLevel(
        level_id, payload.model_dump(exclude_unset=True),
    )
    if result is None:
        raise HTTPException(status_code=404, detail="level not found")
    return makeResponse(result)


@router.patch("/lessons/{lesson_id}", dependencies=[Depends(auth.MasterAdminRequired())])
async def update_lesson(lesson_id: int, payload: ParticleSniperLessonUpdate):
    result = await particle_sniper.updateLesson(
        lesson_id, payload.model_dump(exclude_unset=True),
    )
    if result is None:
        raise HTTPException(status_code=404, detail="lesson not found")
    return makeResponse(result)


@router.delete("/levels/{level_id}", dependencies=[Depends(auth.MasterAdminRequired())])
async def delete_level(level_id: str):
    ok = await particle_sniper.deleteLevel(level_id)
    if not ok:
        raise HTTPException(status_code=404, detail="level not found")
    return makeResponse({"id": level_id})


@router.delete("/lessons/{lesson_id}", dependencies=[Depends(auth.MasterAdminRequired())])
async def delete_lesson(lesson_id: int):
    ok = await particle_sniper.deleteLesson(lesson_id)
    if not ok:
        raise HTTPException(status_code=404, detail="lesson not found")
    return makeResponse({"id": lesson_id})
