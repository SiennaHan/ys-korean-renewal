from fastapi import APIRouter, Depends, HTTPException

from accepter import auth
from accepter.base import makeResponse
from accepter.game_content_models import (
    VocashotPresetCreate,
    VocashotPresetUpdate,
)
from business import vocashot

router = APIRouter()


@router.get("/presets")
async def list_presets():
    return makeResponse(await vocashot.getPresets())


@router.post("/presets", dependencies=[Depends(auth.MasterAdminRequired())])
async def create_preset(payload: VocashotPresetCreate):
    result, err = await vocashot.createPreset(payload.model_dump())
    if err is not None:
        raise HTTPException(status_code=400, detail=err)
    return makeResponse(result)


@router.patch("/presets/{preset_id}", dependencies=[Depends(auth.MasterAdminRequired())])
async def update_preset(preset_id: str, payload: VocashotPresetUpdate):
    result = await vocashot.updatePreset(
        preset_id, payload.model_dump(exclude_unset=True),
    )
    if result is None:
        raise HTTPException(status_code=404, detail="preset not found")
    return makeResponse(result)


@router.delete("/presets/{preset_id}", dependencies=[Depends(auth.MasterAdminRequired())])
async def delete_preset(preset_id: str):
    ok = await vocashot.deletePreset(preset_id)
    if not ok:
        raise HTTPException(status_code=404, detail="preset not found")
    return makeResponse({"id": preset_id})
