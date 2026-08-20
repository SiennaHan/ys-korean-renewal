from datetime import datetime, timedelta, timezone

from persistence.database import sessionScope
from persistence import repo_study_session, repo_daily_activity

KST = timezone(timedelta(hours=9))
GAP_THRESHOLD = timedelta(minutes=5)
PING_CAP_SEC = 60  # 핑당 최대 추가 초


async def ping(userId: str, context: str = None):
    try:
        with sessionScope() as db:
            now = datetime.now(KST)
            today = now.strftime("%Y-%m-%d")

            session = await repo_study_session.findLatestToday(userId, today, db)

            if session and session.last_ping_at:
                last_ping = session.last_ping_at
                if last_ping.tzinfo is None:
                    last_ping = last_ping.replace(tzinfo=KST)
                gap = now - last_ping

                if gap < GAP_THRESHOLD:
                    elapsed = min(int(gap.total_seconds()), PING_CAP_SEC)
                    session.duration_sec = (session.duration_sec or 0) + elapsed
                    session.last_ping_at = now
                    db.flush()
                else:
                    session = await repo_study_session.create(userId, today, now, db)
            else:
                session = await repo_study_session.create(userId, today, now, db)

            # 일별 학습 시간 갱신
            total_sec = await repo_study_session.sumDurationToday(userId, today, db)
            await repo_daily_activity.updateStudySeconds(userId, today, total_sec, db)

            return {"sessionId": session.id}
    except Exception:
        return {"sessionId": None}
