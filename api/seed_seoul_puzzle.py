"""Seed ko_seoul_puzzle_location / ko_seoul_puzzle_step from frontend JSON.

Idempotent.
"""
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from persistence.database import sessionScope, createAllTables  # noqa: E402
from persistence import repo_seoul_puzzle  # noqa: E402


DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seed_data")
PUZZLES_JSON = os.path.join(DATA_DIR, "seoul_puzzles.json")


async def seedLocations(locations):
    with sessionScope() as db:
        for idx, loc in enumerate(locations):
            await repo_seoul_puzzle.upsertLocation({
                "id": loc["id"],
                "name": loc["name"],
                "num": loc["num"],
                "x": loc["x"],
                "y": loc["y"],
                "unit": loc["unit"],
                "description": loc["desc"],
                "grammar": json.dumps(loc.get("grammar", []), ensure_ascii=False),
                "entry_messages": json.dumps(loc.get("entryMessages", []), ensure_ascii=False),
            }, idx, db)
    print(f"Seeded {len(locations)} seoul-puzzle locations")


async def seedSteps(puzzles):
    totalSteps = 0
    with sessionScope() as db:
        for locationId, steps in puzzles.items():
            for stepIndex, step in enumerate(steps):
                await repo_seoul_puzzle.upsertStep({
                    "location_id": locationId,
                    "step_index": stepIndex,
                    "data": json.dumps(step, ensure_ascii=False),
                }, db)
                totalSteps += 1
    print(f"Seeded {totalSteps} seoul-puzzle steps")


async def main():
    createAllTables()
    with open(PUZZLES_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    await seedLocations(data.get("locations", []))
    await seedSteps(data.get("puzzles", {}))


if __name__ == "__main__":
    asyncio.run(main())
