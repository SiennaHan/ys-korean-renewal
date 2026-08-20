from sqlalchemy import text
from sqlalchemy.orm import Session

from persistence import model
from util import timeutils

async def getFeedback(feedbackId: int, userId: str, db: Session) :
    query = db.query(model.KoChatFeedback)
    query = query.filter(model.KoChatFeedback.user_id == userId, model.KoChatFeedback.id == feedbackId)
    return query.first()

async def listFeedback(chatId: str, db: Session) :
    query = db.query(model.KoChatFeedback)
    query = query.filter(model.KoChatFeedback.chat_id == chatId)
    return query.all()

async def createFeedback(chatId: int, userId: str, question: str, feedback: str, db: Session):
    feed = model.KoChatFeedback()
    feed.user_id = userId
    feed.chat_id = chatId
    feed.question = question
    feed.answer = feedback
    feed.created_at = timeutils.now()
    db.add(feed)
