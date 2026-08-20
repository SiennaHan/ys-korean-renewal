from sqlalchemy.orm import Session

from persistence import model


async def listLocations(db: Session):
    return db.query(model.KoSeoulPuzzleLocation).order_by(
        model.KoSeoulPuzzleLocation.sort_order,
        model.KoSeoulPuzzleLocation.num,
        model.KoSeoulPuzzleLocation.id,
    ).all()


async def listSteps(db: Session):
    return db.query(model.KoSeoulPuzzleStep).order_by(
        model.KoSeoulPuzzleStep.location_id,
        model.KoSeoulPuzzleStep.step_index,
    ).all()


async def upsertLocation(data: dict, sortOrder: int, db: Session):
    existing = db.query(model.KoSeoulPuzzleLocation).filter(
        model.KoSeoulPuzzleLocation.id == data["id"]
    ).first()
    if existing:
        existing.name = data["name"]
        existing.num = data["num"]
        existing.x = data["x"]
        existing.y = data["y"]
        existing.unit = data["unit"]
        existing.description = data["description"]
        existing.grammar = data["grammar"]
        existing.entry_messages = data["entry_messages"]
        existing.sort_order = sortOrder
        db.flush()
        return existing

    record = model.KoSeoulPuzzleLocation(
        id=data["id"],
        name=data["name"],
        num=data["num"],
        x=data["x"],
        y=data["y"],
        unit=data["unit"],
        description=data["description"],
        grammar=data["grammar"],
        entry_messages=data["entry_messages"],
        sort_order=sortOrder,
    )
    db.add(record)
    db.flush()
    return record


async def upsertStep(data: dict, db: Session):
    existing = db.query(model.KoSeoulPuzzleStep).filter(
        model.KoSeoulPuzzleStep.location_id == data["location_id"],
        model.KoSeoulPuzzleStep.step_index == data["step_index"],
    ).first()
    if existing:
        existing.data = data["data"]
        db.flush()
        return existing

    record = model.KoSeoulPuzzleStep(
        location_id=data["location_id"],
        step_index=data["step_index"],
        data=data["data"],
    )
    db.add(record)
    db.flush()
    return record
