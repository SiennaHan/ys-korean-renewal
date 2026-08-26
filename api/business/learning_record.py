from datetime import datetime, timedelta, timezone

from fastapi.encoders import jsonable_encoder
from persistence.database import sessionScope
from persistence import repo_learning_record, repo_daily_activity, repo_review_queue

KST = timezone(timedelta(hours=9))


async def saveRecord(userId: str, bookId: int, chapterSeq: int, menuType: str, questionId: int, selectedAnswer: str, isCorrect: bool, sub: int = 0, skipped: bool = False, review: bool = False):
    """문항 하나를 기록한다. 오답·건너뜀이면 다시 풀기에 예약하고, 맞히면 뺀다.

    **예약은 첫 시도 기준이다**(dev_spec §2.1, 셸 명세 S1). 재시도로 맞혀도 큐에
    남는다 — 그래서 `created` 일 때만 넣는다. 반대로 제거는 시도 회차를 보지 않는다:
    다시 풀기에서 맞히면 빼야 하고 그것은 두 번째 이후 시도다.

    자동 제거를 서버가 하는 이유는 왕복을 줄이는 것이다(§3 의 권장).
    """
    with sessionScope() as db:
        record, created = await repo_learning_record.upsert(userId, bookId, chapterSeq, menuType, questionId, selectedAnswer, isCorrect, db)

        # 다시 풀기 예약·제거. 표가 아직 없는 환경에서도 학습 기록은 남아야 하므로 감싼다
        try:
            if isCorrect and not skipped and review:
                # **다시 풀기에서 맞혔을 때만 뺀다.**
                #
                # 처음엔 "맞히면 뺀다" 로 썼는데 명세와 반대였다 — 같은 세션의
                # 재시도로 맞힌 것까지 빠져서, 첫 시도에 틀린 문항이 큐에 하나도
                # 남지 않았다. 브라우저에서 큐가 비어 있는 것으로 드러났다.
                # 명세: "재시도로 맞혀도 복습 큐에 남는다 · 제거 조건은 다시
                # 풀기에서 정답 1회" (dev_spec §2.1 · §2.3)
                await repo_review_queue.remove(
                    userId, bookId, chapterSeq, menuType, sub, questionId, db
                )
            elif (created and (skipped or not isCorrect)) or (review and not isCorrect):
                # 첫 시도 오답·건너뜀은 예약한다(created + 틀렸거나 건너뜀).
                #
                # **전에는 `created` 만 봤다 — 첫 시도에 맞힌 것까지 "wrong" 으로
                # 큐에 들어갔다.** 주석은 "오답·건너뜀은" 이라고 적혀 있었는데
                # 조건이 정답을 안 가렸다. 아래 except 가 조용히 삼키는 자리라
                # 화면에도 오류가 안 났고, 큐가 늘 차 있으니 그럴듯해 보였다.
                # 첫 시도에 정답을 넣어 큐를 확인해서야 드러났다(2026-08-26).
                # 다시 풀기 세션에서 또 틀리면 attempts 를 올리고 available_at 을
                # 다시 미룬다(review) — add() 가 있으면 올리고 없으면 만든다.
                # **같은 세션의 재시도는 여기 오지 않는다** — created 도 review 도
                # 아니므로. 그래야 "문항당 한 번만 기록" 이 지켜진다
                await repo_review_queue.add(
                    userId, bookId, chapterSeq, menuType, sub, questionId,
                    "skipped" if skipped else "wrong", db,
                )
        except Exception as e:
            # 표가 없는 환경에서도 학습 기록은 남아야 하므로 삼키되, **찍는다.**
            # 조용히 넘기던 탓에 위의 조건 버그가 오래 안 보였다
            print(f"[review-queue] 예약·제거 실패 — user[{userId}] q[{questionId}] {e!r}")

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
