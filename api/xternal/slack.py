"""문의를 슬랙으로 보낸다 — 봇 토큰(파일까지) 또는 Incoming Webhook(글만).

**보내기가 실패해도 문의는 잃지 않는다.** 부르는 쪽이 DB 에 먼저 넣고 그다음에
이 함수를 부른다. 여기서는 성공 여부만 돌려주고, 실패는 `notified=False` 로 남아
`tools/resend_inquiries.py` 로 다시 보낼 수 있다.

## 길이 둘인 이유

| | 무엇으로 | 화면 캡처 |
|---|---|---|
| **봇 토큰** | `chat.postMessage` + `files.*` | **파일이 그대로 올라간다** |
| 웹훅 | `SLACK_WEBHOOK_URL` | 못 올린다 — 짧게 사는 링크만 |

**Incoming Webhook 은 파일을 올릴 수 없다.** 처음에 웹훅으로 만들었더니 캡처를
링크로만 붙일 수 있었다. 봇 토큰이 있으면 그쪽을 쓰고, 없으면 웹훅으로 떨어진다.
둘 다 없으면 조용히 안 보낸다 — 로컬·검사 환경에는 없고, 그것 때문에 문의 접수가
실패하면 안 된다.

## 봇 토큰을 쓰려면 (사람이 해야 하는 일)

1. Slack 앱을 만들고 **봇 토큰 스코프** `chat:write` · `files:write` 를 준다
2. 그 봇을 받을 채널에 초대한다 (`/invite @봇이름`)
3. `.env` 에 `SLACK_BOT_TOKEN` 과 `SLACK_CHANNEL_ID` 를 넣는다
   채널 id 는 채널 주소의 마지막 토막이다 — `…/archives/C0BSL4ZUVQF` → `C0BSL4ZUVQF`

## 캡처를 슬랙에 올리면 사본이 하나 더 생긴다

우리 S3(비공개)와 **슬랙 양쪽**에 남는다. 슬랙 쪽 보관은 워크스페이스 설정을
따르고 우리가 지우지 못한다. 개인정보 처리방침의 처리 위탁 표에
슬랙(미국)이 들어가야 하는 이유다 — `docs/legal_draft_v1.html` §03-2.
"""
import json
import os
import urllib.error
import urllib.request

WEBHOOK_ENV = "SLACK_WEBHOOK_URL"
BOT_TOKEN_ENV = "SLACK_BOT_TOKEN"
CHANNEL_ENV = "SLACK_CHANNEL_ID"
TIMEOUT_SEC = 5
# 파일은 느릴 수 있다. 글보다 넉넉히 준다
UPLOAD_TIMEOUT_SEC = 20
API = "https://slack.com/api/"

# 캡처를 볼 수 있는 임시 주소가 몇 초 사는지.
# **웹훅으로 떨어졌을 때만 쓴다** — 봇 토큰이면 파일 자체가 올라가므로 링크가 필요 없다.
# 기본 하루. 링크가 채널에 남아도 다음 날에는 죽는다. 만료는 메시지에 함께 적는다
LINK_TTL_SEC = int(os.getenv("SLACK_LINK_TTL_SEC", str(24 * 3600)))


def _hasBot() -> bool:
    """봇 토큰과 채널이 **둘 다** 있어야 쓴다. 하나만 있으면 못 보낸다"""
    return bool(os.getenv(BOT_TOKEN_ENV) and os.getenv(CHANNEL_ENV))


def _apiBase() -> str:
    """검사에서 가짜 슬랙을 세울 수 있게 밖에서 바꿀 수 있다"""
    return os.getenv("SLACK_API_BASE", API)


def _post(url: str, body: bytes, headers: dict, timeout: int):
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as res:
        raw = res.read()
    try:
        return json.loads(raw.decode())
    except Exception:
        # upload_url 은 JSON 이 아닌 것을 줄 수도 있다. 상태만 보면 된다
        return {"ok": True, "raw": raw[:200].decode(errors="replace")}


def _call(method: str, payload: dict):
    """Slack Web API 한 번. `{"ok": false, "error": …}` 도 그대로 돌려준다"""
    token = os.getenv(BOT_TOKEN_ENV)
    return _post(
        _apiBase() + method,
        json.dumps(payload).encode(),
        {
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": f"Bearer {token}",
        },
        TIMEOUT_SEC,
    )


def isConfigured() -> bool:
    """보낼 길이 하나라도 있나. 봇 토큰이 우선이다"""
    return _hasBot() or bool(os.getenv(WEBHOOK_ENV))


def _trim(text: str, n: int) -> str:
    text = (text or "").strip()
    return text if len(text) <= n else text[: n - 1] + "…"


def buildMessage(inquiry: dict, withLinks: bool = True) -> dict:
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

    # 세 칸 유형(bug·content)이면 재현 정보가 나뉘어 온다. 없으면 그 줄 자체가
    # 없다 — 「(없음)」이 늘어서면 훑기 어려워진다
    body = f"*문의 #{inquiry.get('id')}* · `{topic}`\n{_trim(inquiry.get('message'), 900)}"
    actual = (inquiry.get("actual") or "").strip()
    expected = (inquiry.get("expected") or "").strip()
    if actual:
        body += f"\n\n*실제로 어떻게 됐나요*\n{_trim(actual, 500)}"
    if expected:
        body += f"\n\n*어떻게 되길 기대하셨나요*\n{_trim(expected, 500)}"

    blocks = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": body,
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
    # 우리 저장소에 하나도 못 남았다. **슬랙에 올라가는 것과 별개다** —
    # 나중에 다시 볼 수 있는 사본이 없다는 뜻이라 그것도 알아야 한다
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

    # **링크는 웹훅 경로에서만 붙인다.** 봇 토큰이면 그림 자체가 스레드에 올라가므로
    # 링크가 필요 없다 — 다만 "몇 장이 우리 저장소에 남았나" 는 양쪽 다 말한다.
    # 처음에 withLinks 로 keys 를 통째로 비웠더니 **슬랙에 올라가는 중인데
    # "저장 실패" 라고 말했다** — 저장(우리 S3)과 전달(슬랙)은 다른 사실이다
    if keys and withLinks:
        links = []
        for i, key in enumerate(keys, 1):
            try:
                from util import s3utils

                links.append(f"<{s3utils.presign(key, LINK_TTL_SEC)}|캡처 {i}>")
            except Exception as e:
                print(f"[slack] 캡처 링크 실패 — {e!r}")
        hours = max(1, LINK_TTL_SEC // 3600)
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
    elif keys:
        blocks.append(
            {
                "type": "context",
                "elements": [
                    {"type": "mrkdwn", "text": f"화면 캡처 {len(keys)}장 — 아래 답글"},
                ],
            }
        )

    if keys:
        shots = f" · 캡처 {len(keys)}장"
        if attempts > len(keys):
            shots += f"(보낸 것 {attempts}장)"
    elif attempts:
        shots = f" · 캡처 {attempts}장(우리 저장소에 안 남음)"
    else:
        shots = ""
    return {
        "text": f"[문의 #{inquiry.get('id')}] {topic} · {who}{shots}",
        "blocks": blocks,
    }


async def _uploadShot(raw: bytes, mime: str, name: str, channel: str, threadTs):
    """캡처 한 장을 슬랙에 올린다 — `getUploadURLExternal` → PUT → `completeUploadExternal`.

    세 단계인 것이 슬랙의 지금 방식이다(옛 `files.upload` 는 폐기됐다).
    `thread_ts` 를 주어 **문의 메시지의 답글로** 붙인다 — 채널에 그림만 따로
    떠 있으면 어느 문의인지 알 수 없다.
    """
    got = _call(
        "files.getUploadURLExternal",
        {"filename": name, "length": len(raw)},
    )
    # 이 엔드포인트는 폼 인코딩도 받지만 JSON 도 받는다. ok 만 보면 된다
    if not got.get("ok"):
        print(f"[slack] 업로드 주소 실패 — {got.get('error')}")
        return False

    uploadUrl, fileId = got.get("upload_url"), got.get("file_id")
    if not uploadUrl or not fileId:
        print("[slack] 업로드 주소가 비었다")
        return False

    import asyncio

    def _put():
        return _post(
            uploadUrl, raw, {"Content-Type": "application/octet-stream"},
            UPLOAD_TIMEOUT_SEC,
        )

    try:
        await asyncio.to_thread(_put)
    except Exception as e:
        print(f"[slack] 파일 전송 실패 — {e!r}")
        return False

    done = _call(
        "files.completeUploadExternal",
        {
            "files": [{"id": fileId, "title": name}],
            "channel_id": channel,
            **({"thread_ts": threadTs} if threadTs else {}),
        },
    )
    if not done.get("ok"):
        print(f"[slack] 업로드 마무리 실패 — {done.get('error')}")
        return False
    return True


async def notifyInquiry(inquiry: dict, shots=None) -> tuple:
    """`(보냈나, 슬랙에 올라간 캡처 수)`. 예외를 던지지 않는다.

    `shots` 는 `[(바이트, mime), …]`. **봇 토큰이 있으면 그림을 그대로 올린다.**
    S3 저장이 실패했어도 여기로는 올라갈 수 있다 — 바이트를 아직 들고 있기 때문이다.
    그래서 **올라간 수를 같이 돌려준다** — 화면이 "저장은 안 됐지만 담당자는
    본다" 를 구분해서 말할 수 있게.
    """
    import asyncio

    shots = shots or []

    if _hasBot():
        channel = os.getenv(CHANNEL_ENV)
        msg = buildMessage(inquiry, withLinks=False)
        res = await asyncio.to_thread(
            lambda: _call(
                "chat.postMessage",
                {"channel": channel, "text": msg["text"], "blocks": msg["blocks"]},
            )
        )
        if not res.get("ok"):
            print(f"[slack] 메시지 실패 — {res.get('error')}")
            return False, 0

        ts = res.get("ts")
        ok = 0
        for i, (raw, mime) in enumerate(shots, 1):
            ext = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}.get(mime, "png")
            if await _uploadShot(raw, mime, f"문의{inquiry.get('id')}-{i}.{ext}", channel, ts):
                ok += 1
        if shots and ok < len(shots):
            # 글은 갔고 그림 일부가 못 갔다. **그 사실도 스레드에 남긴다**
            await asyncio.to_thread(
                lambda: _call(
                    "chat.postMessage",
                    {
                        "channel": channel,
                        "thread_ts": ts,
                        "text": f":warning: 캡처 {len(shots)}장 중 {len(shots) - ok}장을 올리지 못했다 — 서버 로그를 봐라",
                    },
                )
            )
        return True, ok

    # 웹훅으로 떨어진다 — 파일은 못 올리고 짧게 사는 링크만 붙는다
    url = os.getenv(WEBHOOK_ENV)
    if not url:
        return False, 0

    body = json.dumps(buildMessage(inquiry, withLinks=True)).encode("utf-8")

    def _send() -> bool:
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

    # 웹훅은 파일을 못 올린다 — 그래서 올라간 캡처는 늘 0이다
    return await asyncio.to_thread(_send), 0


def buildClipReportMessage(report: dict) -> dict:
    """표현클립 「선정적·폭력적 내용」 신고 — DEV-02 · clip_spec_v1 §05-6.

    **그 순간으로 바로 가는 링크가 요점이다** — 영상 링크만 주면 18분짜리에서
    5초를 찾아 헤매야 조치할 수 있다. `&t={start}s` 를 붙여 그 자리로 바로 연다.
    """
    title = report.get("title") or "-"
    category = report.get("clip_category") or "-"
    targetId = report.get("target_id") or ""
    start = report.get("segment_start") or 0
    link = f"https://www.youtube.com/watch?v={targetId}&t={start}s"
    word = (report.get("content") or "").strip()
    line = (report.get("matched_line") or "").strip()
    reporter = _trim(report.get("user_id"), 30) or "-"
    count = report.get("report_count", 1)

    body = f"*표현클립 신고* · `{category}`\n*{title}*\n<{link}|그 순간으로 가기>"
    if word:
        body += f"\n\n*검색어*\n{_trim(word, 200)}"
    if line:
        body += f"\n\n*걸린 대본 줄*\n{_trim(line, 300)}"

    blocks = [
        {"type": "section", "text": {"type": "mrkdwn", "text": body}},
        {
            "type": "context",
            "elements": [
                {"type": "mrkdwn", "text": f"신고자 `{reporter}`"},
                # 임계값 자동 처리에는 안 쓴다(clip_spec_v1 §05-6) — 사람이 볼 때 판단을 돕는 값이다
                {"type": "mrkdwn", "text": f"이 영상 누적 신고 {count}건"},
                {"type": "mrkdwn", "text": f"구간 시작 {start}초"},
            ],
        },
    ]
    return {"text": f"[표현클립 신고] {title} · {category}", "blocks": blocks}


async def notifyClipReport(report: dict) -> bool:
    """표현클립 신고를 슬랙으로. 문의하기와 같은 채널(#…_오류신고)을 쓴다.

    `notifyInquiry` 와 달리 파일이 없다 — 이 신고는 캡처를 안 받는다. 부르는 쪽
    (`business/report.py`)이 **DB 저장 뒤에** 부르므로 여기서 실패해도 신고 자체는
    이미 남아 있다 — 예외를 던지지 않고 `False` 로 알린다.
    """
    import asyncio

    msg = buildClipReportMessage(report)

    if _hasBot():
        channel = os.getenv(CHANNEL_ENV)
        res = await asyncio.to_thread(
            lambda: _call(
                "chat.postMessage",
                {"channel": channel, "text": msg["text"], "blocks": msg["blocks"]},
            )
        )
        if not res.get("ok"):
            print(f"[slack] 표현클립 신고 알림 실패 — {res.get('error')}")
        return bool(res.get("ok"))

    url = os.getenv(WEBHOOK_ENV)
    if not url:
        return False

    body = json.dumps(msg).encode("utf-8")

    def _send() -> bool:
        req = urllib.request.Request(
            url, data=body, headers={"Content-Type": "application/json"}, method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as res:
                return 200 <= res.status < 300
        except urllib.error.HTTPError as e:
            print(f"[slack] 표현클립 신고 전송 실패 HTTP {e.code} — {e.read()[:200]!r}")
        except Exception as e:
            print(f"[slack] 표현클립 신고 전송 실패 — {e!r}")
        return False

    return await asyncio.to_thread(_send)
