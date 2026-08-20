from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer
from business import report

from accepter.base import  ReportItem,  makeResponse
from accepter import auth

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.post("")
async def post_error_report(body: ReportItem):
    result = await report.createReport(body)
    return makeResponse(result)

@router.get("/list/{category}")
async def list_error_report(category: str):
    list = await report.listReport(category)
    return makeResponse(list)