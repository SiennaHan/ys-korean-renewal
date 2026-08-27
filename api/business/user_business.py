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


async def migrateGuestData(userId: str, guestId: str):
    """게스트 데이터를 로그인 사용자 계정으로 마이그레이션"""
    with sessionScope() as db:
        # ko_chat 테이블의 user_id 업데이트
        db.query(model.KoChat).filter(
            model.KoChat.user_id == guestId
        ).update({"user_id": userId})

        # ko_chat_msg 테이블의 user_id 업데이트
        db.query(model.KoChatMsg).filter(
            model.KoChatMsg.user_id == guestId
        ).update({"user_id": userId})

        # ko_chat_feedback 테이블의 user_id 업데이트
        db.query(model.KoChatFeedback).filter(
            model.KoChatFeedback.user_id == guestId
        ).update({"user_id": userId})

        # ko_user_flashcard 테이블의 user_id 업데이트
        db.query(model.UserFlashcard).filter(
            model.UserFlashcard.user_id == guestId
        ).update({"user_id": userId})

        # ko_user_flashcard_word 테이블의 user_id 업데이트
        db.query(model.UserFlashcardWord).filter(
            model.UserFlashcardWord.user_id == guestId
        ).update({"user_id": userId})

        # ko_learning_record 테이블의 user_id 업데이트
        #
        # 2026-08-26 에 빠져 있던 것을 넣었다. 표 일곱을 옮기면서 **푼 문항이 전부
        # 들어 있는 이 표만** 빠져 있었다 — 게스트로 공부한 사람이 가입하면 답이
        # 다 사라졌다. "게스트 진행을 서버에 남긴다"(access_and_pricing_v1 §07 의
        # 2번)를 확정하면서 확인하다 찾았다.
        #
        # upsert 가 (user, book, chapter, menu, question) 로 유니크를 걸어 두었으니,
        # 로그인 계정에 같은 문항이 이미 있으면 이 update 가 IntegrityError 를 낸다.
        # 그때는 게스트 쪽을 버린다 — 로그인 계정의 기록이 첫 시도이고, 첫 시도를
        # 보존하는 것이 확정 규칙이다(dev_spec_v1 §2.1).
        try:
            db.query(model.KoLearningRecord).filter(
                model.KoLearningRecord.user_id == guestId
            ).update({"user_id": userId})
            db.flush()
        except IntegrityError:
            db.rollback()

        # ko_study_session 테이블의 user_id 업데이트
        db.query(model.KoStudySession).filter(
            model.KoStudySession.user_id == guestId
        ).update({"user_id": userId})

        # ko_daily_activity 테이블의 user_id 업데이트
        db.query(model.KoDailyActivity).filter(
            model.KoDailyActivity.user_id == guestId
        ).update({"user_id": userId})

        # ko_game_progress 테이블의 user_id 업데이트
        db.query(model.KoGameProgress).filter(
            model.KoGameProgress.user_id == guestId
        ).update({"user_id": userId})

        # ko_user에 guest_id 기록
        user = await repo_user.findById(int(userId), db)
        if user:
            user.guest_id = guestId

    return {"success": True, "migratedFrom": guestId, "migratedTo": userId}
