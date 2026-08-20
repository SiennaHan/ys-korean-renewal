import json

from persistence.database import sessionScope
from persistence import repo_card_sort, model


async def createCategory(payload: dict) -> tuple[dict | None, str | None]:
    name = (payload.get("name") or "").strip()
    if not name:
        return None, "name이 필요합니다"
    with sessionScope() as db:
        existing = db.query(model.KoCardSortCategory).filter(
            model.KoCardSortCategory.name == name
        ).first()
        if existing:
            return None, "이미 존재하는 카테고리입니다"
        row = model.KoCardSortCategory(
            name=name,
            color=payload.get("color", "#9CA3AF"),
            sort_order=payload.get("sort_order", 0),
        )
        db.add(row)
        db.flush()
        return {"name": row.name, "color": row.color, "sort_order": row.sort_order}, None


async def createVocab(payload: dict) -> tuple[dict | None, str | None]:
    grade = payload.get("grade")
    lesson = payload.get("lesson")
    if not grade or not lesson:
        return None, "grade와 lesson이 필요합니다"
    with sessionScope() as db:
        existing = db.query(model.KoCardSortVocab).filter(
            model.KoCardSortVocab.grade == grade,
            model.KoCardSortVocab.lesson == lesson,
        ).first()
        if existing:
            return None, "이미 존재하는 (grade, lesson) 조합입니다"
        row = model.KoCardSortVocab(
            grade=grade,
            lesson=lesson,
            new_categories=json.dumps(payload.get("new_categories", []), ensure_ascii=False),
            words=json.dumps(payload.get("words", {}), ensure_ascii=False),
            sort_order=payload.get("sort_order", 0),
        )
        db.add(row)
        db.flush()
        return _serializeVocab(row), None


async def createRare(payload: dict) -> tuple[dict | None, str | None]:
    word = (payload.get("word") or "").strip()
    if not word:
        return None, "word가 필요합니다"
    with sessionScope() as db:
        existing = db.query(model.KoCardSortRareExample).filter(
            model.KoCardSortRareExample.word == word
        ).first()
        if existing:
            return None, "이미 존재하는 word입니다"
        row = model.KoCardSortRareExample(
            word=word,
            category=payload.get("category", ""),
            confusable_with=payload.get("confusable_with"),
            sort_order=payload.get("sort_order", 0),
        )
        db.add(row)
        db.flush()
        return {
            "word": row.word,
            "category": row.category,
            "confusable_with": row.confusable_with,
            "sort_order": row.sort_order,
        }, None


async def deleteCategory(name: str) -> bool:
    with sessionScope() as db:
        row = db.query(model.KoCardSortCategory).filter(
            model.KoCardSortCategory.name == name
        ).first()
        if not row:
            return False
        db.delete(row)
        return True


async def deleteVocab(vocabId: int) -> bool:
    with sessionScope() as db:
        row = db.query(model.KoCardSortVocab).filter(
            model.KoCardSortVocab.id == vocabId
        ).first()
        if not row:
            return False
        db.delete(row)
        return True


async def deleteRare(word: str) -> bool:
    with sessionScope() as db:
        row = db.query(model.KoCardSortRareExample).filter(
            model.KoCardSortRareExample.word == word
        ).first()
        if not row:
            return False
        db.delete(row)
        return True


async def updateCategory(name: str, payload: dict) -> dict | None:
    with sessionScope() as db:
        row = db.query(model.KoCardSortCategory).filter(
            model.KoCardSortCategory.name == name
        ).first()
        if not row:
            return None
        if "color" in payload: row.color = payload["color"]
        if "sort_order" in payload: row.sort_order = payload["sort_order"]
        db.flush()
        return {"name": row.name, "color": row.color, "sort_order": row.sort_order}


async def updateVocab(vocabId: int, payload: dict) -> dict | None:
    with sessionScope() as db:
        row = db.query(model.KoCardSortVocab).filter(
            model.KoCardSortVocab.id == vocabId
        ).first()
        if not row:
            return None
        if "grade" in payload: row.grade = payload["grade"]
        if "lesson" in payload: row.lesson = payload["lesson"]
        if "new_categories" in payload:
            row.new_categories = json.dumps(payload["new_categories"], ensure_ascii=False)
        if "words" in payload:
            row.words = json.dumps(payload["words"], ensure_ascii=False)
        if "sort_order" in payload: row.sort_order = payload["sort_order"]
        db.flush()
        return _serializeVocab(row)


async def updateRare(word: str, payload: dict) -> dict | None:
    with sessionScope() as db:
        row = db.query(model.KoCardSortRareExample).filter(
            model.KoCardSortRareExample.word == word
        ).first()
        if not row:
            return None
        if "category" in payload: row.category = payload["category"]
        if "confusable_with" in payload:
            row.confusable_with = payload["confusable_with"]
        if "sort_order" in payload: row.sort_order = payload["sort_order"]
        db.flush()
        return {
            "word": row.word,
            "category": row.category,
            "confusable_with": row.confusable_with,
            "sort_order": row.sort_order,
        }


async def listCategoriesForEdit() -> list:
    with sessionScope() as db:
        rows = await repo_card_sort.listCategories(db)
        return [
            {"name": r.name, "color": r.color, "sort_order": r.sort_order}
            for r in rows
        ]


async def listVocabForEdit() -> list:
    with sessionScope() as db:
        rows = await repo_card_sort.listVocab(db)
        return [_serializeVocab(r) for r in rows]


async def listRareForEdit() -> list:
    with sessionScope() as db:
        rows = await repo_card_sort.listRareExamples(db)
        return [
            {
                "word": r.word,
                "category": r.category,
                "confusable_with": r.confusable_with,
                "sort_order": r.sort_order,
            }
            for r in rows
        ]


def _serializeVocab(r) -> dict:
    return {
        "id": r.id,
        "grade": r.grade,
        "lesson": r.lesson,
        "new_categories": _loadJson(r.new_categories, []),
        "words": _loadJson(r.words, {}),
        "sort_order": r.sort_order,
    }


async def getCategories() -> dict:
    """Returns { categoryName: hexColor } — mirrors card_sort_categories.json shape."""
    with sessionScope() as db:
        rows = await repo_card_sort.listCategories(db)
        return {r.name: r.color for r in rows}


async def getVocab() -> dict:
    """Returns { "2급": { "1과": {new_categories, [cat]: words[]}, ... }, ... } — mirrors vocab.json non-rare shape."""
    with sessionScope() as db:
        rows = await repo_card_sort.listVocab(db)
        result: dict = {}
        for r in rows:
            result.setdefault(r.grade, {})
            entry: dict = {"new_categories": _loadJson(r.new_categories, [])}
            words = _loadJson(r.words, {})
            if isinstance(words, dict):
                for catName, wordList in words.items():
                    entry[catName] = wordList
            result[r.grade][r.lesson] = entry
        return result


async def getRare() -> dict:
    """Returns { examples: [{word, category, confusable_with}, ...] }"""
    with sessionScope() as db:
        rows = await repo_card_sort.listRareExamples(db)
        return {
            "examples": [
                {
                    "word": r.word,
                    "category": r.category,
                    "confusable_with": r.confusable_with,
                }
                for r in rows
            ],
        }


def _loadJson(value, default):
    if not value:
        return default
    try:
        return json.loads(value)
    except (ValueError, TypeError):
        return default
