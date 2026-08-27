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
    with sessionScope() as db:
        user = await repo_user.findByEmail(email, db)
        if not user:
            return None, "이메일 또는 비밀번호가 올바르지 않습니다."

        if not user.is_active:
            return None, "비활성화된 계정입니다."

        if not verifyPassword(password, user.password_hash):
            return None, "이메일 또는 비밀번호가 올바르지 않습니다."

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

    규칙은 목업(`phase1/draft_auth.html` 의 가입 화면)이 화면에 적어 둔 셋과
    같다 — 8자 이상 · 대문자 1개 · 숫자 1개. **앱이 같은 규칙을 화면에서도
    보여 주지만 판정은 여기서 한 번 더 한다** — 앱을 거치지 않고 부를 수 있다.
    """
    return [name for name, ok in PASSWORD_RULES if not ok(password)]


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
    email = (email or "").strip().lower()
    name = (name or "").strip()

    # **오류는 한국어 문장이 아니라 코드로 낸다.** 이 앱을 쓰는 사람은 전부
    # 한국어를 배우는 중이고 화면은 5개 언어다 — 영어 화면에서 한국어 오류가
    # 뜨면 무엇이 잘못됐는지 읽을 수가 없다. 앱이 `signup.err_*` 로 옮긴다.
    # 다른 엔드포인트는 아직 한국어 문장을 내므로 앱이 모르는 값은 그대로 보여 준다.
    if not _EMAIL.match(email):
        return None, "emailInvalid"
    if not name:
        return None, "nameRequired"
    if checkPassword(password or ""):
        return None, "passwordWeak"

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

    # 둘러보며 푼 것을 옮긴다(§07 의 2번). **실패해도 가입은 성공이다** —
    # 계정이 생겼는데 "가입 실패" 라고 말하면 다시 가입할 수도 없다
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
            "schoolCode": None,
        },
        "migrated": migrated,
    }, None


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
