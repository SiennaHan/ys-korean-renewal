from enum import Enum
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from accepter import auth
from accepter.base import makeResponse
from business import qr_admin, qr_tracking


router = APIRouter()


class RedirectResult(str, Enum):
    web_redirect = "web_redirect"
    failed = "failed"


class RedirectResultRequest(BaseModel):
    result: RedirectResult


class QrScanRequest(BaseModel):
    accessUrl: Optional[str] = None


@router.post("/scan")
async def create_qr_scan(request: Request, body: Optional[QrScanRequest] = None):
    data = await qr_tracking.record_scan(
        headers={key.lower(): value for key, value in request.headers.items()},
        client_host=request.client.host if request.client else None,
        access_url=body.accessUrl if body else None,
    )
    return makeResponse(data)


@router.patch("/scan/{tracking_id}/redirect")
async def update_qr_redirect(tracking_id: str, body: RedirectResultRequest):
    updated = await qr_tracking.record_redirect_result(tracking_id, body.result.value)
    if not updated:
        raise HTTPException(status_code=404, detail="QR scan not found")
    return makeResponse({"updated": True})


@router.post("/scan/{tracking_id}/redirect/{redirect_result}")
async def beacon_qr_redirect(tracking_id: str, redirect_result: RedirectResult):
    """Simple POST endpoint for sendBeacon during native-app navigation."""
    updated = await qr_tracking.record_redirect_result(tracking_id, redirect_result.value)
    if not updated:
        raise HTTPException(status_code=404, detail="QR scan not found")
    return makeResponse({"updated": True})


@router.get("/admin/stats", dependencies=[Depends(auth.MasterAdminRequired())])
async def get_qr_admin_stats(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    return makeResponse(await qr_admin.get_stats(days, limit, offset))
