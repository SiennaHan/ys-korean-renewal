from sqlalchemy.orm import Session

from persistence import model


async def listFriends(db: Session):
    return db.query(model.KoSpringPicnicFriend).order_by(
        model.KoSpringPicnicFriend.sort_order,
        model.KoSpringPicnicFriend.id,
    ).all()


async def listQuestions(db: Session):
    return db.query(model.KoSpringPicnicQuestion).order_by(
        model.KoSpringPicnicQuestion.sort_order,
        model.KoSpringPicnicQuestion.id,
    ).all()


async def upsertFriend(data: dict, sortOrder: int, db: Session):
    existing = db.query(model.KoSpringPicnicFriend).filter(
        model.KoSpringPicnicFriend.id == data["id"]
    ).first()
    if existing:
        existing.face = data["face"]
        existing.name = data["name"]
        existing.bg = data["bg"]
        existing.cats = data["cats"]
        existing.mission = data["mission"]
        existing.description = data["description"]
        existing.description2 = data["description2"]
        existing.sort_order = sortOrder
        db.flush()
        return existing

    record = model.KoSpringPicnicFriend(
        id=data["id"],
        face=data["face"],
        name=data["name"],
        bg=data["bg"],
        cats=data["cats"],
        mission=data["mission"],
        description=data["description"],
        description2=data["description2"],
        sort_order=sortOrder,
    )
    db.add(record)
    db.flush()
    return record


async def upsertQuestion(data: dict, sortOrder: int, db: Session):
    existing = db.query(model.KoSpringPicnicQuestion).filter(
        model.KoSpringPicnicQuestion.id == data["id"]
    ).first()
    if existing:
        existing.cat = data["cat"]
        existing.level = data["level"]
        existing.il = data["il"]
        existing.hint = data["hint"]
        existing.num = data["num"]
        existing.tmpl = data["tmpl"]
        existing.tts = data["tts"]
        existing.correct = data["correct"]
        existing.wrong = data["wrong"]
        existing.sort_order = sortOrder
        db.flush()
        return existing

    record = model.KoSpringPicnicQuestion(
        id=data["id"],
        cat=data["cat"],
        level=data["level"],
        il=data["il"],
        hint=data["hint"],
        num=data["num"],
        tmpl=data["tmpl"],
        tts=data["tts"],
        correct=data["correct"],
        wrong=data["wrong"],
        sort_order=sortOrder,
    )
    db.add(record)
    db.flush()
    return record
