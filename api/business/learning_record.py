from datetime import datetime, timedelta, timezone

from fastapi.encoders import jsonable_encoder
from persistence.database import sessionScope
from persistence import repo_learning_record, repo_daily_activity

KST = timezone(timedelta(hours=9))


async def saveRecord(userId: str, bookId: int, chapterSeq: int, menuType: str, questionId: int, selectedAnswer: str, isCorrect: bool):
    with sessionScope() as db:
        record, created = await repo_learning_record.upsert(userId, bookId, chapterSeq, menuType, questionId, selectedAnswer, isCorrect, db)

        # 일별 활동 갱신 (출석 자동 기록) — 테이블 미생성 시에도 학습 기록은 정상 저장
        try:
            today = datetime.now(KST).strftime("%Y-%m-%d")
            # 마지막 학습 지점은 재시도에도 갱신한다 — 다시 푸는 것도 학습이다
            await repo_daily_activity.updateLastStudy(userId, today, bookId, chapterSeq, menuType, db)
            # 학습 단어 수는 누적값이라 첫 시도에만 센다. 전에는 재시도마다 +1 이라
            # 같은 문항을 세 번 고치면 세 단어를 배운 것으로 찍혔다 (dev_spec §2.1)
            if menuType == "word" and created:
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
