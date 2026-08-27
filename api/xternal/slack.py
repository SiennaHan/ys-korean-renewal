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

# 캡처를 볼 수 있는 임시 주소가 몇 초 사는지.
# **Incoming Webhook 은 파일을 올릴 수 없다** — 링크만 실을 수 있다. 그래서
# 비공개 객체에 짧게 사는 주소를 만들어 붙인다. 기본 하루 — 그날 안에 보라는 뜻이고
# 링크가 채널에 남아도 다음 날에는 죽는다. 만료는 메시지에 함께 적는다
LINK_TTL_SEC = int(os.getenv("SLACK_LINK_TTL_SEC", str(24 * 3600)))


def isConfigured() -> bool:
    return bool(os.getenv(WEBHOOK_ENV))


def _trim(text: str, n: int) -> str:
    text = (text or "").strip()
    return text if len(text) <= n else text[: n - 1] + "…"


def buildMessage(inquiry: dict) -> dict:
    """슬랙에 보일 모양. **본문을 통째로 넣지 않는다** — 길면 잘라 보내고
    전문은 어드민에서 본다. 슬랙 메시지에는 길이 제한이 있고, 무엇보다
    개인 이야기가 담긴 글이 채널에 통째로 흐르는 것이 늘 좋은 것은 아니다.

    캡처는 **임시 주소**로 붙인다. 비공개 객체라 그냥 링크로는 안 열리고,
    Incoming Webhook 은 파일 자체를 올릴 수 없다.
    """
    topic = inquiry.get("topic") or "-"
    who = inquiry.get("reply_email") or "-"
    lang = inquiry.get("lang") or "-"
    path = inquiry.get("from_path") or "-"

    blocks = [
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
    ]

    keys = inquiry.get("file_keys") or []
    attempts = inquiry.get("file_attempts") or 0

    # 붙이려 했는데 하나도 못 올라간 경우. **이것을 말하지 않으면 받는 쪽은
    # 글만 보고 캡처가 없었다고 생각한다**
    if attempts and not keys:
        blocks.append(
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f":warning: 화면 캡처 {attempts}장을 보냈는데 *저장에 실패했다* — 서버 로그를 봐라",
                    }
                ],
            }
        )

    if keys:
        links = []
        for i, key in enumerate(keys, 1):
            try:
                from util import s3utils

                links.append(f"<{s3utils.presign(key, LINK_TTL_SEC)}|캡처 {i}>")
            except Exception as e:
                print(f"[slack] 캡처 링크 실패 — {e!r}")
        hours = max(1, LINK_TTL_SEC // 3600)
        # 링크를 못 만들었어도 **몇 장이 왔는지는 말한다** — 그래야 빠진 것을 안다
        body = " · ".join(links) if links else "링크를 만들지 못했다"
        blocks.append(
            {
                "type": "context",
                "elements": [
                    {"type": "mrkdwn", "text": f"화면 캡처 {len(keys)}장 — {body}"},
                    {"type": "mrkdwn", "text": f"링크는 {hours}시간 뒤 만료"},
                ],
            }
        )

    if keys:
        shots = f" · 캡처 {len(keys)}장"
        if attempts > len(keys):
            shots += f"(보낸 것 {attempts}장)"
    elif attempts:
        shots = f" · 캡처 {attempts}장 저장 실패"
    else:
        shots = ""
    return {
        "text": f"[문의 #{inquiry.get('id')}] {topic} · {who}{shots}",
        "blocks": blocks,
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
