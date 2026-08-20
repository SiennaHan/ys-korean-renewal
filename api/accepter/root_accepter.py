from fastapi import APIRouter

from accepter.base import makeResponse

router = APIRouter()

@router.get("/status")
async def status():
    return makeResponse('ok')