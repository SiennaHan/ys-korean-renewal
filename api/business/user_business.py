import bcrypt
from fastapi.encoders import jsonable_encoder

from accepter import auth
from persistence.database import sessionScope
from persistence import repo_user, model
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
