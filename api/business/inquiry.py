"""문의 접수 — phase1/legal_draft_v1.html §02 의 「문의처」

**저장이 먼저, 슬랙은 그다음이다.** 웹훅이 죽어 있어도 문의를 잃으면 안 된다.
슬랙 전송이 실패하면 `notified=False` 로 남고, `tools/resend_inquiries.py` 로
나중에 다시 보낼 수 있다.

전화를 두지 않는다 — 이용자 상당수가 국외라 통화가 현실적이지 않다(기획 확정 2026-08-27).
"""
import re

from fastapi.encoders import jsonable_encoder

from persistence import repo_inquiry
from persistence.database import sessionScope
from xternal import slack

TOPICS = ("payment", "account", "content", "bug", "etc")
MAX_MESSAGE = 2000
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


async def createInquiry(userId, replyEmail, topic, message, lang=None, fromPath=None):
    """오류는 한국어 문장이 아니라 **코드**로 낸다 — 화면이 5개 언어다.

    가입(`user_business.signUpStudent`)과 같은 규약이다. 앱이 `inquiry.err_*` 로 옮긴다.
    """
    replyEmail = (replyEmail or "").strip().lower()
    message = (message or "").strip()
    topic = (topic or "etc").strip()

    if not _EMAIL.match(replyEmail):
        return None, "emailInvalid"
    if not message:
        return None, "messageRequired"
    if len(message) > MAX_MESSAGE:
        return None, "messageTooLong"
    if topic not in TOPICS:
        topic = "etc"

    with sessionScope() as db:
        row = await repo_inquiry.create(
            db,
            user_id=str(userId),
            reply_email=replyEmail,
            topic=topic,
            message=message,
            lang=(lang or None),
            from_path=(fromPath or None),
        )
        saved = jsonable_encoder(row)

    # 여기부터는 실패해도 접수는 성공이다. 학습자에게는 이미 받았다고 말한다
    try:
        if await slack.notifyInquiry(saved):
            with sessionScope() as db:
                await repo_inquiry.markNotified(db, saved["id"])
            saved["notified"] = True
    except Exception as e:
        print(f"[inquiry] 슬랙 알림 실패 — id[{saved['id']}] {e!r}")

    # 앱에는 접수 번호만 준다. 본문을 되돌려 줄 이유가 없다
    return {"id": saved["id"]}, None
