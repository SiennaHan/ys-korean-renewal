from fastapi import APIRouter, Depends, HTTPException

from accepter import auth
from accepter.base import makeResponse
from accepter.game_content_models import (
    SpringPicnicFriendCreate,
    SpringPicnicFriendUpdate,
    SpringPicnicQuestionCreate,
    SpringPicnicQuestionUpdate,
)
from business import spring_picnic

router = APIRouter()


@router.get("/friends")
async def list_friends():
    return makeResponse(await spring_picnic.getFriends())


@router.get("/questions")
async def list_questions():
    return makeResponse(await spring_picnic.getQuestions())


@router.post("/friends", dependencies=[Depends(auth.MasterAdminRequired())])
async def create_friend(payload: SpringPicnicFriendCreate):
    result, err = await spring_picnic.createFriend(payload.model_dump())
    if err is not None:
        raise HTTPException(status_code=400, detail=err)
    return makeResponse(result)


@router.post("/questions", dependencies=[Depends(auth.MasterAdminRequired())])
async def create_question(payload: SpringPicnicQuestionCreate):
    result, err = await spring_picnic.createQuestion(payload.model_dump())
    if err is not None:
        raise HTTPException(status_code=400, detail=err)
    return makeResponse(result)


@router.patch("/friends/{friend_id}", dependencies=[Depends(auth.MasterAdminRequired())])
async def update_friend(friend_id: str, payload: SpringPicnicFriendUpdate):
    result = await spring_picnic.updateFriend(
        friend_id, payload.model_dump(exclude_unset=True),
    )
    if result is None:
        raise HTTPException(status_code=404, detail="friend not found")
    return makeResponse(result)


@router.patch("/questions/{question_id}", dependencies=[Depends(auth.MasterAdminRequired())])
async def update_question(question_id: str, payload: SpringPicnicQuestionUpdate):
    result = await spring_picnic.updateQuestion(
        question_id, payload.model_dump(exclude_unset=True),
    )
    if result is None:
        raise HTTPException(status_code=404, detail="question not found")
    return makeResponse(result)


@router.delete("/friends/{friend_id}", dependencies=[Depends(auth.MasterAdminRequired())])
async def delete_friend(friend_id: str):
    ok = await spring_picnic.deleteFriend(friend_id)
    if not ok:
        raise HTTPException(status_code=404, detail="friend not found")
    return makeResponse({"id": friend_id})


@router.delete("/questions/{question_id}", dependencies=[Depends(auth.MasterAdminRequired())])
async def delete_question(question_id: str):
    ok = await spring_picnic.deleteQuestion(question_id)
    if not ok:
        raise HTTPException(status_code=404, detail="question not found")
    return makeResponse({"id": question_id})
