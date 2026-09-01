"""문의 접수 — docs/legal_draft_v1.html §02 의 「문의처」

**저장이 먼저, 슬랙은 그다음이다.** 웹훅이 죽어 있어도 문의를 잃으면 안 된다.
슬랙 전송이 실패하면 `notified=False` 로 남고, `tools/resend_inquiries.py` 로
나중에 다시 보낼 수 있다.

전화를 두지 않는다 — 이용자 상당수가 국외라 통화가 현실적이지 않다(기획 확정 2026-08-27).
"""
import base64
import re
from uuid import uuid4

from fastapi.encoders import jsonable_encoder

from persistence import repo_inquiry
from persistence.database import sessionScope
from util import s3utils
from xternal import feedback_hub, slack

TOPICS = ("payment", "account", "content", "bug", "etc")
MAX_MESSAGE = 2000
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# ── 화면 캡처 첨부 ────────────────────────────────────────────────────
# **받는 것은 그림뿐이다.** 무엇이든 받으면 저장소가 곧 아무 파일 저장소가 된다.
# 앱도 같은 목록을 보지만 **판정은 여기서 한다** — 앱을 안 거치고 부를 수 있다.
ALLOWED_MIME = {"image/png", "image/jpeg", "image/webp"}
MAX_FILES = 3
MAX_FILE_BYTES = 5 * 1024 * 1024
FILE_DIR = "inquiry"


def _decodeDataUrl(dataUrl: str):
    """`data:image/png;base64,...` 를 (바이트, mime) 으로. 못 읽으면 (None, 코드).

    mime 을 **머리에 적힌 것으로 믿지 않는다** — 뒤에서 매직 바이트로 다시 본다.
    적힌 것만 보면 `data:image/png` 라고 써 놓고 아무것이나 넣을 수 있다.
    """
    if not isinstance(dataUrl, str) or not dataUrl.startswith("data:"):
        return None, "fileBadFormat"
    try:
        head, data = dataUrl.split(",", 1)
        mime = head[5:].split(";")[0].strip().lower()
        raw = base64.b64decode(data, validate=True)
    except Exception:
        return None, "fileBadFormat"

    if mime not in ALLOWED_MIME:
        return None, "fileType"
    if len(raw) == 0:
        return None, "fileBadFormat"
    if len(raw) > MAX_FILE_BYTES:
        return None, "fileTooBig"

    # 매직 바이트로 실제 그림인지 확인한다
    isPng = raw[:8] == b"\x89PNG\r\n\x1a\n"
    isJpeg = raw[:3] == b"\xff\xd8\xff"
    isWebp = raw[:4] == b"RIFF" and raw[8:12] == b"WEBP"
    if not (isPng or isJpeg or isWebp):
        return None, "fileType"

    # 적힌 mime 과 실제가 다르면 **실제를 쓴다**
    real = "image/png" if isPng else "image/jpeg" if isJpeg else "image/webp"
    return raw, real


async def createInquiry(
    userId, replyEmail, topic, message, lang=None, fromPath=None, files=None, userAgent=""
):
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

    # 첨부를 **먼저 다 읽어 본다.** 하나라도 안 되면 아무것도 만들지 않는다 —
    # 문의만 접수되고 캡처가 조용히 빠지면 보낸 사람이 알 길이 없다
    files = files or []
    if len(files) > MAX_FILES:
        return None, "fileTooMany"
    decoded = []
    for one in files:
        raw, kind = _decodeDataUrl(one)
        if raw is None:
            return None, kind
        decoded.append((raw, kind))

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

    # 캡처를 올린다. **비공개다** — 학습자 화면에는 이름·이메일·학습 기록이 담긴다.
    # 여기서 실패해도 접수는 성공이다(글은 이미 남았다). 몇 장이 붙었는지는
    # 슬랙 메시지가 말해 주므로 빠진 것을 사람이 알아챌 수 있다
    keys = []
    for raw, mime in decoded:
        ext = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}[mime]
        try:
            key = await s3utils.private_upload_to_s3(
                raw, FILE_DIR, f"{saved['id']}-{uuid4().hex}.{ext}", mime
            )
            with sessionScope() as db:
                await repo_inquiry.addFile(db, saved["id"], key, mime, len(raw))
            keys.append(key)
        except Exception as e:
            print(f"[inquiry] 캡처 저장 실패 — id[{saved['id']}] {e!r}")
    saved["files"] = keys
    # 슬랙이 임시 주소를 만들 수 있게 키를 넘긴다(DB 의 saved 에는 없는 값이다)
    saved["file_keys"] = keys
    # **붙이려 한 수도 넘긴다.** 몇 장을 보냈는데 하나도 안 올라갔으면
    # 슬랙 메시지가 그것을 말해야 한다 — 안 그러면 보낸 사람만 캡처를
    # 보냈다고 알고 받는 쪽은 글만 본다
    saved["file_attempts"] = len(decoded)

    # 여기부터는 실패해도 접수는 성공이다. 학습자에게는 이미 받았다고 말한다
    delivered = 0
    try:
        # **바이트를 같이 넘긴다.** 봇 토큰이면 그림이 그대로 올라가고,
        # S3 저장이 실패했어도 슬랙에는 붙을 수 있다 — 아직 손에 들고 있다
        sent, delivered = await slack.notifyInquiry(saved, shots=decoded)
        if sent:
            with sessionScope() as db:
                await repo_inquiry.markNotified(db, saved["id"])
            saved["notified"] = True
    except Exception as e:
        print(f"[inquiry] 슬랙 알림 실패 — id[{saved['id']}] {e!r}")

    # 사내 피드백 허브로도 흘려보낸다. **슬랙과 나란한 자리다** —
    # 여기서 실패해도 접수는 성공이고, 글은 우리 DB 와 슬랙에 이미 남아 있다.
    # 폼을 새로 만들지 않고 서버에서 한 번 더 보내는 이유는 feedback_hub.py 에 적었다
    try:
        feedback_hub.forward(saved, shots=decoded, userAgent=userAgent)
    except Exception as e:
        print(f"[inquiry] 허브 전송 실패 — id[{saved['id']}] {e!r}")

    # 앱에는 접수 번호와 **붙은 캡처 수**만 준다. 본문을 되돌려 줄 이유는 없지만,
    # 몇 장이 올라갔는지는 보낸 사람이 알아야 한다
    return {
        "id": saved["id"],
        # 우리 저장소에 남은 수
        "files": len(keys),
        # **담당자 채널에 닿은 수.** 저장이 실패해도 슬랙에는 올라갈 수 있다 —
        # 그때 화면이 "유실됐다" 고만 말하면 필요 없는 걱정을 시킨다
        "filesDelivered": delivered,
        "filesAttempted": len(decoded),
    }, None
