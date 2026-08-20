from datetime import datetime
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from persistence import model


async def findByGame(userId: str, gameName: str, db: Session):
    return db.query(model.KoGameProgress).filter(
        model.KoGameProgress.user_id == userId,
        model.KoGameProgress.game_name == gameName,
    ).all()


async def findOne(userId: str, gameName: str, stageId: str, db: Session):
    return db.query(model.KoGameProgress).filter(
        model.KoGameProgress.user_id == userId,
        model.KoGameProgress.game_name == gameName,
        model.KoGameProgress.stage_id == stageId,
    ).first()


async def upsert(userId: str, gameName: str, stageId: str, score, extraData, completedAt, db: Session):
    existing = await findOne(userId, gameName, stageId, db)
    if existing:
        if score is not None:
            existing.score = score if existing.score is None else max(existing.score, score)
        if extraData is not None:
            existing.extra_data = extraData
        if completedAt is not None and existing.completed_at is None:
            existing.completed_at = completedAt
        db.flush()
        return existing

    record = model.KoGameProgress()
    record.user_id = userId
    record.game_name = gameName
    record.stage_id = stageId
    record.score = score
    record.extra_data = extraData
    record.completed_at = completedAt
    db.add(record)
    try:
        db.flush()
        db.refresh(record)
    except IntegrityError:
        db.rollback()
        existing = await findOne(userId, gameName, stageId, db)
        if existing:
            if score is not None:
                existing.score = score if existing.score is None else max(existing.score, score)
            if extraData is not None:
                existing.extra_data = extraData
            db.flush()
            return existing
        raise
    return record
