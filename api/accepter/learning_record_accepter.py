from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer
from business import learning_record

from accepter.base import LearningRecordRequest, makeResponse
from accepter import auth
from accepter.entitlement_guard import requireChapter

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


@router.post("", dependencies=[Depends(auth.JWTBearer())])
async def save_learning_record(req: LearningRecordRequest, token: str = Depends(oauth2_scheme)):
    await requireChapter(token, req.bookId, req.chapterSeq, req.menuType)
    userId = auth.getUserIdFrom(token)
    return makeResponse(await learning_record.saveRecord(
        userId, req.bookId, req.chapterSeq, req.menuType, req.questionId, req.selectedAnswer, req.isCorrect, req.sub, req.skipped, req.review
    ))


@router.get("/list", dependencies=[Depends(auth.JWTBearer())])
async def list_learning_records(bookId: int, chapterSeq: int, menuType: str, token: str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await learning_record.getRecords(userId, bookId, chapterSeq, menuType))


@router.get("/progress", dependencies=[Depends(auth.JWTBearer())])
async def get_learning_progress(bookId: int, chapterSeq: int, token: str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await learning_record.getProgress(userId, bookId, chapterSeq))
