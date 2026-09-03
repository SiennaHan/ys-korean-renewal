#!/usr/bin/env python3
"""프로토타입과 캡처를 견준다 — **사람 몫 게이트**.

    cd app && python3 scripts/mockup-source-diff.py

## 왜 있나

목업 정본이라 부르는 것이 둘이다(`BLOCKERS.md` §5-c).

    docs/screens_SOT.html          프로토타입 — 사람이 열어 보고 고르는 판
    app/src/screens_ref/*.html     캡처 — `parity:activity` 가 이것과 대조한다

**게이트는 캡처만 본다. 프로토타입은 아무도 안 본다.** 그래서 둘이 갈라져도 조용하다.
2026-08-27 에 사람이 전수로 대 봐서 진짜 차이 넷을 찾았고 그 자리에서 맞췄는데,
**그 뒤로 다시 갈라졌는지 아무도 모른다.** 승격은 캡처에만 적용되는 것이 기본값이다.

§5-c 의 「어떻게 재현하나」가 절차를 산문으로 적어 뒀다 — 여기에 굳혔다.

## 왜 「다시 뽑기」가 아니고 「견주기」인가

캡처를 프로토타입에서 다시 뽑으려면 **파일명 → 어떤 버튼을 누를지** 표가 필요하다.
그 표는 또 하나의 손글씨 데이터고 화면이 늘 때 갈라진다 — 고치려는 병과 같은 모양이다.
그리고 승격을 역이식하지 않으면 **캡처에만 있는 결정이 지워진다.**

**견주기는 그 표가 필요 없다.** 이름으로 짝만 맞추고, 차이를 **보고만** 한다.
어느 쪽을 맞출지는 기획 판단이다 — 이 스크립트는 고치지 않는다.

## CI 에 넣지 않는다

브라우저가 필요하다. `build-content.py --check` 가 원장 때문에 사람 몫인 것과 같은
모양이다 — `CLAUDE.md` 의 「끝냈으면 돌려라」가 그 자리를 적어 둔다.

## 못 닿는 화면을 조용히 빼지 않는다

프로토타입에서 버튼으로 못 닿는 화면이 있다(VocaShot 은 플레이해야 하고, 활동 넷은
화면 안에서 상태를 더 바꿔야 한다). **이름을 찍어서 낸다** — 커버리지가 조용히 줄면
「모두 같다」가 거짓이 된다.
"""
from __future__ import annotations

import contextlib
import http.server
import importlib.util
import json
import socket
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
REF = APP / "src" / "screens_ref"
PROTO = "docs/screens_SOT.html"
CAPTURE = APP / "scripts" / "mockup-source-capture.mjs"

# 2026-08-27 에 프로토타입을 캡처에 맞춘 **항목**(§5-c 의 표). 양쪽에 다 있어야 한다.
#
# **화면 단위 동일성으로 이걸 판정하면 안 된다.** 처음에 「그 넷 화면이 「같다」로
# 나오는가」로 봤다가 role·write·write3 이 「다르다」로 나와 **「되돌아갔다」고 거짓
# 경보를 냈다**(2026-09-03). 실제로는 08-27 항목은 셋 다 양쪽에 있고, 그 화면들에
# **다른 차이가 남아 있던 것**이다 — §5-c 의 「넷을 맞췄다」는 *표에 적은 네 항목*을
# 맞췄다는 뜻이고 그 화면이 전부 같아졌다는 뜻이 아니었다.
#
# 그래서 **항목을 직접 본다.** 화면이 다른 것과 한 번 맞춘 것이 풀린 것은 다른 일이다.
FIXED_MARKERS = [
    ("앱바 라벨 「나가기」", "나가기", "앱 ko.ts 의 player.exit"),
    ("조합 지시문", "소리를 듣고 글자를 만들어 보세요", "앱 activity.instrWriteSelect"),
    ("플래시카드 층", "flash-motion", "캡처에 있는 층을 프로토타입에 넣었다"),
]

# §5-c 가 「같은 무늬가 셋 보인다」고 적고 맞췄다는 기록이 없는 것들. 상태를 찍는다.
GAME_UNRESOLVED = ["game__pc_result", "game__ps_level", "game__sp_entry"]


def borrow():
    """`activity-parity-diff.py` 의 정규화를 빌린다 — 베끼면 두 벌이 된다."""
    path = APP / "scripts" / "activity-parity-diff.py"
    spec = importlib.util.spec_from_file_location("_apd", path)
    if spec is None or spec.loader is None:
        sys.exit(f"{path} 를 못 읽는다")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)   # main() 가드가 있어 대조가 같이 돌지 않는다
    return mod


def serve(root: Path) -> tuple[str, http.server.ThreadingHTTPServer]:
    """프로토타입은 `file://` 로는 안 돈다(§5-c) — 로컬에 띄운다."""
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    # **로그를 삼키려면 하위 클래스로 해야 한다.** 처음에 `functools.partial` 로
    # 만들고 `httpd.RequestHandlerClass.log_message` 를 덮었는데, partial 은 클래스가
    # 아니라서 아무 효과가 없었고 화면마다 GET 이 찍혀 결과가 묻혔다(2026-09-03).
    # 삽화 404 도 같이 삼킨다 — 교재 파생이라 `.gitignore` 가 막는 것이고 고장이 아니다.
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=str(root), **k)

        def log_message(self, *a):
            pass

    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), Quiet)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{port}/{PROTO}", httpd


def main() -> int:
    apd = borrow()
    out = Path(tempfile.mkdtemp(prefix="mockup-src-"))
    url, httpd = serve(ROOT)
    try:
        r = subprocess.run(["node", str(CAPTURE), url, str(out)],
                           cwd=APP, capture_output=True, text=True)
    finally:
        httpd.shutdown()
    if r.returncode != 0:
        print(r.stdout[-2000:] or r.stderr[-2000:])
        sys.exit(f"프로토타입을 뜨지 못했다 (exit {r.returncode})")
    try:
        info = json.loads(r.stdout)
    except json.JSONDecodeError:
        print(r.stdout[-2000:])
        sys.exit("캡처 helper 의 출력을 못 읽었다")

    for e in info["pageErrors"]:
        print(f"⚠ 프로토타입에서 오류 — {e}")

    caps = {p.stem for p in REF.glob("*.html")}
    took = set(info["wrote"])
    same, diff = [], []
    for name in sorted(took):
        ref = REF / f"{name}.html"
        if not ref.exists():
            diff.append((name, ["(캡처 파일이 없다 — 프로토타입에만 있는 화면)"]))
            continue
        a = apd.flat(ref.read_text(encoding="utf-8"))
        b = apd.flat((out / f"{name}.html").read_text(encoding="utf-8"))
        if a == b:
            same.append(name)
        else:
            import difflib
            lines = [l for l in difflib.unified_diff(a, b, "캡처", "프로토타입",
                                                     lineterm="", n=0)
                     if not l.startswith(("---", "+++", "@@"))]
            diff.append((name, lines))

    unreached = sorted(caps - took)
    print(f"프로토타입 ↔ 캡처  — 캡처 {len(caps)}화면 중 {len(took)}에 닿았다\n")
    print(f"  같다   {len(same)}")
    print(f"  다르다 {len(diff)}")
    print(f"  못 닿음 {len(unreached)}\n")

    if unreached:
        print("못 닿은 화면 — 프로토타입에서 버튼으로 도달할 수 없다")
        for n in unreached:
            why = ("VocaShot 은 그 화면까지 플레이해야 닿는다"
                   if n.startswith("vocashot__")
                   else "화면 안에서 상태를 더 바꿔야 닿는다(축이 컨트롤에 없다)")
            print(f"  · {n:32} {why}")
        print()

    if diff:
        print("다른 화면 — **고치지 않는다. 어느 쪽을 맞출지는 기획 판단이다**")
        for n, lines in diff:
            print(f"\n  ✗ {n}")
            for l in lines[:12]:
                print(f"      {l}")
            if len(lines) > 12:
                print(f"      … 그 밖에 {len(lines) - 12}줄")
        print()

    # ── 완료 판정 ────────────────────────────────────────────────────
    dnames = {n for n, _ in diff}
    proto_all = "\n".join((out / f"{n}.html").read_text(encoding="utf-8") for n in took)
    caps_all = "\n".join(p.read_text(encoding="utf-8") for p in REF.glob("*.html"))

    print("2026-08-27 에 맞춘 항목이 양쪽에 있나 (§5-c) —")
    lost = []
    for label, marker, why in FIXED_MARKERS:
        inp, inc = marker in proto_all, marker in caps_all
        mark = "양쪽" if (inp and inc) else ("프로토타입만" if inp else
                                             "캡처만" if inc else "둘 다 없다")
        if not (inp and inc):
            lost.append(label)
        print(f"  {label:20} {mark:12} — {why}")

    print("\n§5-c 가 「맞췄다는 기록이 없다」고 남긴 게임 셋 —")
    for n in GAME_UNRESOLVED:
        state = "다르다" if n in dnames else ("같다" if n in same else "못 닿음")
        print(f"  {n:24} {state}")

    if lost:
        print(f"\n❌ **한 번 맞춘 항목이 한쪽에서 사라졌다** — {' · '.join(lost)}")
        print("   §5-c 의 표가 양쪽을 맞췄다고 적은 것이다. 새 차이보다 나쁜 신호다.")
        return 1

    print(f"\n{'차이 없다' if not diff else f'차이 {len(diff)}개 — 어느 쪽을 맞출지는 기획 판단이다'}")
    print("**08-27 항목이 살아 있다는 것이 「그 화면이 같다」는 뜻은 아니다** — 위 목록을 봐라.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
