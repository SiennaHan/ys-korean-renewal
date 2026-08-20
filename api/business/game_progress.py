import json
from datetime import datetime, timedelta, timezone

from fastapi.encoders import jsonable_encoder
from persistence.database import sessionScope
from persistence import repo_game_progress

KST = timezone(timedelta(hours=9))


async def saveProgress(userId: str, gameName: str, stageId: str, score, extra, completed: bool):
    extraData = json.dumps(extra, ensure_ascii=False) if extra is not None else None
    completedAt = datetime.now(KST).replace(tzinfo=None) if completed else None
    with sessionScope() as db:
        record = await repo_game_progress.upsert(userId, gameName, stageId, score, extraData, completedAt, db)
        return _serialize(record)


async def getProgress(userId: str, gameName: str):
    with sessionScope() as db:
        records = await repo_game_progress.findByGame(userId, gameName, db)
        return [_serialize(r) for r in records]


def _serialize(record):
    data = jsonable_encoder(record)
    if data.get("extra_data"):
        try:
            data["extra"] = json.loads(data["extra_data"])
        except (ValueError, TypeError):
            data["extra"] = None
    else:
        data["extra"] = None
    return data
