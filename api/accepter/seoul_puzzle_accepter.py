from fastapi import APIRouter, Depends, HTTPException

from accepter import auth
from accepter.base import makeResponse
from accepter.game_content_models import (
    SeoulPuzzleLocationCreate,
    SeoulPuzzleLocationUpdate,
    SeoulPuzzleStepCreate,
    SeoulPuzzleStepUpdate,
)
from business import seoul_puzzle

router = APIRouter()


@router.get("")
async def get_content():
    return makeResponse(await seoul_puzzle.getContent())


@router.get("/locations", dependencies=[Depends(auth.MasterAdminRequired())])
async def list_locations_for_edit():
    return makeResponse(await seoul_puzzle.listLocationsForEdit())


@router.get("/steps", dependencies=[Depends(auth.MasterAdminRequired())])
async def list_steps_for_edit():
    return makeResponse(await seoul_puzzle.listStepsForEdit())


@router.post("/locations", dependencies=[Depends(auth.MasterAdminRequired())])
async def create_location(payload: SeoulPuzzleLocationCreate):
    result, err = await seoul_puzzle.createLocation(payload.model_dump())
    if err is not None:
        raise HTTPException(status_code=400, detail=err)
    return makeResponse(result)


@router.post("/steps", dependencies=[Depends(auth.MasterAdminRequired())])
async def create_step(payload: SeoulPuzzleStepCreate):
    result, err = await seoul_puzzle.createStep(payload.model_dump())
    if err is not None:
        raise HTTPException(status_code=400, detail=err)
    return makeResponse(result)


@router.patch("/locations/{location_id}", dependencies=[Depends(auth.MasterAdminRequired())])
async def update_location(location_id: str, payload: SeoulPuzzleLocationUpdate):
    result = await seoul_puzzle.updateLocation(
        location_id, payload.model_dump(exclude_unset=True),
    )
    if result is None:
        raise HTTPException(status_code=404, detail="location not found")
    return makeResponse(result)


@router.patch("/steps/{step_id}", dependencies=[Depends(auth.MasterAdminRequired())])
async def update_step(step_id: int, payload: SeoulPuzzleStepUpdate):
    result = await seoul_puzzle.updateStep(
        step_id, payload.model_dump(exclude_unset=True),
    )
    if result is None:
        raise HTTPException(status_code=404, detail="step not found")
    return makeResponse(result)


@router.delete("/locations/{location_id}", dependencies=[Depends(auth.MasterAdminRequired())])
async def delete_location(location_id: str):
    ok = await seoul_puzzle.deleteLocation(location_id)
    if not ok:
        raise HTTPException(status_code=404, detail="location not found")
    return makeResponse({"id": location_id})


@router.delete("/steps/{step_id}", dependencies=[Depends(auth.MasterAdminRequired())])
async def delete_step(step_id: int):
    ok = await seoul_puzzle.deleteStep(step_id)
    if not ok:
        raise HTTPException(status_code=404, detail="step not found")
    return makeResponse({"id": step_id})
