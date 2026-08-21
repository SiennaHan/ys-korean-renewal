#!/usr/bin/env python3
"""문서끼리의 참조가 실제로 닿는지 검사한다.

문서를 합치거나 옮기거나 절 번호를 바꿀 때 쓴다. 사람이 "다 고쳤다" 고 믿는 대신
이것을 돌려서 확인한다 — 이 저장소는 문서를 이름과 절 번호로 인용하기 때문에
한 곳을 옮기면 조용히 끊어지는 곳이 생긴다.

  python3 phase1/check_docs.py

검사하는 것 일곱
  1. 파일 참조   : 다른 문서를 이름으로 부르는데 그 파일이 없는 경우
  2. 절 인용     : "문서이름 §N" 인데 그 문서에 N 절이 없는 경우
  3. 고아        : 아무 문서도, README·BLOCKERS 도 가리키지 않는 문서
  4. 옛 경로     : _superseded/ 로 옮겼는데 옛 경로로 부르는 곳
  5. 숫자 주장   : 문서가 적어 놓은 수를 실제로 세어 보고 다른 경우
  6. 목업 쌍둥이 : phase1/captured/ 와 app/src/mockups/ 가 갈라진 경우
  7. 색인        : 정본이 phase1/INDEX.md 에 빠진 경우

1·4 는 인계 메모(*.txt)까지 본다 — 메모가 폐기본을 현행처럼 부르고 있어도
검사기가 통과하던 틈이 있었다.

5 가 이 검사기의 핵심이다. 참조가 안 끊어졌는지만 보면, 문서에 적힌 수가
작업이 진행되며 조용히 낡는 것을 못 잡는다 — 실제로 목업 대조 화면 수가
문서마다 22·24·27 로 갈렸다. 세어서 알 수 있는 것은 세서 비교한다.

끝에 0 을 내면 통과다. 하나라도 걸리면 1 을 낸다.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
# 저장소의 문. CLAUDE.md 는 세션마다 자동으로 읽히므로 여기 적힌 수가
# 틀리면 피해가 가장 크다 — 그래서 검사 대상에 넣는다.
DOORS = [ROOT / "CLAUDE.md", ROOT / "README.md", ROOT / "BLOCKERS.md"]

# 문서 이름에 붙는 확장자 없는 형태도 인용에 쓰인다
NAME_RE = r"[A-Za-z0-9_.가-힣-]+"


def strip_tags(s: str) -> str:
    s = re.sub(r"<(script|style)\b.*?</\1>", " ", s, flags=re.S | re.I)
    return re.sub(r"<[^>]*>", " ", s)


def load() -> tuple[dict[str, str], dict[str, str], dict[str, Path]]:
    """정본·폐기본의 본문(태그 제거)과 경로를 모은다.

    코퍼스에 세 종류가 들어간다. 이름의 접두로 갈라 놓아야 검사마다
    대상을 골라 쓸 수 있다.
      (접두 없음)  phase1/*.html — 정본. 인용의 대상이 되는 것
      "(문) "      README.md · BLOCKERS.md — 저장소의 문
      "(메모) "    phase1/*.txt — 인계 메모. 인용 대상은 아니지만
                   폐기본을 부르고 있으면 사람을 잘못 보낸다
    """
    live = {p.stem: p for p in sorted(HERE.glob("*.html"))}
    dead = {p.stem: p for p in sorted((HERE / "_superseded").glob("*.html"))}
    text = {n: strip_tags(p.read_text(encoding="utf-8", errors="replace")) for n, p in live.items()}
    raw = {n: p.read_text(encoding="utf-8", errors="replace") for n, p in live.items()}
    for m in DOORS:
        if m.exists():
            text["(문) " + m.name] = m.read_text(encoding="utf-8")
            raw["(문) " + m.name] = text["(문) " + m.name]
    idx = HERE / "INDEX.md"
    if idx.exists():
        text["(문) " + idx.name] = idx.read_text(encoding="utf-8")
        raw["(문) " + idx.name] = text["(문) " + idx.name]
    for t in sorted(HERE.glob("*.txt")):
        body = t.read_text(encoding="utf-8", errors="replace")
        text["(메모) " + t.name] = body
        raw["(메모) " + t.name] = body
    return text, raw, {**live, **{n: dead[n] for n in dead}}


# "옛이름.html → _superseded/" 꼴의 줄. 문서 맨 위에 이걸 적어 두면
# 그 이름은 그 문서 안에서 봐준다 — 어디로 갔는지 이미 밝혔다는 뜻이다.
# 시점 기록(인계 메모)처럼 본문을 고쳐 쓰면 안 되는 문서를 위한 장치다.
REDIRECT_RE = re.compile(r"([A-Za-z0-9_.가-힣-]+)\.html\s*→\s*_superseded/", re.M)


def redirected(body: str) -> set[str]:
    """이 문서가 '어디로 갔는지' 이미 적어 둔 옛 이름들."""
    return {m.group(1) for m in REDIRECT_RE.finditer(body)}


def sections(body: str) -> set[str]:
    """그 문서가 가진 절 번호. §N · <h2>N제목 · "N. 제목" 을 모두 받는다."""
    out: set[str] = set()
    # h2 안의 선행 숫자 (예: "01문서 지도", "1판정 기준", "0. 공통 규칙", "4-b…")
    for h in re.findall(r"<h2[^>]*>(.*?)</h2>", body, re.S):
        t = re.sub(r"<[^>]*>", "", h).strip()
        m = re.match(r"(\d+)", t)
        if m:
            out.add(str(int(m.group(1))))
    return out


# ─────────────────────────────────────────────────────────────────────
# 세어서 알 수 있는 것
# ─────────────────────────────────────────────────────────────────────

APP = ROOT / "app"
HANGUL_NUM = {"하나": 1, "둘": 2, "셋": 3, "넷": 4, "다섯": 5, "여섯": 6,
              "일곱": 7, "여덟": 8, "아홉": 9, "열": 10}


def parity_screens() -> tuple[int, int]:
    """목업 대조가 그리는 화면 수를 스크립트에서 센다 — (활동, 내비).

    돌려 보지 않고 세는 것이 중요하다. .parity-out/ 은 .gitignore 밖이라
    받는 사람의 저장소에는 없다.
    """
    f = APP / "scripts" / "activity-parity.tsx"
    if not f.exists():
        return (0, 0)
    lines = f.read_text(encoding="utf-8", errors="replace").splitlines()
    activity, nav, inside = 0, 0, False
    for ln in lines:
        if re.match(r"const SCREENS\b", ln):
            inside = True
            continue
        if inside:
            if ln.startswith("};"):
                inside = False
            elif re.match(r"\t[A-Za-z_][A-Za-z0-9_]*:", ln):
                activity += 1
        if re.match(r"^SCREENS\.[A-Za-z0-9_]+ =", ln):
            nav += 1
    return (activity, nav)


def claims(live: set[str], text: dict[str, str]) -> list[str]:
    """문서가 적어 놓은 수와 실제로 센 수를 맞춰 본다.

    문구는 좁게 잡는다. 이 저장소에는 비슷하지만 다른 지표가 셋 있고
    (이식 화면 24 · 활동 컴포넌트 22 · 목업 대조 27) 넓게 잡으면
    맞는 숫자를 틀렸다고 잡는다.
    """
    act, nav = parity_screens()
    memos = len(list(HERE.glob("*.txt")))
    sec_total = sum(t.count("§") for n, t in text.items() if n in live)

    # (이름, 실제, 문서가 그 수를 말할 때 쓰는 문구들)
    specs: list[tuple[str, int, list[str]]] = [
        ("목업 대조 화면 수", act + nav, [
            r"(\d+)개\s*화면이\s*일치",
            r"parity:activity\s*#?\s*(\d+)개\s*화면\s*일치",
            r"parity:activity\s*가\s*(\d+)개\s*화면",
            r"목업\s*대조에?\s*들어갔다\s*—\s*(\d+)화면",
            r"구조를\s*비교하고,?\s*(\d+)개가\s*일치",
        ]),
        ("phase1 정본 문서 수", len(live), [
            r"문서가\s*(\d+)개",
            r"목업\s*HTML\s*(\d+)개",
        ]),
        ("_superseded 문서 수", len(list((HERE / "_superseded").glob("*.html"))), [
            r"정본이\s*아닌\s*(\d+)개",
            r"`?_superseded/`?\s*(\d+)개",
        ]),
        # 절 인용 총합은 여기 넣지 않는다 — 문서를 한 줄 고칠 때마다 바뀌어서
        # 정확히 맞추게 하면 신호가 아니라 잡일이 된다(한 세션에 네 번 갈렸다).
        # 대신 "400개가 넘는다" 류의 하한 주장만 아래 floors 에서 본다.
        ("인계 메모 수", memos, [
            r"인계\s*메모\s*([가-힣]+)\(",
            r"인계\s*메모\s*(\d+)개",
        ]),
    ]

    out: list[str] = []

    # 하한 주장 — "N개가 넘는다" 는 N 이 실제보다 크면 거짓이다.
    # 정확한 수를 요구하지 않으므로 문서를 고쳐도 흔들리지 않는다.
    floors = [("절 인용 § 총합", sec_total, [r"절\s*인용이?\s*(?:\*\*)?(\d+)개[가를]?\s*넘"])]
    for label, real, pats in floors:
        for src, body in text.items():
            flat = re.sub(r"\s+", " ", body)
            for pat in pats:
                for m in re.finditer(pat, flat):
                    floor = int(m.group(1))
                    if real < floor:
                        out.append(
                            f"[숫자 주장] {src} → {label} 이 {floor} 을 넘는다고 적었는데 "
                            f"실제는 {real} 다"
                        )

    for label, real, pats in specs:
        if real == 0:
            continue
        for src, body in text.items():
            flat = re.sub(r"\s+", " ", body)
            for pat in pats:
                for m in re.finditer(pat, flat):
                    tok = m.group(1)
                    got = HANGUL_NUM.get(tok, None)
                    if got is None:
                        if not tok.isdigit():
                            continue
                        got = int(tok)
                    if got != real:
                        ctx = flat[max(0, m.start() - 45):m.end() + 35].strip()
                        out.append(
                            f"[숫자 주장] {src} → {label} 을 {tok} 이라 적었는데 실제는 {real}\n"
                            f"           …{ctx}…"
                        )
    return out


# captured/ 와 mockups/ 가 일부러 다른 곳. 이유를 적어야 넣을 수 있고,
# 눈감아 준 것은 실행할 때마다 같이 찍는다 — parity 스크립트와 같은 규칙이다.
TWIN_ALLOW = {
    "nav__home__none.html": "캡처는 탭바가 위·홈 비활성. mockups 가 아래·활성으로 고친 판(08-20)",
    "nav__home__resume.html": "같음",
    "nav__home__review.html": "같음",
}


def mockup_twins() -> tuple[list[str], list[str]]:
    """phase1/captured/ 와 app/src/mockups/ 가 갈라졌는지 본다.

    captured/ 는 목업에서 뜬 날것이고 app/src/mockups/ 가 정본이다
    (parity 가 읽는 것이 후자뿐이다). 둘은 47개 중 44개가 바이트까지
    같아서, 갈라지면 아무 경고 없이 통과한다 — 실제로 홈 셋이 그랬다.

    돌려주는 것은 (문제, 눈감아 준 것) 둘이다.
    """
    a, b = HERE / "captured", APP / "src" / "mockups"
    if not a.is_dir() or not b.is_dir():
        return ([], [])
    bad: list[str] = []
    ok: list[str] = []
    an = {p.name for p in a.glob("*.html")}
    bn = {p.name for p in b.glob("*.html")}
    for only, where in ((an - bn, "captured/ 에만"), (bn - an, "app/src/mockups/ 에만")):
        for n in sorted(only):
            bad.append(f"[목업 쌍둥이] {n} 이 {where} 있다")
    for n in sorted(an & bn):
        if (a / n).read_bytes() == (b / n).read_bytes():
            continue
        if n in TWIN_ALLOW:
            ok.append(f"{n} — {TWIN_ALLOW[n]}")
        else:
            bad.append(
                f"[목업 쌍둥이] {n} 의 내용이 갈렸다 — parity 는 app/src/mockups/ 만 본다.\n"
                f"           일부러라면 TWIN_ALLOW 에 이유를 적어라"
            )
    for n in sorted(TWIN_ALLOW):
        if n in an & bn and (a / n).read_bytes() == (b / n).read_bytes():
            bad.append(f"[목업 쌍둥이] {n} 은 이제 같다 — TWIN_ALLOW 에서 빼라")
    return (bad, ok)


def index_covers(live: set[str]) -> list[str]:
    """색인이 정본 전부를 담고 있는지 본다.

    이 저장소가 문서를 못 따라잡은 이유는 목록이 두 곳(README 표 ·
    handoff §01)에 있었던 것이다. 한쪽만 고쳐지니 25 와 26 으로 갈렸다.
    목록을 phase1/INDEX.md 하나로 줄이고, 그 하나가 비면 검사기가 잡는다.
    """
    idx = HERE / "INDEX.md"
    if not idx.exists():
        return ["[색인] phase1/INDEX.md 가 없다 — 문서 목록이 살 곳이 하나 있어야 한다"]
    body = idx.read_text(encoding="utf-8", errors="replace")
    out: list[str] = []
    for n in sorted(live):
        if n not in body:
            out.append(
                f"[색인] {n} 이 INDEX.md 에 없다 — 문서를 만들었으면 색인에 한 줄 넣어라"
            )
    # 색인이 없는 파일을 부르는 경우
    for m in re.finditer(r"`([A-Za-z0-9_.가-힣-]+)\.html`", body):
        if m.group(1) not in live:
            out.append(f"[색인] INDEX.md 가 없는 문서 {m.group(1)} 을 가리킨다")
    return out


def main() -> int:
    text, raw, paths = load()
    # 정본은 phase1/*.html 뿐이다 — 문과 메모는 인용의 대상이 아니다
    live = {
        n for n in text
        if not n.startswith("(문) ") and not n.startswith("(메모) ")
    }
    dead = {p.stem for p in (HERE / "_superseded").glob("*.html")}
    secs = {n: sections(raw[n]) for n in live}

    problems: list[str] = []

    # ── 1·4. 파일 참조와 옛 경로
    for src, body in text.items():
        skip = redirected(body)
        for name in sorted(dead):
            if name in skip:
                continue
            # _superseded/ 를 붙이지 않고 옛 이름만 부르는 곳
            for m in re.finditer(re.escape(name), body):
                lead = body[max(0, m.start() - 14):m.start()]
                if "_superseded/" in lead:
                    continue
                wide = body[max(0, m.start() - 140):m.end() + 140]
                snip = re.sub(r"\s+", " ", body[max(0, m.start() - 60):m.end() + 60]).strip()
                # 이동 자체를 서술하는 문장은 봐준다 — "옮겼다/옮긴/옮길" 을 어간으로 잡고,
                # 근처에 _superseded 가 있으면 그 대목을 설명하는 중이라고 본다
                if "_superseded" in wide:
                    continue
                if any(w in snip for w in ("대체", "옮", "폐기", "틀렸", "옛 경로", "정본처럼")):
                    continue
                problems.append(f"[옛 경로] {src} → {name} (앞에 _superseded/ 가 없다)\n           …{snip}…")

    # ── 2. 절 인용: §N 앞쪽에서 "가장 가까운" 문서 이름 하나에만 귀속시킨다.
    # 표의 칸끼리는 서로 가까워서, 범위 안의 모든 이름에 걸면 옆 칸의 § 를 잘못 붙인다.
    for src, body in text.items():
        for m in re.finditer(r"§\s?(\d+)", body):
            sec = str(int(m.group(1)))
            lead = body[max(0, m.start() - 60):m.start()]
            nearest, at = None, -1
            for tgt in live:
                i = lead.rfind(tgt)
                if i > at:
                    nearest, at = tgt, i
            if nearest is None or not secs.get(nearest):
                continue
            # 이름과 § 사이에 다른 문서 이름이 끼면 귀속이 불확실하니 건너뛴다
            between = lead[at + len(nearest):]
            if any(o in between for o in live if o != nearest):
                continue
            if sec not in secs[nearest]:
                have = ",".join(sorted(secs[nearest], key=int)) or "(없음)"
                ctx = re.sub(r"\s+", " ", body[max(0, m.start() - 50):m.end() + 20]).strip()
                problems.append(
                    f"[절 인용] {src} → {nearest} §{m.group(1)} 인데 그 문서의 절은 {have}\n"
                    f"           …{ctx}…"
                )

    # ── 3. 고아
    # 메모는 문이 아니다 — 메모만 가리키는 문서는 여전히 고아로 본다
    for n in sorted(live):
        cited = any(
            n in body
            for src, body in text.items()
            if src != n and not src.startswith("(메모) ")
        )
        if not cited:
            problems.append(f"[고아] {n} — 아무 문서도, README·BLOCKERS 도 가리키지 않는다")

    # ── 5. 숫자 주장
    problems += claims(live, text)

    # ── 7. 색인 정합성
    problems += index_covers(live)

    # ── 6. 목업 쌍둥이
    twin_bad, twin_ok = mockup_twins()
    problems += twin_bad

    # ── 결과
    act, nav = parity_screens()
    memos = len(list(HERE.glob("*.txt")))
    print(
        f"정본 {len(live)}개 · 폐기본 {len(dead)}개 · "
        f"문 {len(DOORS)}개 + 색인 1 · 메모 {memos}개"
    )
    print(
        f"센 것: 목업 대조 {act + nav}화면(활동 {act} + 내비 {nav}) · "
        f"절 인용 {sum(t.count('§') for n, t in text.items() if n in live)}개"
    )
    for line in twin_ok:
        print(f"눈감아 준 목업 차이: {line}")
    if not problems:
        print("통과 — 끊어진 참조 없음")
        return 0
    print(f"\n걸린 것 {len(problems)}개\n")
    for p in problems:
        print("  " + p)
    return 1


if __name__ == "__main__":
    sys.exit(main())
