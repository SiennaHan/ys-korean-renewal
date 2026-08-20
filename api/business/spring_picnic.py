import json

from persistence.database import sessionScope
from persistence import repo_spring_picnic, model


async def createFriend(payload: dict) -> tuple[dict | None, str | None]:
    friendId = (payload.get("id") or "").strip()
    if not friendId:
        return None, "id가 필요합니다"
    with sessionScope() as db:
        existing = db.query(model.KoSpringPicnicFriend).filter(
            model.KoSpringPicnicFriend.id == friendId
        ).first()
        if existing:
            return None, "이미 존재하는 id입니다"
        row = model.KoSpringPicnicFriend(
            id=friendId,
            face=payload.get("face", ""),
            name=payload.get("name", ""),
            bg=payload.get("bg", "#000000"),
            cats=json.dumps(payload.get("cats", []), ensure_ascii=False),
            mission=payload.get("mission", ""),
            description=payload.get("desc", ""),
            description2=payload.get("desc2", ""),
            sort_order=payload.get("sort_order", 0),
        )
        db.add(row)
        db.flush()
        return _serializeFriend(row), None


async def createQuestion(payload: dict) -> tuple[dict | None, str | None]:
    questionId = (payload.get("id") or "").strip()
    if not questionId:
        return None, "id가 필요합니다"
    with sessionScope() as db:
        existing = db.query(model.KoSpringPicnicQuestion).filter(
            model.KoSpringPicnicQuestion.id == questionId
        ).first()
        if existing:
            return None, "이미 존재하는 id입니다"
        row = model.KoSpringPicnicQuestion(
            id=questionId,
            cat=payload.get("cat", ""),
            level=payload.get("level", 1),
            il=payload.get("il", ""),
            hint=json.dumps(payload.get("hint", {}), ensure_ascii=False),
            num=payload.get("num", ""),
            tmpl=payload.get("tmpl", ""),
            tts=payload.get("tts", ""),
            correct=payload.get("correct", ""),
            wrong=json.dumps(payload.get("wrong", []), ensure_ascii=False),
            sort_order=payload.get("sort_order", 0),
        )
        db.add(row)
        db.flush()
        return _serializeQuestion(row), None


async def deleteFriend(friendId: str) -> bool:
    with sessionScope() as db:
        row = db.query(model.KoSpringPicnicFriend).filter(
            model.KoSpringPicnicFriend.id == friendId
        ).first()
        if not row:
            return False
        db.delete(row)
        return True


async def deleteQuestion(questionId: str) -> bool:
    with sessionScope() as db:
        row = db.query(model.KoSpringPicnicQuestion).filter(
            model.KoSpringPicnicQuestion.id == questionId
        ).first()
        if not row:
            return False
        db.delete(row)
        return True


async def updateFriend(friendId: str, payload: dict) -> dict | None:
    with sessionScope() as db:
        row = db.query(model.KoSpringPicnicFriend).filter(
            model.KoSpringPicnicFriend.id == friendId
        ).first()
        if not row:
            return None
        if "face" in payload: row.face = payload["face"]
        if "name" in payload: row.name = payload["name"]
        if "bg" in payload: row.bg = payload["bg"]
        if "cats" in payload:
            row.cats = json.dumps(payload["cats"], ensure_ascii=False)
        if "mission" in payload: row.mission = payload["mission"]
        if "desc" in payload: row.description = payload["desc"]
        if "desc2" in payload: row.description2 = payload["desc2"]
        if "sort_order" in payload: row.sort_order = payload["sort_order"]
        db.flush()
        return _serializeFriend(row)


async def updateQuestion(questionId: str, payload: dict) -> dict | None:
    with sessionScope() as db:
        row = db.query(model.KoSpringPicnicQuestion).filter(
            model.KoSpringPicnicQuestion.id == questionId
        ).first()
        if not row:
            return None
        if "cat" in payload: row.cat = payload["cat"]
        if "level" in payload: row.level = payload["level"]
        if "il" in payload: row.il = payload["il"]
        if "hint" in payload:
            row.hint = json.dumps(payload["hint"], ensure_ascii=False)
        if "num" in payload: row.num = payload["num"]
        if "tmpl" in payload: row.tmpl = payload["tmpl"]
        if "tts" in payload: row.tts = payload["tts"]
        if "correct" in payload: row.correct = payload["correct"]
        if "wrong" in payload:
            row.wrong = json.dumps(payload["wrong"], ensure_ascii=False)
        if "sort_order" in payload: row.sort_order = payload["sort_order"]
        db.flush()
        return _serializeQuestion(row)


async def getFriends():
    with sessionScope() as db:
        rows = await repo_spring_picnic.listFriends(db)
        return [_serializeFriend(r) for r in rows]


async def getQuestions():
    with sessionScope() as db:
        rows = await repo_spring_picnic.listQuestions(db)
        return [_serializeQuestion(r) for r in rows]


def _serializeFriend(row) -> dict:
    return {
        "id": row.id,
        "face": row.face,
        "name": row.name,
        "bg": row.bg,
        "cats": _loadJson(row.cats, []),
        "mission": row.mission,
        "desc": row.description,
        "desc2": row.description2,
    }


def _serializeQuestion(row) -> dict:
    return {
        "id": row.id,
        "cat": row.cat,
        "level": row.level,
        "il": row.il,
        "hint": _loadJson(row.hint, {}),
        "num": row.num,
        "tmpl": row.tmpl,
        "tts": row.tts,
        "correct": row.correct,
        "wrong": _loadJson(row.wrong, []),
    }


def _loadJson(value, default):
    if not value:
        return default
    try:
        return json.loads(value)
    except (ValueError, TypeError):
        return default
