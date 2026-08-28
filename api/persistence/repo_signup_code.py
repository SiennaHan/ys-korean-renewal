"""기관 발급 코드의 저장소 접근.

**이 파일의 핵심은 `consumeSeat` 하나다.** 나머지는 평범한 조회·삽입이다.
"""
from datetime import datetime, timezone

from sqlalchemy import func, or_, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from persistence import model
from util import codeutils


def utcNow() -> datetime:
    """DB 의 시각 칸은 전부 `func.utc_timestamp()` 기본값이다.

    **`util/timeutils.now()` 를 쓰면 안 된다** — 그쪽은 KST 라 9시간 어긋난다.
    비교와 저장이 한 축에 있어야 기한 판정이 맞는다.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def findByCode(code: str, db: Session):
    """정규화된 코드로 한 장을 찾는다. 호출부가 정규화해서 넘긴다."""
    return db.query(model.KoSignupCode).filter(model.KoSignupCode.code == code).first()


async def findById(codeId: int, db: Session):
    return db.query(model.KoSignupCode).filter(model.KoSignupCode.id == codeId).first()


async def findBySchool(schoolCode: str, db: Session, status: str = None, keyword: str = None):
    """어드민 목록 — 우리 학교 것을 최신순. `ix_signup_code_school` 이 덮는다."""
    q = db.query(model.KoSignupCode)
    if schoolCode:
        q = q.filter(model.KoSignupCode.school_code == schoolCode)
    if status:
        q = q.filter(model.KoSignupCode.status == status)
    if keyword:
        like = f"%{keyword}%"
        q = q.filter(or_(model.KoSignupCode.code.like(like),
                         model.KoSignupCode.label.like(like)))
    return q.order_by(model.KoSignupCode.created_at.desc()).all()


async def createWithNewCode(row: model.KoSignupCode, db: Session, tries: int = 5):
    """코드를 만들어 넣는다. 충돌하면 다시 만든다.

    **「조회해서 없으면 삽입」이 아니다.** 그 사이에 남이 같은 코드를 넣을 수 있다.
    `uq_signup_code_code` 가 진짜 심판이고, 여기서는 그 판정을 받아 다시 굴린다.

    `SAVEPOINT`(`begin_nested`)를 쓰는 이유 — `IntegrityError` 가 나면 그 트랜잭션은
    더 못 쓴다. 중첩 트랜잭션 안에서 터뜨려야 바깥을 살린 채로 재시도할 수 있다.
    """
    for _ in range(tries):
        row.code = codeutils.generateCode()
        try:
            with db.begin_nested():
                db.add(row)
                db.flush()
            db.refresh(row)
            return row
        except IntegrityError:
            continue
    return None


async def consumeSeat(codeId: int, db: Session) -> bool:
    """자리 하나를 확보한다. 확보했으면 True.

    **읽고 → 비교하고 → 쓰기로 하면 정원이 넘는다.** 워커 둘이 29/30 을 같이 읽고
    둘 다 30 을 쓴다(`start.sh` 가 `gunicorn -w 4` 다).

    조건부 UPDATE 한 방이면 InnoDB 가 막아 준다 — 잠금 대기에서 풀린 트랜잭션은
    `WHERE` 를 **커밋된 최신 값으로 다시 평가**하므로, 진 쪽은 rowcount 0 을 받는다.
    마지막 한 자리는 정확히 한 명에게 간다.

    `synchronize_session=False` 는 필수다. 기본값은 세션 안 객체를 맞추려다
    느려지거나 터진다.

    **호출 전에 비밀번호 해시를 끝내 두어라.** bcrypt 12라운드는 250ms 이상이고,
    잠금을 쥔 채 해시하면 서른 명이 직렬화되어 `read_timeout: 10` 에 먼저 걸린다 —
    그러면 「정원이 찼다」가 아니라 커넥션 오류로 터진다.
    """
    n = (db.query(model.KoSignupCode)
           .filter(model.KoSignupCode.id == codeId,
                   model.KoSignupCode.status == "active",
                   model.KoSignupCode.used_count < model.KoSignupCode.max_uses,
                   model.KoSignupCode.expires_at > func.utc_timestamp(),
                   or_(model.KoSignupCode.starts_at.is_(None),
                       model.KoSignupCode.starts_at <= func.utc_timestamp()))
           .update({"used_count": model.KoSignupCode.used_count + 1},
                   synchronize_session=False))
    return n == 1


async def recordUse(codeId: int, userId: int, schoolCode: str, db: Session):
    use = model.KoSignupCodeUse()
    use.code_id = codeId
    use.user_id = userId
    use.school_code = schoolCode
    db.add(use)
    db.flush()
    return use


async def findUses(codeId: int, db: Session):
    return (db.query(model.KoSignupCodeUse)
              .filter(model.KoSignupCodeUse.code_id == codeId)
              .order_by(model.KoSignupCodeUse.used_at.desc())
              .all())


async def countUses(codeIds: list, db: Session) -> dict:
    """코드별 실제 사용 수. 카운터가 어긋났는지 볼 때 쓴다."""
    if not codeIds:
        return {}
    rows = (db.query(model.KoSignupCodeUse.code_id, func.count(model.KoSignupCodeUse.id))
              .filter(model.KoSignupCodeUse.code_id.in_(codeIds))
              .group_by(model.KoSignupCodeUse.code_id)
              .all())
    return {cid: n for cid, n in rows}


async def updateCode(codeId: int, updates: dict, db: Session):
    row = await findById(codeId, db)
    if not row:
        return None
    for key, value in updates.items():
        if hasattr(row, key):
            setattr(row, key, value)
    db.flush()
    db.refresh(row)
    return row


# ── 무차별 대입 차단 ───────────────────────────────────────────────

FAIL_WINDOW_MINUTES = 10
FAIL_LIMIT = 10


async def countRecentFails(ipHash: str, db: Session) -> int:
    """최근 `FAIL_WINDOW_MINUTES` 분 동안 이 IP 의 실패 수.

    `ix_signup_code_attempt_ip_time` 이 그대로 덮는다. 정상 학생은 오타 두세 번이면
    끝나고, 강의실에서 서른 명이 같은 코드를 정확히 치는 것은 **성공**이라
    여기 안 잡힌다.
    """
    return (db.query(func.count(model.KoSignupCodeAttempt.id))
              .filter(model.KoSignupCodeAttempt.ip_hash == ipHash,
                      model.KoSignupCodeAttempt.ok.is_(False),
                      model.KoSignupCodeAttempt.tried_at >
                      func.date_sub(func.utc_timestamp(),
                                    text(f"INTERVAL {FAIL_WINDOW_MINUTES} MINUTE")))
              .scalar()) or 0


async def recordAttempt(ipHash: str, ok: bool, db: Session):
    """성패를 한 줄 남긴다. **시도한 코드 값은 남기지 않는다.**"""
    row = model.KoSignupCodeAttempt()
    row.ip_hash = ipHash
    row.ok = bool(ok)
    db.add(row)
    db.flush()
    return row
