"""문의를 슬랙으로 보낸다 — Incoming Webhook.

**보내기가 실패해도 문의는 잃지 않는다.** 부르는 쪽이 DB 에 먼저 넣고 그다음에
이 함수를 부른다. 여기서는 성공 여부만 돌려주고, 실패는 `notified=False` 로 남아
나중에 다시 보낼 수 있다.

`SLACK_WEBHOOK_URL` 이 없으면 **조용히 안 보낸다**(예외를 내지 않는다) —
로컬과 검사 환경에는 웹훅이 없고, 그것 때문에 문의 접수가 실패하면 안 된다.
"""
import json
import os
import urllib.error
import urllib.request

WEBHOOK_ENV = "SLACK_WEBHOOK_URL"
TIMEOUT_SEC = 5


def isConfigured() -> bool:
    return bool(os.getenv(WEBHOOK_ENV))


def _trim(text: str, n: int) -> str:
    text = (text or "").strip()
    return text if len(text) <= n else text[: n - 1] + "…"


def buildMessage(inquiry: dict) -> dict:
    """슬랙에 보일 모양. **본문을 통째로 넣지 않는다** — 길면 잘라 보내고
    전문은 어드민에서 본다. 슬랙 메시지에는 길이 제한이 있고, 무엇보다
    개인 이야기가 담긴 글이 채널에 통째로 흐르는 것이 늘 좋은 것은 아니다.
    """
    topic = inquiry.get("topic") or "-"
    who = inquiry.get("reply_email") or "-"
    lang = inquiry.get("lang") or "-"
    path = inquiry.get("from_path") or "-"
    return {
        "text": f"[문의 #{inquiry.get('id')}] {topic} · {who}",
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*문의 #{inquiry.get('id')}* · `{topic}`\n{_trim(inquiry.get('message'), 900)}",
                },
            },
            {
                "type": "context",
                "elements": [
                    {"type": "mrkdwn", "text": f"답장 주소 *{who}*"},
                    {"type": "mrkdwn", "text": f"언어 `{lang}`"},
                    {"type": "mrkdwn", "text": f"보낸 화면 `{path}`"},
                    {"type": "mrkdwn", "text": f"사용자 `{_trim(inquiry.get('user_id'), 20)}`"},
                ],
            },
        ],
    }


async def notifyInquiry(inquiry: dict) -> bool:
    """보냈으면 True. 웹훅이 없거나 실패하면 False — 예외를 던지지 않는다."""
    url = os.getenv(WEBHOOK_ENV)
    if not url:
        return False

    import asyncio

    body = json.dumps(buildMessage(inquiry)).encode("utf-8")

    def _post() -> bool:
        req = urllib.request.Request(
            url, data=body, headers={"Content-Type": "application/json"}, method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as res:
                return 200 <= res.status < 300
        except urllib.error.HTTPError as e:
            print(f"[slack] 전송 실패 HTTP {e.code} — {e.read()[:200]!r}")
        except Exception as e:
            print(f"[slack] 전송 실패 — {e!r}")
        return False

    return await asyncio.to_thread(_post)
