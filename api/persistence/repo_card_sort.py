from sqlalchemy.orm import Session

from persistence import model


async def listCategories(db: Session):
    return db.query(model.KoCardSortCategory).order_by(
        model.KoCardSortCategory.sort_order,
        model.KoCardSortCategory.name,
    ).all()


async def listVocab(db: Session):
    return db.query(model.KoCardSortVocab).order_by(
        model.KoCardSortVocab.grade,
        model.KoCardSortVocab.sort_order,
        model.KoCardSortVocab.id,
    ).all()


async def listRareExamples(db: Session):
    return db.query(model.KoCardSortRareExample).order_by(
        model.KoCardSortRareExample.sort_order,
        model.KoCardSortRareExample.word,
    ).all()


async def upsertCategory(data: dict, sortOrder: int, db: Session):
    existing = db.query(model.KoCardSortCategory).filter(
        model.KoCardSortCategory.name == data["name"]
    ).first()
    if existing:
        existing.color = data["color"]
        existing.sort_order = sortOrder
        db.flush()
        return existing

    record = model.KoCardSortCategory(
        name=data["name"],
        color=data["color"],
        sort_order=sortOrder,
    )
    db.add(record)
    db.flush()
    return record


async def upsertVocab(data: dict, sortOrder: int, db: Session):
    existing = db.query(model.KoCardSortVocab).filter(
        model.KoCardSortVocab.grade == data["grade"],
        model.KoCardSortVocab.lesson == data["lesson"],
    ).first()
    if existing:
        existing.new_categories = data["new_categories"]
        existing.words = data["words"]
        existing.sort_order = sortOrder
        db.flush()
        return existing

    record = model.KoCardSortVocab(
        grade=data["grade"],
        lesson=data["lesson"],
        new_categories=data["new_categories"],
        words=data["words"],
        sort_order=sortOrder,
    )
    db.add(record)
    db.flush()
    return record


async def upsertRareExample(data: dict, sortOrder: int, db: Session):
    existing = db.query(model.KoCardSortRareExample).filter(
        model.KoCardSortRareExample.word == data["word"]
    ).first()
    if existing:
        existing.category = data["category"]
        existing.confusable_with = data.get("confusable_with")
        existing.sort_order = sortOrder
        db.flush()
        return existing

    record = model.KoCardSortRareExample(
        word=data["word"],
        category=data["category"],
        confusable_with=data.get("confusable_with"),
        sort_order=sortOrder,
    )
    db.add(record)
    db.flush()
    return record
