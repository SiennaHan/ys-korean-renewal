"""Seed ko_spring_picnic_friend / ko_spring_picnic_question from frontend JSON files.

Usage (from backend/koreanapi):
    python seed_spring_picnic.py

Idempotent: safe to re-run; upserts by id.
"""
import asyncio
import json
import os
import sys

# Make sibling packages importable when run as a script.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from persistence.database import sessionScope, createAllTables  # noqa: E402
from persistence import repo_spring_picnic  # noqa: E402


DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seed_data")
FRIENDS_JSON = os.path.join(DATA_DIR, "spring_picnic_friends.json")
QUESTIONS_JSON = os.path.join(DATA_DIR, "spring_picnic_questions.json")


async def seedFriends():
    with open(FRIENDS_JSON, "r", encoding="utf-8") as f:
        friends = json.load(f)

    with sessionScope() as db:
        for idx, friend in enumerate(friends):
            row = {
                "id": friend["id"],
                "face": friend["face"],
                "name": friend["name"],
                "bg": friend["bg"],
                "cats": json.dumps(friend["cats"], ensure_ascii=False),
                "mission": friend["mission"],
                "description": friend["desc"],
                "description2": friend["desc2"],
            }
            await repo_spring_picnic.upsertFriend(row, idx, db)
    print(f"Seeded {len(friends)} friends")


async def seedQuestions():
    with open(QUESTIONS_JSON, "r", encoding="utf-8") as f:
        questions = json.load(f)

    with sessionScope() as db:
        for idx, q in enumerate(questions):
            row = {
                "id": q["id"],
                "cat": q["cat"],
                "level": q["level"],
                "il": q["il"],
                "hint": json.dumps(q["hint"], ensure_ascii=False),
                "num": q["num"],
                "tmpl": q["tmpl"],
                "tts": q["tts"],
                "correct": q["correct"],
                "wrong": json.dumps(q["wrong"], ensure_ascii=False),
            }
            await repo_spring_picnic.upsertQuestion(row, idx, db)
    print(f"Seeded {len(questions)} questions")


async def main():
    createAllTables()
    await seedFriends()
    await seedQuestions()


if __name__ == "__main__":
    asyncio.run(main())
