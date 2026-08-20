import sys
import time
from datetime import datetime, timedelta, timezone

from sqlalchemy import func

from persistence.database import sessionScope
from persistence import repo_daily_activity, repo_learning_record, repo_chat, repo_flashcard
from shared.content_counts import MODULE_LABELS, LEARN_ROUTES, getTotalQuestionCount, getChapterQuestionCount


def _log(msg):
    print(f"[dashboard] {msg}", file=sys.stderr, flush=True)


KST = timezone(timedelta(hours=9))


def _calculateStreak(dates: list, today: str) -> int:
    if not dates:
        return 0
    date_set = set(dates)
    check = datetime.strptime(today, "%Y-%m-%d").date()
    if today not in date_set:
        check = check - timedelta(days=1)
    streak = 0
    while check.strftime("%Y-%m-%d") in date_set:
        streak += 1
        check = check - timedelta(days=1)
    return streak


def _buildContinueLearning(bookId, chapterSeq, menuType):
    bookLabel = f"{bookId}권"
    chapterLabel = f"{chapterSeq}과"
    moduleLabel = MODULE_LABELS.get(menuType, menuType)
    route = LEARN_ROUTES.get(menuType, "/learn/word")
    return {
        "bookId": bookId,
        "bookLabel": bookLabel,
        "chapterSeq": chapterSeq,
        "chapterLabel": chapterLabel,
        "menuType": menuType,
        "moduleLabel": moduleLabel,
        "route": route,
        "routeParams": {"book": bookId, "chapterSeq": chapterSeq},
    }


async def getDashboard(userId: str):
    now = datetime.now(KST)
    today = now.date()
    today_str = today.strftime("%Y-%m-%d")
    weekday = today.weekday()  # 0=월
    monday = today - timedelta(days=weekday)
    monday_str = monday.strftime("%Y-%m-%d")
    sunday_str = (monday + timedelta(days=6)).strftime("%Y-%m-%d")

    # 기본값
    progressPercent = 0
    todayCompleted = 0
    continueLearning = None
    weekDays = [False] * 7
    streak = 0
    weeklyWords = 0
    chartData = [0] * 7
    todayAdvanced = 0
    weeklyAdvanced = 0
    weeklyActivities = 0
    chapterCompleted = 0
    chapterTotal = 7
    chapterLabel = "학습 중"

    t_total = time.time()
    _log(f"user={userId} START — DB 커넥션 획득 중...")

    with sessionScope() as db:
        _log(f"user={userId} DB 커넥션 획득 완료 ({time.time() - t_total:.3f}s)")

        # ── 1) 전체 진행률 ──
        t = time.time()
        try:
            totalPossible = getTotalQuestionCount()
            progress_rows = await repo_learning_record.getProgressAll(userId, db)
            totalAnswered = sum(r.total for r in progress_rows) if progress_rows else 0
            progressPercent = min(round(totalAnswered / totalPossible * 100) if totalPossible > 0 else 0, 100)
        except Exception as e:
            _log(f"section 1 (진행률) FAILED: {e} ({time.time() - t:.3f}s)")
            db.rollback()
        else:
            elapsed = time.time() - t
            if elapsed > 1:
                _log(f"section 1 (진행률) SLOW: {elapsed:.3f}s")

        # ── 2) 오늘 완료 메뉴 수 ──
        t = time.time()
        try:
            todayCompleted = await repo_learning_record.countTodayMenuTypes(userId, today_str, db)
        except Exception as e:
            _log(f"section 2 (오늘완료) FAILED: {e} ({time.time() - t:.3f}s)")
            db.rollback()
        else:
            elapsed = time.time() - t
            if elapsed > 1:
                _log(f"section 2 (오늘완료) SLOW: {elapsed:.3f}s")

        # ── 3) 이어서 학습하기 ──
        t = time.time()
        try:
            lastRecord = await repo_learning_record.findLatestRecord(userId, db)
            if lastRecord:
                continueLearning = _buildContinueLearning(
                    lastRecord.book_id, lastRecord.chapter_seq, lastRecord.menu_type
                )
        except Exception as e:
            _log(f"section 3 (이어학습) FAILED: {e} ({time.time() - t:.3f}s)")
            db.rollback()
        else:
            elapsed = time.time() - t
            if elapsed > 1:
                _log(f"section 3 (이어학습) SLOW: {elapsed:.3f}s")

        # ── 4) 출석/스트릭/학습시간 차트 ──
        t = time.time()
        try:
            week_activities = await repo_daily_activity.findByDateRange(userId, monday_str, sunday_str, db)
            activity_dates = {a.activity_date for a in week_activities}
            for i in range(7):
                d = (monday + timedelta(days=i)).strftime("%Y-%m-%d")
                weekDays[i] = d in activity_dates
            for a in week_activities:
                d = datetime.strptime(a.activity_date, "%Y-%m-%d").date()
                idx = (d - monday).days
                if 0 <= idx < 7:
                    chartData[idx] = (a.study_seconds or 0) // 60
            weeklyWords = sum(a.words_learned for a in week_activities)

            recent = await repo_daily_activity.findRecentDates(userId, 365, db)
            recent_dates = [r[0] for r in recent]
            streak = _calculateStreak(recent_dates, today_str)

            latest = await repo_daily_activity.findLatest(userId, db)
            if latest and latest.last_book_id and latest.last_menu_type:
                continueLearning = _buildContinueLearning(
                    latest.last_book_id, latest.last_chapter_seq or 1, latest.last_menu_type
                )
        except Exception as e:
            _log(f"section 4 (출석차트) FAILED: {e} ({time.time() - t:.3f}s)")
            db.rollback()
        else:
            elapsed = time.time() - t
            if elapsed > 1:
                _log(f"section 4 (출석차트) SLOW: {elapsed:.3f}s")

        # ── 5) 심화학습 활동 수 ──
        t = time.time()
        try:
            if await repo_chat.hasCompletedChatOnDate(userId, today_str, db):
                todayAdvanced += 1
            weeklyAdvanced += await repo_chat.countCompletedChatDaysInRange(userId, monday_str, sunday_str, db)
            if await repo_flashcard.hasFlashcardActivityOnDate(userId, today_str, db):
                todayAdvanced += 1
            weeklyAdvanced += await repo_flashcard.countFlashcardActivityDaysInRange(userId, monday_str, sunday_str, db)
        except Exception as e:
            _log(f"section 5 (심화학습) FAILED: {e} ({time.time() - t:.3f}s)")
            db.rollback()
        else:
            elapsed = time.time() - t
            if elapsed > 1:
                _log(f"section 5 (심화학습) SLOW: {elapsed:.3f}s")

        # ── 6) 주간 활동 수 ──
        t = time.time()
        try:
            weeklyActivities = await repo_learning_record.countWeekMenuActivities(userId, monday_str, sunday_str, db)
        except Exception as e:
            _log(f"section 6 (주간활동) FAILED: {e} ({time.time() - t:.3f}s)")
            db.rollback()
        else:
            elapsed = time.time() - t
            if elapsed > 1:
                _log(f"section 6 (주간활동) SLOW: {elapsed:.3f}s")

        weeklyActivities += weeklyAdvanced
        todayCompleted += todayAdvanced

        # ── 7) 현재 과 진행률 ──
        if continueLearning:
            bookId = continueLearning["bookId"]
            chapterSeq = continueLearning["chapterSeq"]
            chapterTotal = getChapterQuestionCount(bookId, chapterSeq) or 0
            chapterLabel = f"{continueLearning['chapterLabel']} 학습 중"
            t = time.time()
            try:
                progress_rows = await repo_learning_record.getProgress(userId, bookId, chapterSeq, db)
                chapterCompleted = sum(r.total for r in progress_rows) if progress_rows else 0

                totalDialogs = await repo_chat.countDialogsForBook(bookId, db)
                completedDialogs = await repo_chat.countCompletedChatsForBook(userId, bookId, db)
                chapterTotal += totalDialogs
                chapterCompleted += completedDialogs

                completedFlashcards = await repo_flashcard.countCompletedFlashcardsForBook(userId, bookId, db)
                chapterCompleted += completedFlashcards

                from persistence import model as mdl
                totalFlashcardSets = db.query(
                    func.count(func.distinct(mdl.UserFlashcard.flashcard_id))
                ).filter(mdl.UserFlashcard.book_id == bookId).scalar() or 0
                if totalFlashcardSets == 0:
                    totalFlashcardSets = 1
                chapterTotal += totalFlashcardSets
            except Exception as e:
                _log(f"section 7 (과진행률) FAILED: {e} ({time.time() - t:.3f}s)")
                db.rollback()
            else:
                elapsed = time.time() - t
                if elapsed > 1:
                    _log(f"section 7 (과진행률) SLOW: {elapsed:.3f}s")
            if chapterTotal == 0:
                chapterTotal = 7

    total_elapsed = time.time() - t_total
    _log(f"user={userId} DONE: {total_elapsed:.3f}s")

    return {
        "attendance": {
            "weekDays": weekDays,
            "todayIndex": weekday,
            "streak": streak,
        },
        "continueLearning": continueLearning,
        "learningStatus": {
            "chapterCompleted": chapterCompleted,
            "chapterTotal": chapterTotal,
            "chapterLabel": chapterLabel,
            "todayActivities": todayCompleted,
            "weeklyActivities": weeklyActivities,
        },
        "weeklyChart": {
            "data": chartData,
        },
    }
