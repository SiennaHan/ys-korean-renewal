#!/usr/bin/env python3
"""로컬 서버가 학습 흐름을 끝까지 도는지 보는 최소 검사.

    python3 smoke_test.py                      # http://127.0.0.1:8000
    python3 smoke_test.py http://host:8000

검사 순서 — 게스트 토큰 → 기록 없음 확인 → 기록 저장 → 재조회.
**외부 API 키가 하나도 없어도 여기까지 돌아야 한다.** 게스트 토큰은
자격증명을 요구하지 않고, 학습 기록은 DB 만 쓴다. 키가 필요한 것은
/speech/* · /tts/* · /chat/* 뿐이다(BLOCKERS.md §6-b).

끝에 0 을 내면 통과다. 하나라도 어긋나면 1 을 낸다.
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000").rstrip("/")

# 아무 학생이나 만나는 자리 — 1급 4과 어휘. 문항 id 는 검사 전용으로 큰 수를 쓴다
BOOK, CHAPTER, MENU, QID = 1, 4, "word", 999_999


def call(method: str, path: str, token: str | None = None, body: dict | None = None):
    req = urllib.request.Request(f"{BASE}{path}", method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data, timeout=15) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, {"_body": (e.read() or b"")[:300].decode("utf-8", "replace")}
    except OSError as e:
        return 0, {"_error": str(e)}


def step(n: int, what: str, ok: bool, detail: str = "") -> bool:
    print(f"  {'✔' if ok else '✘'} {n}. {what}{('  — ' + detail) if detail else ''}")
    return ok


def main() -> int:
    print(f"대상 {BASE}\n")

    # 1. 게스트 토큰 — 자격증명 없이
    code, res = call("POST", "/user/sign/guest", body={"guestId": None})
    token = (res.get("data") or {}).get("token")
    if not step(1, "게스트 토큰", code == 200 and bool(token), f"HTTP {code}" if not token else ""):
        if code == 0:
            print(f"\n     서버에 못 붙었다 — {res.get('_error', '')}")
            print("     api/README.md 의 '로컬에서 띄우기' 를 봐라")
        return 1

    q = f"?bookId={BOOK}&chapterSeq={CHAPTER}&menuType={MENU}"

    # 2. 저장 전 조회 — 인증이 통하는지까지 같이 본다
    code, before = call("GET", f"/learning-record/list{q}", token)
    if not step(2, "저장 전 조회", code == 200, f"HTTP {code}"):
        return 1
    n_before = len((before.get("data") or []) or [])

    # 3. 기록 저장
    code, _ = call("POST", "/learning-record", token, {
        "bookId": BOOK, "chapterSeq": CHAPTER, "menuType": MENU,
        "questionId": QID, "selectedAnswer": "smoke", "isCorrect": True,
    })
    if not step(3, "기록 저장", code == 200, f"HTTP {code}"):
        return 1

    # 4. 재조회 — 방금 넣은 것이 보이나
    code, after = call("GET", f"/learning-record/list{q}", token)
    rows = (after.get("data") or []) or []
    # POST 는 카멜(questionId)로 받는데 GET 은 스네이크(question_id)로 준다 —
    # 같은 자원의 이름이 방향마다 다르다. 둘 다 본다.
    found = any(
        str(r.get("question_id", r.get("questionId"))) == str(QID)
        for r in rows
        if isinstance(r, dict)
    )
    if not step(4, "재조회", code == 200 and found,
                f"HTTP {code} · {n_before} → {len(rows)}행"):
        return 1

    print("\n통과 — 키 없이 학습 기록이 저장되고 다시 읽힌다")
    return 0


if __name__ == "__main__":
    sys.exit(main())
