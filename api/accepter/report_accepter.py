"""표현클립 신고 — DEV-02.

**둘 다 인증을 요구한다.** 게스트도 이 화면을 쓰므로 게스트 토큰이면 되지만,
토큰이 아예 없는 호출은 막는다 — 전에는 익명 요청이 그대로 통과했다
(clip_spec_v1 §06 · BLOCKERS.md §6-e).
"""
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer
from business import report

from accepter.base import  ReportItem,  makeResponse
from accepter import auth

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.post("", dependencies=[Depends(auth.JWTBearer())])
async def post_error_report(body: ReportItem, token: str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    result = await report.createReport(body, userId)
    return makeResponse(result)

@router.get("/list/{category}", dependencies=[Depends(auth.JWTBearer())])
async def list_error_report(category: str):
    list = await report.listReport(category)
    return makeResponse(list)
