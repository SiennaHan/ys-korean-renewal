"""문의를 사내 피드백 허브로도 흘려보낸다.

**슬랙과 나란한 자리다.** 부르는 쪽(`business/inquiry.py`)이 DB 에 먼저 넣고
그다음에 이것을 부른다. 여기서 실패해도 접수는 성공이고, 문의는 우리 DB 와
슬랙에 이미 남아 있다.

## 왜 이 앱에 폼을 새로 안 만들고 흘려보내나

이 앱에는 이미 `/inquiry` 화면이 있다. 허브 쪽에도 같은 폼을 또 만들면
사용자에게 제보 창구가 둘이 되고, 둘 중 어디로 온 것인지 우리가 관리해야 한다.
그래서 **화면은 그대로 두고 서버에서 한 번 더 보낸다.**

## 그래서 못 채우는 칸이 있다

허브의 폼 규격은 「무엇을 했는지 / 실제로 어떻게 됐는지 / 어떻게 되길
기대했는지」를 나눠 받지만, **이 앱의 문의 폼은 자유 서술 한 칸뿐이다.**
그래서 `steps` 만 채우고 `actual`·`expected` 는 비운다 — 허브가 프롬프트를
만들 때 「이 서비스 폼에 이 칸이 없다」고 밝힌다. 지어내지 않는다.

칸을 나눠 받게 폼을 고치면 그때부터 제보 품질이 올라간다. 그건 별도 작업이다.

## 설정 (없으면 조용히 안 보낸다)

    FEEDBACK_HUB_URL          예: https://feedback-collect.olim.freewheelin.io
    FEEDBACK_HUB_SERVICE_KEY  허브 /services 에서 발급한 svc_… (쓰기 전용)

로컬·검사 환경에는 없다. **없다고 문의 접수가 실패하면 안 된다.**
"""
import json
import mimetypes
import os
import urllib.error
import urllib.request
import uuid

URL_ENV = "FEEDBACK_HUB_URL"
KEY_ENV = "FEEDBACK_HUB_SERVICE_KEY"
TIMEOUT_SEC = 10
PATH = "/api/submit-report"

# 이 서비스의 공개 주소. `from_path` 가 경로뿐이라 앞에 붙여 완전한 URL 로 만든다 —
# 허브의 프롬프트가 「발생 화면」으로 그대로 보여 준다
SITE = os.getenv("PUBLIC_SITE_ORIGIN", "https://korean.pulleyai.co.kr")

# 이 앱의 문의 주제 → 허브의 제보 유형.
# 허브는 bug/improvement/question 셋뿐이고, 이 앱 폼에는 「개선 제안」이 없어서
# improvement 는 나오지 않는다. 없는 것을 지어내지 않는다
TOPIC_TO_TYPE = {
    "bug": "bug",
    "content": "bug",       # 콘텐츠 오류도 고쳐야 할 것이다
    "payment": "question",
    "account": "question",
    "etc": "question",
}

TITLE_MAX = 60


def isConfigured() -> bool:
    return bool(os.getenv(URL_ENV) and os.getenv(KEY_ENV))


def _title(message: str, topic: str) -> str:
    """제목 칸이 없어서 본문 첫 줄로 만든다. 비면 주제로 떨어진다."""
    first = (message or "").strip().splitlines()[0].strip() if (message or "").strip() else ""
    if not first:
        return f"({topic}) 문의"
    return first[:TITLE_MAX] + ("…" if len(first) > TITLE_MAX else "")


def _multipart(fields, files):
    """multipart/form-data 로 인코딩한다.

    stdlib 만 쓴다 — 이 저장소에 requests 가 없고, 이것 하나 때문에 의존성을
    늘리지 않는다(`slack.py` 도 urllib 로 파일을 올린다).
    """
    boundary = f"----inquiry{uuid.uuid4().hex}"
    out = bytearray()
    for name, value in fields:
        if value is None or value == "":
            continue
        out += f"--{boundary}\r\n".encode()
        out += f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode()
        out += str(value).encode("utf-8") + b"\r\n"
    for i, (raw, mime) in enumerate(files):
        ext = mimetypes.guess_extension(mime) or ".png"
        out += f"--{boundary}\r\n".encode()
        out += (
            f'Content-Disposition: form-data; name="screenshots"; '
            f'filename="shot-{i + 1}{ext}"\r\n'
        ).encode()
        out += f"Content-Type: {mime}\r\n\r\n".encode()
        out += raw + b"\r\n"
    out += f"--{boundary}--\r\n".encode()
    return bytes(out), f"multipart/form-data; boundary={boundary}"


def forward(saved: dict, shots=None, userAgent: str = "") -> bool:
    """허브로 보낸다. 보냈으면 True.

    `shots` 는 `business/inquiry.py` 가 이미 읽어 둔 `(바이트, mime)` 목록이다.
    **다시 읽거나 S3 에서 받아오지 않는다** — 부르는 시점에 손에 들고 있다.
    """
    if not isConfigured():
        return False

    base = os.getenv(URL_ENV, "").rstrip("/")
    topic = saved.get("topic") or "etc"
    message = saved.get("message") or ""
    fromPath = saved.get("from_path") or ""
    userId = saved.get("user_id") or ""

    fields = [
        ("type", TOPIC_TO_TYPE.get(topic, "question")),
        ("title", _title(message, topic)),
        ("steps", message),
        # actual·expected 는 보내지 않는다 — 이 폼에 그 칸이 없다
        ("reporter_email", saved.get("reply_email") or ""),
        ("reporter_role", "student"),
        ("service_user_id", "" if userId == "anonymous" else userId),
        ("page_url", SITE + fromPath if fromPath.startswith("/") else SITE),
        ("user_agent", userAgent or ""),
        ("lang", saved.get("lang") or ""),
        ("occurred_at", saved.get("created_at") or ""),
        # 원문 그대로. 나중에 허브에서 이 문의를 되짚을 수 있게
        ("raw_payload", json.dumps(
            {"source": "yonsei-inquiry", "inquiry_id": saved.get("id"), "topic": topic},
            ensure_ascii=False,
        )),
    ]

    body, contentType = _multipart(fields, shots or [])
    req = urllib.request.Request(
        base + PATH,
        data=body,
        headers={
            "Content-Type": contentType,
            "X-Service-Key": os.getenv(KEY_ENV, ""),
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as res:
            payload = json.loads(res.read().decode("utf-8"))
        if payload.get("ok"):
            print(f"[inquiry] 허브 접수 — {payload.get('ticket_no')}")
            return True
        print(f"[inquiry] 허브가 거절 — {payload}")
        return False
    except urllib.error.HTTPError as e:
        # 401/403 이면 키나 도메인 문제다. 몸통을 남겨야 원인을 안다
        detail = ""
        try:
            detail = e.read().decode("utf-8")[:300]
        except Exception:
            pass
        print(f"[inquiry] 허브 전송 실패 — HTTP {e.code} {detail}")
        return False
    except Exception as e:
        print(f"[inquiry] 허브 전송 실패 — {e!r}")
        return False
