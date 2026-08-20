from sqlalchemy.orm import Session

from persistence import model


async def listPresets(db: Session):
    return db.query(model.KoVocashotPreset).order_by(
        model.KoVocashotPreset.sort_order,
        model.KoVocashotPreset.id,
    ).all()


async def upsertPreset(data: dict, sortOrder: int, db: Session):
    existing = db.query(model.KoVocashotPreset).filter(
        model.KoVocashotPreset.id == data["id"]
    ).first()
    if existing:
        existing.label = data["label"]
        existing.vocab = data["vocab"]
        existing.sort_order = sortOrder
        db.flush()
        return existing

    record = model.KoVocashotPreset(
        id=data["id"],
        label=data["label"],
        vocab=data["vocab"],
        sort_order=sortOrder,
    )
    db.add(record)
    db.flush()
    return record
