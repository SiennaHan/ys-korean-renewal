"""다시 풀기 목록 — dev_spec_v1 §3

  GET    /review-queue        ?scope=home|activity — home 은 available_at 이 지난 것만
  DELETE /review-queue/{id}   다시 풀기에서 맞혔을 때. 자동 제거도 있다(learning-record)

자동 제거를 권장한 이유는 왕복을 줄이는 것이다(§3). 그래서 POST /learning-record 가
isCorrect=true 면 서버가 알아서 지운다 — 이 DELETE 는 그 밖의 경우를 위한 것이다.
"""
from typing import Optional

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer

from accepter import auth
from accepter.base import makeResponse
from business import review_queue

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


@router.get("", dependencies=[Depends(auth.JWTBearer())])
async def list_review_queue(
    scope: str = "home",
    bookId: Optional[int] = None,
    chapterSeq: Optional[int] = None,
    menuType: Optional[str] = None,
    sub: int = 0,
    token: str = Depends(oauth2_scheme),
):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await review_queue.listQueue(
        userId, scope, bookId, chapterSeq, menuType, sub
    ))


@router.delete("/{rowId}", dependencies=[Depends(auth.JWTBearer())])
async def delete_review_queue(rowId: int, token: str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await review_queue.removeOne(userId, rowId))
