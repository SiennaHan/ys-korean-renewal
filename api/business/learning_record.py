from datetime import datetime, timedelta, timezone

from fastapi.encoders import jsonable_encoder
from persistence.database import sessionScope
from persistence import repo_learning_record, repo_daily_activity

KST = timezone(timedelta(hours=9))


async def saveRecord(userId: str, bookId: int, chapterSeq: int, menuType: str, questionId: int, selectedAnswer: str, isCorrect: bool):
    with sessionScope() as db:
        record = await repo_learning_record.upsert(userId, bookId, chapterSeq, menuType, questionId, selectedAnswer, isCorrect, db)

        # 일별 활동 갱신 (출석 자동 기록) — 테이블 미생성 시에도 학습 기록은 정상 저장
        try:
            today = datetime.now(KST).strftime("%Y-%m-%d")
            await repo_daily_activity.updateLastStudy(userId, today, bookId, chapterSeq, menuType, db)
            if menuType == "word":
                await repo_daily_activity.incrementWordsLearned(userId, today, db)
        except Exception:
            pass

        return jsonable_encoder(record)


async def getRecords(userId: str, bookId: int, chapterSeq: int, menuType: str):
    with sessionScope() as db:
        records = await repo_learning_record.findByUser(userId, bookId, chapterSeq, menuType, db)
        return [jsonable_encoder(r) for r in records]


async def getProgress(userId: str, bookId: int, chapterSeq: int):
    with sessionScope() as db:
        rows = await repo_learning_record.getProgress(userId, bookId, chapterSeq, db)
        result = {}
        for row in rows:
            result[row.menu_type] = {
                "total": row.total,
                "correct": int(row.correct or 0),
            }
        return result
