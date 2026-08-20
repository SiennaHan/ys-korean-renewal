import json

from persistence.database import sessionScope
from persistence import repo_particle_sniper, model


async def createLevel(payload: dict) -> tuple[dict | None, str | None]:
    levelId = (payload.get("id") or "").strip()
    if not levelId:
        return None, "id가 필요합니다"
    with sessionScope() as db:
        existing = db.query(model.KoParticleSniperLevel).filter(
            model.KoParticleSniperLevel.id == levelId
        ).first()
        if existing:
            return None, "이미 존재하는 id입니다"
        row = model.KoParticleSniperLevel(
            id=levelId,
            summary=payload.get("summary", ""),
            color=payload.get("color", "#000000"),
            accent=payload.get("accent", "#000000"),
            sort_order=payload.get("sort_order", 0),
        )
        db.add(row)
        db.flush()
        return {
            "id": row.id,
            "summary": row.summary,
            "color": row.color,
            "accent": row.accent,
            "sort_order": row.sort_order,
        }, None


async def createLesson(payload: dict) -> tuple[dict | None, str | None]:
    level = payload.get("level")
    lessonName = payload.get("lesson_name")
    if not level or not lessonName:
        return None, "level과 lesson_name이 필요합니다"
    with sessionScope() as db:
        existing = db.query(model.KoParticleSniperLesson).filter(
            model.KoParticleSniperLesson.level == level,
            model.KoParticleSniperLesson.lesson_name == lessonName,
        ).first()
        if existing:
            return None, "이미 존재하는 (level, lesson_name) 조합입니다"
        row = model.KoParticleSniperLesson(
            level=level,
            lesson_name=lessonName,
            new_particles=json.dumps(payload.get("new_particles", []), ensure_ascii=False),
            cumulative_particles=json.dumps(payload.get("cumulative_particles", []), ensure_ascii=False),
            questions=json.dumps(payload.get("questions", []), ensure_ascii=False),
            sort_order=payload.get("sort_order", 0),
        )
        db.add(row)
        db.flush()
        return _serializeLesson(row), None


async def deleteLevel(levelId: str) -> bool:
    with sessionScope() as db:
        row = db.query(model.KoParticleSniperLevel).filter(
            model.KoParticleSniperLevel.id == levelId
        ).first()
        if not row:
            return False
        db.delete(row)
        return True


async def deleteLesson(lessonId: int) -> bool:
    with sessionScope() as db:
        row = db.query(model.KoParticleSniperLesson).filter(
            model.KoParticleSniperLesson.id == lessonId
        ).first()
        if not row:
            return False
        db.delete(row)
        return True


async def updateLevel(levelId: str, payload: dict) -> dict | None:
    with sessionScope() as db:
        row = db.query(model.KoParticleSniperLevel).filter(
            model.KoParticleSniperLevel.id == levelId
        ).first()
        if not row:
            return None
        if "summary" in payload: row.summary = payload["summary"]
        if "color" in payload: row.color = payload["color"]
        if "accent" in payload: row.accent = payload["accent"]
        if "sort_order" in payload: row.sort_order = payload["sort_order"]
        db.flush()
        return {
            "id": row.id,
            "summary": row.summary,
            "color": row.color,
            "accent": row.accent,
            "sort_order": row.sort_order,
        }


async def updateLesson(lessonId: int, payload: dict) -> dict | None:
    with sessionScope() as db:
        row = db.query(model.KoParticleSniperLesson).filter(
            model.KoParticleSniperLesson.id == lessonId
        ).first()
        if not row:
            return None
        if "level" in payload: row.level = payload["level"]
        if "lesson_name" in payload: row.lesson_name = payload["lesson_name"]
        if "new_particles" in payload:
            row.new_particles = json.dumps(payload["new_particles"], ensure_ascii=False)
        if "cumulative_particles" in payload:
            row.cumulative_particles = json.dumps(payload["cumulative_particles"], ensure_ascii=False)
        if "questions" in payload:
            row.questions = json.dumps(payload["questions"], ensure_ascii=False)
        if "sort_order" in payload: row.sort_order = payload["sort_order"]
        db.flush()
        return _serializeLesson(row)


async def listLessonsForEdit() -> list:
    """Returns all lessons with raw IDs for the admin editor."""
    with sessionScope() as db:
        rows = await repo_particle_sniper.listLessons(db)
        return [_serializeLesson(r) for r in rows]


def _serializeLesson(r) -> dict:
    return {
        "id": r.id,
        "level": r.level,
        "lesson_name": r.lesson_name,
        "new_particles": _loadJson(r.new_particles, []),
        "cumulative_particles": _loadJson(r.cumulative_particles, []),
        "questions": _loadJson(r.questions, []),
        "sort_order": r.sort_order,
    }


async def getLevels() -> dict:
    """Returns { "1급": {summary, color, accent}, ... } — preserves frontend shape."""
    with sessionScope() as db:
        rows = await repo_particle_sniper.listLevels(db)
        return {
            r.id: {
                "summary": r.summary,
                "color": r.color,
                "accent": r.accent,
            }
            for r in rows
        }


async def getSentences() -> dict:
    """Returns { "1급": { "4과": {new_particles, cumulative_particles, questions}, ... }, ... }"""
    with sessionScope() as db:
        rows = await repo_particle_sniper.listLessons(db)
        result: dict = {}
        for r in rows:
            result.setdefault(r.level, {})
            result[r.level][r.lesson_name] = {
                "new_particles": _loadJson(r.new_particles, []),
                "cumulative_particles": _loadJson(r.cumulative_particles, []),
                "questions": _loadJson(r.questions, []),
            }
        return result


def _loadJson(value, default):
    if not value:
        return default
    try:
        return json.loads(value)
    except (ValueError, TypeError):
        return default
