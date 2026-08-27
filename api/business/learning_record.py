from datetime import datetime, timedelta, timezone

from fastapi.encoders import jsonable_encoder
from persistence.database import sessionScope
from persistence import repo_learning_record, repo_daily_activity, repo_review_queue, repo_activity_state

KST = timezone(timedelta(hours=9))


async def saveRecord(userId: str, bookId: int, chapterSeq: int, menuType: str, questionId: int, selectedAnswer: str, isCorrect: bool, sub: int = 0, skipped: bool = False, review: bool = False):
    """문항 하나를 기록한다. 오답·건너뜀이면 다시 풀기에 예약하고, 맞히면 뺀다.

    **예약은 첫 시도 기준이다**(dev_spec §2.1, 셸 명세 S1). 재시도로 맞혀도 큐에
    남는다 — 그래서 `created` 일 때만 넣는다. 반대로 제거는 시도 회차를 보지 않는다:
    다시 풀기에서 맞히면 빼야 하고 그것은 두 번째 이후 시도다.

    자동 제거를 서버가 하는 이유는 왕복을 줄이는 것이다(§3 의 권장).
    """
    with sessionScope() as db:
        if skipped:
            # **건너뛴 것은 푼 것이 아니다** — 학습 기록을 만들지 않는다
            # (기획 확정 2026-08-27: "건너뛴거는 푼 게 아니지. 맞혔든 틀렸든
            #  풀어야지만 완료라고 해야지").
            #
            # 행을 만들면 조용히 세 곳이 부풀어 오른다:
            #   getProgressAll        정오답을 안 가리고 **행 수**를 센다 → 전체 진행률
            #   countTodayMenuTypes   그 메뉴를 오늘 학습한 것으로 센다
            #   getProgress           그 과의 total 분모
            # 즉 건너뛰기만 눌러도 진행률이 오른다. 다시 풀기 예약만 남긴다.
            #
            # "첫 시도인가" 는 행이 있나로 가른다 — 이미 푼 문항을 나중에 건너뛰어도
            # 큐에 새로 들어가지 않는다(그 문항은 이미 풀었다).
            record = await repo_learning_record.findOne(
                userId, bookId, chapterSeq, menuType, questionId, db
            )
            created = record is None
        else:
            record, created = await repo_learning_record.upsert(userId, bookId, chapterSeq, menuType, questionId, selectedAnswer, isCorrect, db)

        # 다시 풀기 예약·제거. 표가 아직 없는 환경에서도 학습 기록은 남아야 하므로 감싼다
        try:
            if isCorrect and not skipped and created:
                # **건너뛴 뒤 돌아가서 첫 시도에 맞혔다 — 빼야 한다.**
                #
                # 이 경우가 2026-08-27 에 생겼다. 건너뛰기가 큐에 예약을 남기게
                # 되면서, 학습자가 진행바로 돌아가 그 문항을 풀어도 예약이 그대로
                # 남았다 — 내일 홈이 **이미 맞힌 문항**을 "다시 풀 문항" 으로 센다.
                #
                # `created` 를 같이 보는 것이 안전장치다. 아래 주석이 말하는
                # "재시도로 맞힌 것" 은 기록 행이 이미 있어 `created` 가 거짓이므로
                # 여기 오지 않는다. 즉 이 갈래는 **첫 시도 정답**뿐이고, 첫 시도
                # 정답인데 큐에 있는 문항은 건너뜀으로 들어간 것밖에 없다.
                await repo_review_queue.remove(
                    userId, bookId, chapterSeq, menuType, sub, questionId, db
                )
            elif isCorrect and not skipped and review:
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

        # 응답이 다 찼으면 활동을 완료로 올린다.
        #
        # **다시 풀기 세션은 `POST /activity/complete` 를 안 부른다**(§3.3) — 그런데
        # 새 완료 기준(§1)에서는 건너뛴 문항을 그 세션에서 풀어야 완료가 된다.
        # 그래서 문항이 기록될 때마다 서버가 스스로 본다. 성적은 안 덮는다.
        if not skipped:
            try:
                await repo_activity_state.markCompletedIfAllAnswered(
                    userId, bookId, chapterSeq, menuType, sub, db
                )
            except Exception as e:
                print(f"[activity-state] 완료 재판정 실패 — user[{userId}] {e!r}")

        # 일별 활동 갱신 (출석 자동 기록) — 테이블 미생성 시에도 학습 기록은 정상 저장
        try:
            today = datetime.now(KST).strftime("%Y-%m-%d")
            # 마지막 학습 지점은 재시도에도 갱신한다 — 다시 푸는 것도 학습이다
            await repo_daily_activity.updateLastStudy(userId, today, bookId, chapterSeq, menuType, db)
            # **스트릭의 기준** — 그날 응답이 하나라도 있었나(기획 확정 2026-08-27).
            #
            # **건너뜀은 응답이 아니다.** 위 `if skipped:` 갈래는 기록 행만 안 만들고
            # **여기까지 그대로 흘러온다** — 처음에 "일찍 돌아가니 안 닿는다" 고 적어
            # 두었다가 실제로 굴려 보고 틀린 것을 알았다(건너뛰기만 했는데 스트릭이
            # 1 이 됐다). 그래서 여기서 다시 가른다.
            if not skipped:
                await repo_daily_activity.markResponded(userId, today, db)
            # 학습 단어 수는 누적값이라 첫 시도에만 센다. 전에는 재시도마다 +1 이라
            # 같은 문항을 세 번 고치면 세 단어를 배운 것으로 찍혔다 (dev_spec §2.1)
            # 건너뛴 것은 배운 것이 아니다 — 위 skipped 주석과 같은 이유
            if menuType == "word" and created and not skipped:
                await repo_daily_activity.incrementWordsLearned(userId, today, db)
        except Exception:
            pass

        # 건너뜀이고 그 문항의 기록이 아직 없으면 `record` 는 None 이다 —
        # 만들지 않기로 했으므로 정상이다. 호출부는 반환을 쓰지 않는다
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
