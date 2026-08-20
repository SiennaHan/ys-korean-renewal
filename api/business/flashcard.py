from fastapi.encoders import jsonable_encoder
from accepter.base import UserFlashcardRequest, UserFlashcardWordRequest
from persistence.database import sessionScope
from persistence import repo_flashcard

async def listUserFlashcard(bookId: int, userId: str):
    with sessionScope() as db:
        encodedList = []
        flashcardList = await repo_flashcard.listUserFlashcard(userId, bookId, db)
        for flashcard in flashcardList :
            encodedList.append(jsonable_encoder(flashcard))

    return encodedList

async def getUserFlashcard(flashcardId: int, cardType: str, userId: str):
     with sessionScope() as db:
        flashCard = await repo_flashcard.getUserFlashcard(userId, flashcardId, cardType, db)        
        return jsonable_encoder(flashCard)

async def createUserFlashcard(req: UserFlashcardRequest, userId: str):
    with sessionScope() as db:
        flashCard = await repo_flashcard.createUserFlashcard(userId, 
                                                req.bookId, 
                                                req.flashcardId, 
                                                req.cardType,
                                                db)        
        return jsonable_encoder(flashCard)

async def listUserFlashcardWord(flashcardId: int, userId: str):
    with sessionScope() as db:
        encodedList = []
        wordList = await repo_flashcard.listUserFlashcardWord(userId, flashcardId, db)
        for word in wordList:
            encodedList.append(jsonable_encoder(word))

    return encodedList

async def createUserFlashcardWord(req: UserFlashcardWordRequest, userId: str):
    with sessionScope() as db:
        await repo_flashcard.createUserFlashcardWord(userId,
                                                req.flashcardId,
                                                req.cardType,
                                                req.cardId,
                                                req.status,
                                                db)
        return 'ok'

async def upsertUserFlashcardWord(req: UserFlashcardWordRequest, userId: str):
    with sessionScope() as db:
        word = await repo_flashcard.upsertUserFlashcardWord(userId,
                                                req.flashcardId,
                                                req.cardType,
                                                req.cardId,
                                                req.status,
                                                db)
        return jsonable_encoder(word)

async def updateUserFlashcardStatus(flashcardId: int, cardType: str, status: str, userId: str):
    with sessionScope() as db:
        result = await repo_flashcard.updateUserFlashcardStatus(userId, flashcardId, cardType, status, db)
        return jsonable_encoder(result)

async def deleteUserFlashcard(flashcardId: int, cardType: str, userId: str):
    with sessionScope() as db:
        await repo_flashcard.deleteUserFlashcard(userId, flashcardId, cardType, db)
        return 'ok'

async def listUserFlashcardWordByType(flashcardId: int, cardType: str, userId: str):
    with sessionScope() as db:
        encodedList = []
        wordList = await repo_flashcard.listUserFlashcardWordByType(userId, flashcardId, cardType, db)
        for word in wordList:
            encodedList.append(jsonable_encoder(word))
    return encodedList