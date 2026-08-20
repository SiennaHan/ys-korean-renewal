"""Seed ko_particle_sniper_level / ko_particle_sniper_lesson from frontend JSON.

Idempotent. Run with the same Python env as the API server.
"""
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from persistence.database import sessionScope, createAllTables  # noqa: E402
from persistence import repo_particle_sniper  # noqa: E402


DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seed_data")
LEVELS_JSON = os.path.join(DATA_DIR, "particle_sniper_levels.json")
LEVEL_FILES = [
    ("1급", "sentences_lv1.json"),
    ("2급", "sentences_lv2.json"),
    ("3급", "sentences_lv3.json"),
    ("4급", "sentences_lv4.json"),
    ("5급", "sentences_lv5.json"),
    ("6급", "sentences_lv6.json"),
]


async def seedLevels():
    with open(LEVELS_JSON, "r", encoding="utf-8") as f:
        levels = json.load(f)

    with sessionScope() as db:
        for idx, (levelId, meta) in enumerate(levels.items()):
            await repo_particle_sniper.upsertLevel({
                "id": levelId,
                "summary": meta["summary"],
                "color": meta["color"],
                "accent": meta["accent"],
            }, idx, db)
    print(f"Seeded {len(levels)} particle-sniper levels")


async def seedLessons():
    totalLessons = 0
    with sessionScope() as db:
        for levelId, filename in LEVEL_FILES:
            path = os.path.join(DATA_DIR, filename)
            with open(path, "r", encoding="utf-8") as f:
                levelData = json.load(f)
            for idx, (lessonName, lessonContent) in enumerate(levelData.items()):
                await repo_particle_sniper.upsertLesson({
                    "level": levelId,
                    "lesson_name": lessonName,
                    "new_particles": json.dumps(lessonContent.get("new_particles", []), ensure_ascii=False),
                    "cumulative_particles": json.dumps(lessonContent.get("cumulative_particles", []), ensure_ascii=False),
                    "questions": json.dumps(lessonContent.get("questions", []), ensure_ascii=False),
                }, idx, db)
                totalLessons += 1
    print(f"Seeded {totalLessons} particle-sniper lessons")


async def main():
    createAllTables()
    await seedLevels()
    await seedLessons()


if __name__ == "__main__":
    asyncio.run(main())
