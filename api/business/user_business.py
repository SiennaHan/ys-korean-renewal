import re

import bcrypt
from fastapi.encoders import jsonable_encoder

from accepter import auth
from persistence.database import sessionScope
from persistence import repo_user, model
from business.auth_business import hashPassword
from sqlalchemy.exc import IntegrityError


def verifyPassword(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


async def loginAsStudent(email: str, password: str):
    """학생 로그인.

    **오류는 한국어 문장이 아니라 코드로 낸다** — `signUpStudent` 와 같은 규칙이다.
    이 앱을 쓰는 사람은 전부 한국어를 배우는 중이고 화면은 5개 언어인데,
    전에는 여기만 문장을 내서 **영어·베트남어 화면에서도 한국어 오류가 떴다**
    (2026-08-28 에 바꿨다). 앱이 `login.err_*` 로 옮긴다.

    **없는 계정과 틀린 비밀번호에 같은 코드를 낸다** — 다르게 말하면
    이메일을 훑어 가입 여부를 알아낼 수 있다.
    """
    with sessionScope() as db:
        user = await repo_user.findByEmail(email, db)
        if not user:
            return None, "loginFailed"

        if not user.is_active:
            return None, "accountInactive"

        if not verifyPassword(password, user.password_hash):
            return None, "loginFailed"

        token = auth.signJwt(str(user.id), None, [user.role])
        return {
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "schoolCode": user.school_code,
            }
        }, None


PASSWORD_RULES = (
    ("length", lambda p: len(p) >= 8),
    ("upper", lambda p: any(c.isupper() for c in p)),
    ("digit", lambda p: any(c.isdigit() for c in p)),
)

_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def checkPassword(password: str) -> list[str]:
    """못 지킨 규칙의 이름을 낸다. 다 지켰으면 빈 목록.

    규칙은 목업(`docs/draft_auth.html` 의 가입 화면)이 화면에 적어 둔 셋과
    같다 — 8자 이상 · 대문자 1개 · 숫자 1개. **앱이 같은 규칙을 화면에서도
    보여 주지만 판정은 여기서 한 번 더 한다** — 앱을 거치지 않고 부를 수 있다.
    """
    return [name for name, ok in PASSWORD_RULES if not ok(password)]


def _validateSignup(email: str, password: str, name: str):
    """가입 입력 검사. `(이메일, 이름, 오류코드)` — 오류가 없으면 셋째가 None.

    **오류는 한국어 문장이 아니라 코드로 낸다.** 이 앱을 쓰는 사람은 전부
    한국어를 배우는 중이고 화면은 5개 언어다 — 영어 화면에서 한국어 오류가
    뜨면 무엇이 잘못됐는지 읽을 수가 없다. 앱이 `signup.err_*` 로 옮긴다.

    **코드 가입과 이 함수를 같이 쓴다.** 복사해 두면 한쪽만 고쳐진다.
    """
    email = (email or "").strip().lower()
    name = (name or "").strip()
    if not _EMAIL.match(email):
        return email, name, "emailInvalid"
    if not name:
        return email, name, "nameRequired"
    if checkPassword(password or ""):
        return email, name, "passwordWeak"
    return email, name, None


async def _finishSignup(userId, userEmail, userName, schoolCode, guestId):
    """가입이 끝난 뒤 — 게스트 기록을 옮기고 토큰을 낸다. 두 가입 경로가 같이 쓴다.

    **게스트 이전이 실패해도 가입은 성공이다**(§07 의 2번) — 계정이 생겼는데
    "가입 실패" 라고 말하면 다시 가입할 수도 없다.

    학생 토큰에는 `school_code` 를 싣지 않는다(`auth.signJwt` 의 payload).
    `getEntitlement` 가 매번 DB 를 읽으므로 넣을 이유가 없고, 넣으면 30일 낡는
    두 번째 진실이 생긴다.
    """
    migrated = None
    if guestId:
        try:
            migrated = await migrateGuestData(str(userId), guestId)
        except Exception as e:
            print(f"[signup] 게스트 이전 실패 — user[{userId}] guest[{guestId}] {e!r}")

    return {
        "token": auth.signJwt(str(userId), None, ["student"]),
        "user": {
            "id": userId,
            "email": userEmail,
            "name": userName,
            "role": "student",
            "schoolCode": schoolCode,
        },
        "migrated": migrated,
    }


async def signUpStudent(email: str, password: str, name: str, guestId: str = None):
    """학생이 스스로 계정을 만든다 — access_and_pricing_v1 §08 의 1번 · §09 의 4단계.

    **`/auth/signup` 과 다르다.** 저쪽은 어학당 콘솔용이라
    `role="school_admin"` · `is_approved=False` 로 만든다. 개인 가입자가 그 길로
    들어오면 승인 대기로 앉아 아무것도 못 한다 — §08 이 "둘을 같이 고쳐야 한다"
    고 적은 것이 이것이다. 여기서는 **승인 없이 바로 활성**이다. 승인은 학교가
    학생을 일괄 등록할 때 쓰는 장치이지 개인 구매자에게 쓸 것이 아니다.

    `school_code` 를 비운다 — 그래야 `GET /entitlement` 가 `guest` 를 내고
    앱이 결제를 안내한다. 학교 소속이면 `school` 이 되어 「학교에 문의」가 뜬다.
    """
    email, name, err = _validateSignup(email, password, name)
    if err:
        return None, err

    with sessionScope() as db:
        if await repo_user.findByEmail(email, db):
            return None, "emailTaken"

        user = model.KoUser()
        user.email = email
        user.password_hash = hashPassword(password)
        user.name = name
        user.role = "student"
        user.school_code = None
        user.is_approved = True
        user.is_active = True
        created = await repo_user.createUser(user, db)

        # 세션 안에서 값으로 뽑는다 — 블록을 나온 뒤 읽으면 DetachedInstanceError 다
        userId, userEmail, userName = created.id, created.email, created.name

    return await _finishSignup(userId, userEmail, userName, None, guestId), None


async def signUpStudentWithCode(code: str, email: str, password: str, name: str,
                                guestId: str = None, ipHash: str = None):
    """기관 발급 코드로 가입한다 — 그 학교 학생이 된다.

    **`signUpStudent` 에 `code` 를 얹지 않고 따로 둔 이유** — 저쪽 docstring 이
    "`school_code` 를 비운다" 를 계약으로 못 박고 있다. 같은 함수가 때에 따라
    채우면 그 문장이 거짓이 된다. 대신 검사·해시·게스트 이전은 같이 쓴다.

    **앱은 `school_code` 를 보내지 않는다.** 코드만 보내고 서버가 학교를 알아낸다.
    클라이언트가 준 학교를 그대로 쓰면 누구나 아무 학교 학생이 될 수 있다.

    순서가 중요하다.

        검사 → **해시** → 트랜잭션 열기 → 코드 조회 → 이메일 중복 →
        좌석 확보(조건부 UPDATE) → ko_user INSERT → 사용 이력 INSERT → 커밋

    해시를 트랜잭션 밖에서 먼저 하는 이유 — bcrypt 12라운드는 250ms 이상이라
    좌석 잠금을 쥔 채 하면 서른 명이 직렬화되어 `read_timeout: 10` 에 먼저 걸린다.
    그러면 「정원이 찼다」가 아니라 커넥션 오류로 터진다.

    한 트랜잭션인 이유 — 이메일 중복으로 되돌아갈 때 **좌석도 같이 돌아온다.**
    자리만 사라지고 계정은 없는 상태가 생기지 않는다.
    """
    from persistence import repo_signup_code   # 순환 import 를 피해 여기서 부른다
    from util import codeutils

    normalized = codeutils.normalizeCode(code)
    if not normalized:
        return None, "codeRequired"

    email, name, err = _validateSignup(email, password, name)
    if err:
        return None, err

    # 좌석 잠금 밖에서 미리 끝낸다
    passwordHash = hashPassword(password)

    with sessionScope() as db:
        if ipHash and await repo_signup_code.countRecentFails(ipHash, db) >= repo_signup_code.FAIL_LIMIT:
            return None, "tooManyTries"

        row = await repo_signup_code.findByCode(normalized, db)
        if not row:
            if ipHash:
                await repo_signup_code.recordAttempt(ipHash, False, db)
            return None, "codeInvalid"

        if await repo_user.findByEmail(email, db):
            # 흔한 실패다. 남의 좌석을 건드리기 전에 먼저 걸러낸다
            return None, "emailTaken"

        # **세션 안에서 값으로 뽑는다.** 블록을 나온 뒤 row 의 칸을 읽으면
        # DetachedInstanceError 다 — 그러면 계정은 만들어졌는데 응답이 터진다
        # (실제로 한 번 그랬다: 학생 하나가 생기고 500 이 났다).
        codeId, codeSchool = row.id, row.school_code

        if not await repo_signup_code.consumeSeat(codeId, db):
            if ipHash:
                await repo_signup_code.recordAttempt(ipHash, False, db)
            return None, _whyUnavailable(row)

        user = model.KoUser()
        user.email = email
        user.password_hash = passwordHash
        user.name = name
        user.role = "student"
        user.school_code = codeSchool           # **코드가 정한다. 요청이 아니다**
        user.is_approved = True
        user.is_active = True
        created = await repo_user.createUser(user, db)
        userId, userEmail, userName = created.id, created.email, created.name

        await repo_signup_code.recordUse(codeId, userId, codeSchool, db)
        if ipHash:
            await repo_signup_code.recordAttempt(ipHash, True, db)

    return await _finishSignup(userId, userEmail, userName, codeSchool, guestId), None


def _whyUnavailable(row):
    """좌석을 못 잡은 이유. 앱이 5개 언어로 옮기도록 코드로 낸다.

    **`row` 는 UPDATE 전에 읽은 값이라 `used_count` 가 한 박자 낡을 수 있다.**
    그래서 「정원이 찼다」를 마지막 갈래로 둔다 — 다른 이유가 없으면 그것이다.
    """
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if row.status == "revoked":
        return "codeDisabled"
    if row.status == "paused":
        return "codePaused"
    if row.expires_at and row.expires_at <= now:
        return "codeExpired"
    if row.starts_at and row.starts_at > now:
        return "codeNotStarted"
    return "codeFull"


# ── 게스트 → 계정 이전 ─────────────────────────────────────────
#
# **`user_id` 를 가진 표를 하나도 빠뜨리면 안 된다.** 빠지면 게스트로 공부한
# 것이 가입·로그인과 함께 조용히 사라진다. 2026-08-26 에 `ko_learning_record`
# 하나가 빠져 있던 것을 찾았고, 2026-08-27 에 세어 보니 **다섯이 더** 빠져
# 있었다(`ko_activity_state` · `ko_review_queue` · `ko_stt_shadow` ·
# `ko_error_report` · `ko_inquiry`). 앞의 둘은 진행 상태와 복습 큐다.
#
# 표가 늘면 여기 한 줄을 더한다. 지우는 쪽(`shared/withdrawal_scope.py`)과
# **같은 목록이어야 한다** — 한쪽만 늘면 옮겨지지 않거나 지워지지 않는다.

# 그냥 옮겨도 되는 표. 같은 사람의 행이 여러 벌 있어도 뜻이 통한다
_MOVE_PLAIN = [
    model.KoChat,
    model.KoChatMsg,
    model.KoChatFeedback,
    model.UserFlashcard,
    model.UserFlashcardWord,
    model.KoStudySession,
    model.KoGameProgress,
    model.KoSttShadow,
    model.KoErrorReport,
    model.KoInquiry,
]

# (모델, 한 사람에게 하나여야 하는 키). 계정에 같은 키가 이미 있으면
# **게스트 쪽을 버린다** — 첫 시도를 보존한다는 확정 규칙이다(dev_spec_v1 §2.1).
#
# **DB 가 막아 주는 것은 아래 넷 중 둘뿐이다**(2026-08-27 실측):
#   ko_activity_state  uq_state   · ko_review_queue  uq_queue
#   ko_learning_record 유니크 없음 · ko_daily_activity 유니크 없음
# 앞 판 코드는 `ko_learning_record` 에 유니크가 있다고 보고 IntegrityError 를
# 잡아 두었는데 **이 DB 에는 없다.** 그래서 터지는 대신 같은 문항이 두 벌
# 들어왔고, `findOne` 이 `.first()` 라 어느 쪽이 이길지는 그때그때 달랐다.
# 막아 주든 아니든 **논리적으로는 하나여야 하므로** 넷을 같이 다룬다.
_MOVE_KEYED = [
    (model.KoLearningRecord, ("book_id", "chapter_seq", "menu_type", "question_id")),
    (model.KoDailyActivity, ("activity_date",)),
    (model.KoActivityState, ("book_id", "chapter_seq", "menu_type", "sub")),
    (model.KoReviewQueue, ("book_id", "chapter_seq", "menu_type", "sub", "question_id")),
]


def _moveKeyed(db, Model, keyCols, guestId, userId):
    """겹치는 게스트 행은 버리고 나머지를 옮긴다. (옮김, 버림) 을 돌려준다.

    **한 줄짜리 `update()` 를 쓰지 않는다.** 그것은 한 행만 부딪쳐도 문 전체가
    되돌려져 **그 표가 통째로 안 옮겨진다.** 앞 판이 그랬다 — 충돌 하나에
    학습 기록 전부를 잃었다(DB 가 막아 주는 표였다면).
    """
    existing = {
        tuple(getattr(r, c) for c in keyCols)
        for r in db.query(Model).filter(Model.user_id == userId).all()
    }
    moved = dropped = 0
    for row in db.query(Model).filter(Model.user_id == guestId).all():
        key = tuple(getattr(row, c) for c in keyCols)
        if key in existing:
            db.delete(row)
            dropped += 1
        else:
            row.user_id = userId
            existing.add(key)
            moved += 1
    db.flush()
    return moved, dropped


async def migrateGuestData(userId: str, guestId: str):
    """게스트로 남긴 것을 로그인 계정으로 옮긴다.

    가입할 때만이 아니라 **로그인할 때도 돈다**(`sign-provider` 가 부른다).
    그래서 계정이 이미 자기 기록을 갖고 있는 경우가 실제로 생긴다 —
    `_MOVE_KEYED` 의 충돌 규칙이 그 자리다.
    """
    moved = {}
    dropped = {}
    with sessionScope() as db:
        for Model in _MOVE_PLAIN:
            moved[Model.__tablename__] = db.query(Model).filter(
                Model.user_id == guestId
            ).update({"user_id": userId})

        for Model, keyCols in _MOVE_KEYED:
            m, d = _moveKeyed(db, Model, keyCols, guestId, userId)
            moved[Model.__tablename__] = m
            if d:
                dropped[Model.__tablename__] = d

        # ko_user 에 guest_id 를 남긴다 — 탈퇴가 게스트 시절 행까지 지울 때 본다
        user = await repo_user.findById(int(userId), db)
        if user:
            user.guest_id = guestId

    return {
        "success": True,
        "migratedFrom": guestId,
        "migratedTo": userId,
        "moved": moved,
        "dropped": dropped,
    }
