from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer
from business import flashcard

from accepter.base import UserFlashcardRequest, UserFlashcardWordRequest, UserFlashcardStatusRequest, makeResponse
from accepter import auth

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# flashcard
@router.post("", dependencies=[Depends(auth.JWTBearer())])
async def create_user_flashcard(req: UserFlashcardRequest, token:str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await flashcard.createUserFlashcard(req, userId))


@router.get("/book/{bookId}", dependencies=[Depends(auth.JWTBearer())])
async def list_user_flashcard(bookId: int, token:str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await flashcard.listUserFlashcard(bookId, userId))

# word
@router.post("/word", dependencies=[Depends(auth.JWTBearer())])
async def create_user_flashcard_word(req: UserFlashcardWordRequest, token:str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await flashcard.createUserFlashcardWord(req, userId))

@router.get("/word/{flashcardId}", dependencies=[Depends(auth.JWTBearer())])
async def list_user_flashcard_word(flashcardId: int, token:str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await flashcard.listUserFlashcardWord(flashcardId, userId))

# upsert word (put = upsert)
@router.put("/word", dependencies=[Depends(auth.JWTBearer())])
async def upsert_user_flashcard_word(req: UserFlashcardWordRequest, token:str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await flashcard.upsertUserFlashcardWord(req, userId))

# update flashcard status
@router.patch("/status", dependencies=[Depends(auth.JWTBearer())])
async def update_user_flashcard_status(req: UserFlashcardStatusRequest, token:str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await flashcard.updateUserFlashcardStatus(req.flashcardId, req.cardType, req.status, userId))

# delete flashcard (for restart)
@router.delete("/{flashcardId}/{cardType}", dependencies=[Depends(auth.JWTBearer())])
async def delete_user_flashcard(flashcardId: int, cardType: str, token:str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await flashcard.deleteUserFlashcard(flashcardId, cardType, userId))

# list words by type
@router.get("/word/{flashcardId}/{cardType}", dependencies=[Depends(auth.JWTBearer())])
async def list_user_flashcard_word_by_type(flashcardId: int, cardType: str, token:str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await flashcard.listUserFlashcardWordByType(flashcardId, cardType, userId))

# get single flashcard
@router.get("/{flashcardId}/{cardType}", dependencies=[Depends(auth.JWTBearer())])
async def get_user_flashcard(flashcardId: int, cardType: str, token:str = Depends(oauth2_scheme)):
    userId = auth.getUserIdFrom(token)
    return makeResponse(await flashcard.getUserFlashcard(flashcardId, cardType, userId))