"""Seed ko_vocashot_preset from admin SPA's presets.ts + vocabData.json.

Reads the 5 hardcoded preset labels and groups vocab entries by `lesson` field.
Idempotent — upserts by preset id.
"""
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from persistence.database import sessionScope, createAllTables  # noqa: E402
from persistence import repo_vocashot  # noqa: E402


DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seed_data")
VOCAB_JSON = os.path.join(DATA_DIR, "vocabData.json")

# Mirrors the presetOptions array hardcoded in presets.ts.
PRESETS = [
    ("level1_lesson1", "1권 1과 - 직업"),
    ("level1_lesson2", "1권 2과 - 나라"),
    ("level1_lesson3", "1권 3과 - 생활 용품"),
    ("level1_lesson4", "1권 4과 - 장소"),
    ("level1_lesson5", "1권 5과 - 가구, 가전"),
]


def _vocabItem(e: dict) -> dict:
    """Strip lesson field; admin SPA expects {id, category, image?, english?, answer, wrong}."""
    return {
        "id": e["id"],
        "category": e.get("category", ""),
        "image": e.get("image"),
        "english": e.get("english"),
        "answer": e["answer"],
        "wrong": e.get("wrong", []),
    }


async def seedPresets():
    with open(VOCAB_JSON, "r", encoding="utf-8") as f:
        vocab = json.load(f)

    by_lesson: dict[str, list] = {}
    for e in vocab:
        by_lesson.setdefault(e["lesson"], []).append(_vocabItem(e))

    with sessionScope() as db:
        for idx, (pid, label) in enumerate(PRESETS):
            await repo_vocashot.upsertPreset(
                {
                    "id": pid,
                    "label": label,
                    "vocab": json.dumps(by_lesson.get(pid, []), ensure_ascii=False),
                },
                idx,
                db,
            )
    total_vocab = sum(len(by_lesson.get(pid, [])) for pid, _ in PRESETS)
    print(f"Seeded {len(PRESETS)} vocashot presets with {total_vocab} total vocab")


async def main():
    createAllTables()
    await seedPresets()


if __name__ == "__main__":
    asyncio.run(main())
