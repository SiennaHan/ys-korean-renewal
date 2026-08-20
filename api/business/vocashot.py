import json

from persistence.database import sessionScope
from persistence import repo_vocashot, model


async def getPresets() -> list:
    """Returns [{id, label, vocab, sort_order}, ...]."""
    with sessionScope() as db:
        rows = await repo_vocashot.listPresets(db)
        return [_serialize(r) for r in rows]


async def createPreset(payload: dict) -> tuple[dict | None, str | None]:
    presetId = (payload.get("id") or "").strip()
    if not presetId:
        return None, "id가 필요합니다"
    label = (payload.get("label") or "").strip()
    if not label:
        return None, "label이 필요합니다"
    with sessionScope() as db:
        existing = db.query(model.KoVocashotPreset).filter(
            model.KoVocashotPreset.id == presetId
        ).first()
        if existing:
            return None, "이미 존재하는 id입니다"
        row = model.KoVocashotPreset(
            id=presetId,
            label=label,
            vocab=json.dumps(payload.get("vocab", []), ensure_ascii=False),
            sort_order=payload.get("sort_order", 0),
        )
        db.add(row)
        db.flush()
        return _serialize(row), None


async def updatePreset(presetId: str, payload: dict) -> dict | None:
    with sessionScope() as db:
        row = db.query(model.KoVocashotPreset).filter(
            model.KoVocashotPreset.id == presetId
        ).first()
        if not row:
            return None
        if "label" in payload: row.label = payload["label"]
        if "vocab" in payload:
            row.vocab = json.dumps(payload["vocab"], ensure_ascii=False)
        if "sort_order" in payload: row.sort_order = payload["sort_order"]
        db.flush()
        return _serialize(row)


async def deletePreset(presetId: str) -> bool:
    with sessionScope() as db:
        row = db.query(model.KoVocashotPreset).filter(
            model.KoVocashotPreset.id == presetId
        ).first()
        if not row:
            return False
        db.delete(row)
        return True


def _serialize(r) -> dict:
    return {
        "id": r.id,
        "label": r.label,
        "vocab": _loadJson(r.vocab, []),
        "sort_order": r.sort_order,
    }


def _loadJson(value, default):
    if not value:
        return default
    try:
        return json.loads(value)
    except (ValueError, TypeError):
        return default
