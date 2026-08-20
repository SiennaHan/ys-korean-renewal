"""Seed ko_card_sort_category / ko_card_sort_vocab / ko_card_sort_rare_example from frontend JSON.

Idempotent.
"""
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from persistence.database import sessionScope, createAllTables  # noqa: E402
from persistence import repo_card_sort  # noqa: E402


DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seed_data")
CATEGORIES_JSON = os.path.join(DATA_DIR, "card_sort_categories.json")
VOCAB_JSON = os.path.join(DATA_DIR, "vocab.json")


async def seedCategories():
    with open(CATEGORIES_JSON, "r", encoding="utf-8") as f:
        categories = json.load(f)

    with sessionScope() as db:
        for idx, (name, color) in enumerate(categories.items()):
            await repo_card_sort.upsertCategory({
                "name": name,
                "color": color,
            }, idx, db)
    print(f"Seeded {len(categories)} card-sort categories")


async def seedVocab():
    with open(VOCAB_JSON, "r", encoding="utf-8") as f:
        vocab = json.load(f)

    totalVocab = 0
    totalRare = 0
    with sessionScope() as db:
        for grade, gradeData in vocab.items():
            if grade == "rare":
                examples = gradeData.get("examples", [])
                for idx, ex in enumerate(examples):
                    await repo_card_sort.upsertRareExample({
                        "word": ex["word"],
                        "category": ex.get("category", ""),
                        "confusable_with": ex.get("confusable_with"),
                    }, idx, db)
                    totalRare += 1
                continue

            for idx, (lesson, lessonData) in enumerate(gradeData.items()):
                newCats = lessonData.get("new_categories", [])
                words: dict = {}
                for k, v in lessonData.items():
                    if k == "new_categories":
                        continue
                    if isinstance(v, list):
                        words[k] = v
                await repo_card_sort.upsertVocab({
                    "grade": grade,
                    "lesson": lesson,
                    "new_categories": json.dumps(newCats, ensure_ascii=False),
                    "words": json.dumps(words, ensure_ascii=False),
                }, idx, db)
                totalVocab += 1
    print(f"Seeded {totalVocab} card-sort vocab entries")
    print(f"Seeded {totalRare} card-sort rare examples")


async def main():
    createAllTables()
    await seedCategories()
    await seedVocab()


if __name__ == "__main__":
    asyncio.run(main())
