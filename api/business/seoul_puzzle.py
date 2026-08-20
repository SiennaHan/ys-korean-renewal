import json

from persistence.database import sessionScope
from persistence import repo_seoul_puzzle, model


async def createLocation(payload: dict) -> tuple[dict | None, str | None]:
    locationId = (payload.get("id") or "").strip()
    if not locationId:
        return None, "id가 필요합니다"
    with sessionScope() as db:
        existing = db.query(model.KoSeoulPuzzleLocation).filter(
            model.KoSeoulPuzzleLocation.id == locationId
        ).first()
        if existing:
            return None, "이미 존재하는 id입니다"
        row = model.KoSeoulPuzzleLocation(
            id=locationId,
            name=payload.get("name", ""),
            num=payload.get("num", 0),
            x=payload.get("x", 0),
            y=payload.get("y", 0),
            unit=payload.get("unit", ""),
            description=payload.get("desc", ""),
            grammar=json.dumps(payload.get("grammar", []), ensure_ascii=False),
            entry_messages=json.dumps(payload.get("entryMessages", []), ensure_ascii=False),
            sort_order=payload.get("sort_order", 0),
        )
        db.add(row)
        db.flush()
        return _serializeLocation(row), None


async def createStep(payload: dict) -> tuple[dict | None, str | None]:
    locationId = payload.get("location_id")
    stepIndex = payload.get("step_index")
    if not locationId or stepIndex is None:
        return None, "location_id와 step_index가 필요합니다"
    with sessionScope() as db:
        existing = db.query(model.KoSeoulPuzzleStep).filter(
            model.KoSeoulPuzzleStep.location_id == locationId,
            model.KoSeoulPuzzleStep.step_index == stepIndex,
        ).first()
        if existing:
            return None, "이미 존재하는 (location_id, step_index) 조합입니다"
        row = model.KoSeoulPuzzleStep(
            location_id=locationId,
            step_index=stepIndex,
            data=json.dumps(payload.get("data", {}), ensure_ascii=False),
        )
        db.add(row)
        db.flush()
        return _serializeStep(row), None


async def deleteLocation(locationId: str) -> bool:
    with sessionScope() as db:
        row = db.query(model.KoSeoulPuzzleLocation).filter(
            model.KoSeoulPuzzleLocation.id == locationId
        ).first()
        if not row:
            return False
        db.delete(row)
        return True


async def deleteStep(stepId: int) -> bool:
    with sessionScope() as db:
        row = db.query(model.KoSeoulPuzzleStep).filter(
            model.KoSeoulPuzzleStep.id == stepId
        ).first()
        if not row:
            return False
        db.delete(row)
        return True


async def updateLocation(locationId: str, payload: dict) -> dict | None:
    with sessionScope() as db:
        row = db.query(model.KoSeoulPuzzleLocation).filter(
            model.KoSeoulPuzzleLocation.id == locationId
        ).first()
        if not row:
            return None
        if "name" in payload: row.name = payload["name"]
        if "num" in payload: row.num = payload["num"]
        if "x" in payload: row.x = payload["x"]
        if "y" in payload: row.y = payload["y"]
        if "unit" in payload: row.unit = payload["unit"]
        if "desc" in payload: row.description = payload["desc"]
        if "grammar" in payload:
            row.grammar = json.dumps(payload["grammar"], ensure_ascii=False)
        if "entryMessages" in payload:
            row.entry_messages = json.dumps(payload["entryMessages"], ensure_ascii=False)
        if "sort_order" in payload: row.sort_order = payload["sort_order"]
        db.flush()
        return _serializeLocation(row)


async def updateStep(stepId: int, payload: dict) -> dict | None:
    with sessionScope() as db:
        row = db.query(model.KoSeoulPuzzleStep).filter(
            model.KoSeoulPuzzleStep.id == stepId
        ).first()
        if not row:
            return None
        if "location_id" in payload: row.location_id = payload["location_id"]
        if "step_index" in payload: row.step_index = payload["step_index"]
        if "data" in payload:
            row.data = json.dumps(payload["data"], ensure_ascii=False)
        db.flush()
        return _serializeStep(row)


async def listLocationsForEdit() -> list:
    with sessionScope() as db:
        rows = await repo_seoul_puzzle.listLocations(db)
        return [_serializeLocation(r) for r in rows]


async def listStepsForEdit() -> list:
    with sessionScope() as db:
        rows = await repo_seoul_puzzle.listSteps(db)
        return [_serializeStep(r) for r in rows]


def _serializeLocation(r) -> dict:
    return {
        "id": r.id,
        "name": r.name,
        "num": r.num,
        "x": r.x,
        "y": r.y,
        "unit": r.unit,
        "desc": r.description,
        "grammar": _loadJson(r.grammar, []),
        "entryMessages": _loadJson(r.entry_messages, []),
        "sort_order": r.sort_order,
    }


def _serializeStep(r) -> dict:
    return {
        "id": r.id,
        "location_id": r.location_id,
        "step_index": r.step_index,
        "data": _loadJson(r.data, {}),
    }


async def getContent() -> dict:
    """Returns { locations: [...], puzzles: { locId: [step,...] } } — mirrors seoul_puzzles.json."""
    with sessionScope() as db:
        locationRows = await repo_seoul_puzzle.listLocations(db)
        stepRows = await repo_seoul_puzzle.listSteps(db)

        locations = []
        for r in locationRows:
            locations.append({
                "id": r.id,
                "name": r.name,
                "num": r.num,
                "x": r.x,
                "y": r.y,
                "unit": r.unit,
                "desc": r.description,
                "grammar": _loadJson(r.grammar, []),
                "entryMessages": _loadJson(r.entry_messages, []),
            })

        puzzles: dict = {}
        for r in stepRows:
            puzzles.setdefault(r.location_id, []).append(_loadJson(r.data, {}))

        return {"locations": locations, "puzzles": puzzles}


def _loadJson(value, default):
    if not value:
        return default
    try:
        return json.loads(value)
    except (ValueError, TypeError):
        return default
