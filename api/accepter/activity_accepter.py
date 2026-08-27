"""활동 상태 — dev_spec_v1 §3

  POST  /activity/enter      진입. 없으면 in_progress 로 만들고 currentItemIndex 를 낸다
  PATCH /activity/progress   문항 이동마다. ✕ 로 나갈 때도 부른다
  POST  /activity/complete   마지막 문항 응답. 잔여 다시 풀기 수를 같이 낸다
  GET   /activity/chapter    한 과의 상태 전부 (교재학습 목록의 done 표시)
"""
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer

from accepter import auth
from accepter.entitlement_guard import requireChapter
from accepter.base import (
    ActivityCompleteRequest,
    ActivityEnterRequest,
    ActivityProgressRequest,
    makeResponse,
)
from business import activity_state

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


@router.post("/enter", dependencies=[Depends(auth.JWTBearer())])
async def enter_activity(req: ActivityEnterRequest, token: str = Depends(oauth2_scheme)):
    await requireChapter(token, req.bookId, req.chapterSeq, req.menuType)
    userId = auth.getUserIdFrom(token)
    return makeResponse(await activity_state.enter(
        userId, req.bookId, req.chapterSeq, req.menuType, req.sub, req.totalItems
    ))


@router.patch("/progress", dependencies=[Depends(auth.JWTBearer())])
async def save_activity_progress(req: ActivityProgressRequest, token: str = Depends(oauth2_scheme)):
    await requireChapter(token, req.bookId, req.chapterSeq, req.menuType)
    userId = auth.getUserIdFrom(token)
    return makeResponse(await activity_state.saveProgress(
        userId, req.bookId, req.chapterSeq, req.menuType, req.sub, req.currentItemIndex
    ))


@router.post("/complete", dependencies=[Depends(auth.JWTBearer())])
async def complete_activity(req: ActivityCompleteRequest, token: str = Depends(oauth2_scheme)):
    await requireChapter(token, req.bookId, req.chapterSeq, req.menuType)
    userId = auth.getUserIdFrom(token)
    return makeResponse(await activity_state.complete(
        userId, req.bookId, req.chapterSeq, req.menuType, req.sub,
        req.answeredCount, req.gradedCount, req.correctCount,
    ))


@router.get("/chapter", dependencies=[Depends(auth.JWTBearer())])
async def get_chapter_states(bookId: int, chapterSeq: int, token: str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await activity_state.getChapter(userId, bookId, chapterSeq))
