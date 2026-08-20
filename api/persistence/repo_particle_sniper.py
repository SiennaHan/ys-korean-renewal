from sqlalchemy.orm import Session

from persistence import model


async def listLevels(db: Session):
    return db.query(model.KoParticleSniperLevel).order_by(
        model.KoParticleSniperLevel.sort_order,
        model.KoParticleSniperLevel.id,
    ).all()


async def listLessons(db: Session):
    return db.query(model.KoParticleSniperLesson).order_by(
        model.KoParticleSniperLesson.level,
        model.KoParticleSniperLesson.sort_order,
        model.KoParticleSniperLesson.id,
    ).all()


async def upsertLevel(data: dict, sortOrder: int, db: Session):
    existing = db.query(model.KoParticleSniperLevel).filter(
        model.KoParticleSniperLevel.id == data["id"]
    ).first()
    if existing:
        existing.summary = data["summary"]
        existing.color = data["color"]
        existing.accent = data["accent"]
        existing.sort_order = sortOrder
        db.flush()
        return existing

    record = model.KoParticleSniperLevel(
        id=data["id"],
        summary=data["summary"],
        color=data["color"],
        accent=data["accent"],
        sort_order=sortOrder,
    )
    db.add(record)
    db.flush()
    return record


async def upsertLesson(data: dict, sortOrder: int, db: Session):
    existing = db.query(model.KoParticleSniperLesson).filter(
        model.KoParticleSniperLesson.level == data["level"],
        model.KoParticleSniperLesson.lesson_name == data["lesson_name"],
    ).first()
    if existing:
        existing.new_particles = data["new_particles"]
        existing.cumulative_particles = data["cumulative_particles"]
        existing.questions = data["questions"]
        existing.sort_order = sortOrder
        db.flush()
        return existing

    record = model.KoParticleSniperLesson(
        level=data["level"],
        lesson_name=data["lesson_name"],
        new_particles=data["new_particles"],
        cumulative_particles=data["cumulative_particles"],
        questions=data["questions"],
        sort_order=sortOrder,
    )
    db.add(record)
    db.flush()
    return record
