"""기관 발급 코드 — 발급·목록·정지.

**권한 판정이 전부 여기 있다.** accepter 는 토큰만 넘기고 아무것도 정하지 않는다.

세 가지가 이 파일의 이유다.

1. **토큰을 믿지 않는다.** `signAdminJwt` 의 exp 가 30일이고 세 인증 클래스
   (`accepter/auth.py`)는 DB 를 안 본다. 그래서 토큰의 `school_code` 는 최대
   30일 낡을 수 있고, 정지된 관리자도 그동안 통과한다. 발급은 되돌리기 어려운
   일이므로 `sub` 로 계정을 다시 읽는다.
2. **`AdminRequired` 는 `student_admin` 도 통과시킨다**(`auth.py`). 발급 주체는
   `master_admin` 과 `school_admin` 둘뿐이라 여기서 한 번 더 가른다.
3. **자기 학교를 검사하지 않고 덮어쓴다.** 검사만 하면 필드가 늘 때마다
   빠뜨린다 — `POST /student/batch` 에서 실제로 벌어진 일이다.
"""
from datetime import datetime, timedelta, timezone

from fastapi.encoders import jsonable_encoder

from persistence import model, repo_school, repo_signup_code, repo_user
from persistence.database import sessionScope
from util import codeutils

# 학교 관리자의 한도 (2026-08-28 기획 확정). 마스터는 이 한도를 안 받는다.
SCHOOL_MAX_USES = 500
SCHOOL_MAX_DAYS = 92      # "3개월" — 7·8·9월이 92일로 가장 길다
# 마스터도 무기한은 못 만든다. 기한 없는 코드는 새어 나가면 영구히 새는 코드다.
MASTER_MAX_DAYS = 3650

ISSUER_ROLES = ("master_admin", "school_admin")


KST = timezone(timedelta(hours=9))


def _utcNow():
    """**`util/timeutils.now()` 를 쓰지 마라** — 그쪽은 KST 라 9시간 어긋난다.

    DB 의 시각 칸은 전부 `UTC_TIMESTAMP()` 기본값이고 비교도 UTC 로 한다.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


def parseDayEndUtc(day: str):
    """`"2026-11-30"` → **그 날 한국 시간이 끝나는 순간**을 UTC 로.

    어드민은 날짜만 고른다. "11월 30일까지" 를 UTC 자정으로 저장하면
    **한국 시간 11월 30일 오전 9시에 막힌다.** 학교가 마지막 날 오후에
    코드를 나눠 주면 그날 아무도 못 들어온다.

    변환이 여기 한 곳에만 있는 이유도 같다 — 두 곳에 두면 한쪽만 고쳐진다.
    """
    if not day:
        return None
    try:
        d = datetime.strptime(str(day)[:10], "%Y-%m-%d")
    except ValueError:
        return None
    end = d.replace(hour=23, minute=59, second=59, tzinfo=KST)
    return end.astimezone(timezone.utc).replace(tzinfo=None)


def parseDayStartUtc(day: str):
    """`"2026-09-01"` → 그 날 한국 시간이 시작하는 순간을 UTC 로."""
    if not day:
        return None
    try:
        d = datetime.strptime(str(day)[:10], "%Y-%m-%d")
    except ValueError:
        return None
    start = d.replace(hour=0, minute=0, second=0, tzinfo=KST)
    return start.astimezone(timezone.utc).replace(tzinfo=None)


def statusOf(row, now=None) -> str:
    """목록에 보여 줄 상태. **서버가 낸다.**

    브라우저 시계로 만료를 판정하면 시계가 틀린 어드민에게 다른 화면이 보인다.
    앱이 권한을 계산하지 않는 것과 같은 이유다.
    """
    now = now or _utcNow()
    if row.status == "revoked":
        return "disabled"
    if row.status == "paused":
        return "paused"
    if row.expires_at and row.expires_at <= now:
        return "expired"
    if row.starts_at and row.starts_at > now:
        return "scheduled"
    if row.used_count >= row.max_uses:
        return "full"
    return "active"


def toDict(row, schoolName: str = None) -> dict:
    """어드민에 내주는 모양. `code` 는 **보여 주는 꼴**로 낸다(저장은 하이픈 없이)."""
    return {
        "id": row.id,
        "code": codeutils.formatCode(row.code),
        "schoolCode": row.school_code,
        "schoolName": schoolName,
        "label": row.label,
        "maxUses": row.max_uses,
        "usedCount": row.used_count,
        "remaining": max(0, row.max_uses - row.used_count),
        "startsAt": row.starts_at,
        "expiresAt": row.expires_at,
        "status": statusOf(row),
        "issuedByRole": row.issued_by_role,
        "createdAt": row.created_at,
    }


async def _caller(userId, db):
    """발급 주체를 DB 에서 다시 읽고 자격을 본다. (계정, 역할, 학교) 또는 (None, 오류)."""
    if not str(userId).isdigit():
        return None, "권한이 없습니다."
    user = await repo_user.findById(int(userId), db)
    if not user or not user.is_active or not user.is_approved:
        return None, "권한이 없습니다."
    if user.role not in ISSUER_ROLES:
        return None, "코드를 발급할 권한이 없습니다."
    return user, None


async def issueCode(callerUserId, schoolCode: str, maxUses: int, expiresAt: datetime,
                    label: str = None, startsAt: datetime = None):
    """코드 한 장을 만든다. (dict, None) 또는 (None, 오류문구)."""
    with sessionScope() as db:
        caller, err = await _caller(callerUserId, db)
        if err:
            return None, err

        if caller.role == "school_admin":
            if not caller.school_code:
                return None, "소속 학교가 없는 계정입니다. 마스터 관리자에게 문의하세요."
            # **검사가 아니라 덮어쓰기다.** 요청이 준 값은 보지 않는다
            schoolCode = caller.school_code
            maxDays = SCHOOL_MAX_DAYS
            if maxUses > SCHOOL_MAX_USES:
                return None, f"학교 계정은 코드 한 장에 최대 {SCHOOL_MAX_USES}명까지 발급할 수 있습니다."
        else:
            maxDays = MASTER_MAX_DAYS

        if not schoolCode:
            return None, "학교를 선택해 주세요."
        if not maxUses or maxUses < 1:
            return None, "수량을 1명 이상으로 입력해 주세요."
        if not expiresAt:
            return None, "사용 기간의 종료일을 입력해 주세요."

        school = await repo_school.findByCode(schoolCode, db)
        if not school:
            return None, "등록되지 않은 학교입니다."

        now = _utcNow()
        if expiresAt <= now:
            return None, "종료일이 이미 지났습니다."
        if expiresAt > now + timedelta(days=maxDays):
            if caller.role == "school_admin":
                return None, f"학교 계정은 최대 {SCHOOL_MAX_DAYS}일(3개월)까지 발급할 수 있습니다."
            return None, f"기간은 최대 {maxDays}일까지입니다."
        if startsAt and startsAt >= expiresAt:
            return None, "시작일이 종료일보다 늦습니다."

        row = model.KoSignupCode()
        row.school_code = schoolCode
        row.label = (label or None)
        row.max_uses = int(maxUses)
        row.used_count = 0
        row.starts_at = startsAt
        row.expires_at = expiresAt
        row.status = "active"
        row.issued_by_user_id = caller.id
        # 발급 당시 역할을 박제한다 — 나중에 승격되면 한도 판정을 못 한다
        row.issued_by_role = caller.role

        created = await repo_signup_code.createWithNewCode(row, db)
        if not created:
            return None, "코드를 만들지 못했습니다. 잠시 후 다시 시도해 주세요."
        return jsonable_encoder(toDict(created, school.school_name)), None


async def listCodes(callerUserId, schoolCode: str = None, status: str = None, keyword: str = None):
    with sessionScope() as db:
        caller, err = await _caller(callerUserId, db)
        if err:
            return None, err
        if caller.role == "school_admin":
            schoolCode = caller.school_code   # 요청의 값을 무시하고 덮는다
        rows = await repo_signup_code.findBySchool(schoolCode, db, keyword=keyword)
        names = {}
        for r in rows:
            if r.school_code not in names:
                s = await repo_school.findByCode(r.school_code, db)
                names[r.school_code] = s.school_name if s else None
        out = [toDict(r, names.get(r.school_code)) for r in rows]
        if status:
            out = [d for d in out if d["status"] == status]
        return jsonable_encoder(out), None


async def _ownedCode(callerUserId, codeId: int, db):
    """내가 손댈 수 있는 코드인가.

    **없는 코드와 남의 학교 코드에 같은 문구를 낸다.** 다르게 말하면 id 를 훑어
    남의 학교가 코드를 몇 장 가졌는지 셀 수 있다.
    """
    caller, err = await _caller(callerUserId, db)
    if err:
        return None, None, err
    row = await repo_signup_code.findById(codeId, db)
    if not row:
        return None, None, "코드를 찾을 수 없습니다."
    if caller.role == "school_admin" and row.school_code != caller.school_code:
        return None, None, "코드를 찾을 수 없습니다."
    return caller, row, None


async def updateCode(callerUserId, codeId: int, maxUses: int = None, expiresAt: datetime = None,
                     label: str = None, status: str = None):
    with sessionScope() as db:
        caller, row, err = await _ownedCode(callerUserId, codeId, db)
        if err:
            return None, err

        updates = {}
        if label is not None:
            updates["label"] = label or None
        if status is not None:
            if status not in ("active", "paused"):
                return None, "상태 값이 올바르지 않습니다."
            if row.status == "revoked":
                return None, "이미 삭제된 코드입니다."
            updates["status"] = status
        if maxUses is not None:
            if maxUses < row.used_count:
                return None, f"이미 {row.used_count}명이 사용해 그보다 적게 줄일 수 없습니다."
            # 한도는 **늘릴 때도** 다시 본다 — 안 그러면 30으로 만들고 5000으로 고친다
            if caller.role == "school_admin" and maxUses > SCHOOL_MAX_USES:
                return None, f"학교 계정은 코드 한 장에 최대 {SCHOOL_MAX_USES}명까지 발급할 수 있습니다."
            updates["max_uses"] = int(maxUses)
        if expiresAt is not None:
            now = _utcNow()
            maxDays = SCHOOL_MAX_DAYS if caller.role == "school_admin" else MASTER_MAX_DAYS
            if expiresAt > now + timedelta(days=maxDays):
                return None, f"기간은 최대 {maxDays}일까지입니다."
            updates["expires_at"] = expiresAt

        if not updates:
            return None, "변경할 내용이 없습니다."
        updated = await repo_signup_code.updateCode(codeId, updates, db)
        school = await repo_school.findByCode(updated.school_code, db)
        return jsonable_encoder(toDict(updated, school.school_name if school else None)), None


async def revokeCode(callerUserId, codeId: int):
    """**행을 지우지 않는다.** 사용 이력이 이 행을 가리킨다."""
    with sessionScope() as db:
        _caller_, row, err = await _ownedCode(callerUserId, codeId, db)
        if err:
            return None, err
        await repo_signup_code.updateCode(codeId, {"status": "revoked"}, db)
        return {"id": codeId, "status": "disabled"}, None


async def listUses(callerUserId, codeId: int):
    """누가 언제 이 코드로 가입했나."""
    with sessionScope() as db:
        _caller_, row, err = await _ownedCode(callerUserId, codeId, db)
        if err:
            return None, err
        uses = await repo_signup_code.findUses(row.id, db)
        out = []
        for u in uses:
            user = await repo_user.findById(u.user_id, db)
            out.append({
                "userId": u.user_id,
                "name": user.name if user else None,
                "email": user.email if user else None,
                "usedAt": u.used_at,
            })
        return jsonable_encoder(out), None


# ── accepter 가 부르는 자리 ─────────────────────────────────────────
#
# 날짜 문자열을 받아 시각으로 바꾼 뒤 위 함수에 넘긴다.
# **accepter 는 아무것도 판단하지 않는다** — 토큰과 본문만 넘긴다.

async def issueFromRequest(callerUserId, body):
    expiresAt = parseDayEndUtc(body.expires_on)
    if not expiresAt:
        return None, "종료일을 YYYY-MM-DD 로 입력해 주세요."
    startsAt = None
    if body.starts_on:
        startsAt = parseDayStartUtc(body.starts_on)
        if not startsAt:
            return None, "시작일을 YYYY-MM-DD 로 입력해 주세요."
    return await issueCode(callerUserId, body.school_code, body.max_uses,
                           expiresAt, label=body.label, startsAt=startsAt)


async def updateFromRequest(callerUserId, codeId: int, body):
    expiresAt = None
    if body.expires_on:
        expiresAt = parseDayEndUtc(body.expires_on)
        if not expiresAt:
            return None, "종료일을 YYYY-MM-DD 로 입력해 주세요."
    return await updateCode(callerUserId, codeId, maxUses=body.max_uses,
                            expiresAt=expiresAt, label=body.label, status=body.status)


# ── 학생용 ──────────────────────────────────────────────────────

def clientIpHash(request) -> str:
    """요청의 IP 를 해시로. **`qr_tracking` 의 것을 그대로 쓴다.**

    거기에 `cf-connecting-ip` → `x-real-ip` → `x-forwarded-for` 순서와
    IP 형식 검증이 이미 들어 있다. 새로 쓰면 프록시 헤더를 빠뜨린다.
    """
    from business import qr_tracking
    ip = qr_tracking.get_client_ip(dict(request.headers), request.client.host if request.client else None)
    return qr_tracking._hash(ip)


async def verifyCode(code: str, ipHash: str = None):
    """학생이 넣은 코드를 확인한다. **학교 이름만 돌려준다.**

    `school_code` 도 남은 자리 수도 내주지 않는다 — 학생이 확인해야 하는 것은
    "내 학교가 맞나" 뿐이고, 나머지는 무인증 엔드포인트로 새어 나갈 이유가 없다.

    **`codeInvalid` 와 `codeExpired`·`codeFull` 을 가른다.** 존재 여부가 새는 것은
    맞지만, 기한이 지난 코드를 든 학생에게 "잘못된 코드" 라고 하면 교수에게 새
    코드를 달라고 말할 방법이 없다. 코드를 하나 찾아냈어도 서른 자리를 실제로
    쓰려면 이메일 서른 개로 가입해야 하므로, 아래 시도 제한이 있는 한 값이 없다.
    """
    normalized = codeutils.normalizeCode(code)
    if not normalized:
        return {"valid": False, "reason": "codeRequired"}, None

    with sessionScope() as db:
        if ipHash:
            fails = await repo_signup_code.countRecentFails(ipHash, db)
            if fails >= repo_signup_code.FAIL_LIMIT:
                # 429 를 내면 앱이 통째로 throw 해서 이유가 뭉개진다 —
                # HTTP 200 에 사유를 실어 낸다
                return {"valid": False, "reason": "tooManyTries",
                        "retryAfterSec": repo_signup_code.FAIL_WINDOW_MINUTES * 60}, None

        row = await repo_signup_code.findByCode(normalized, db)
        ok = False
        if not row:
            reason = "codeInvalid"
        else:
            st = statusOf(row)
            if st == "active":
                ok, reason = True, None
            else:
                reason = {"full": "codeFull", "expired": "codeExpired",
                          "paused": "codePaused", "disabled": "codeDisabled",
                          "scheduled": "codeNotStarted"}.get(st, "codeInvalid")

        if ipHash:
            await repo_signup_code.recordAttempt(ipHash, ok, db)

        if not ok:
            return {"valid": False, "reason": reason}, None

        school = await repo_school.findByCode(row.school_code, db)
        return {"valid": True, "schoolName": school.school_name if school else None}, None
