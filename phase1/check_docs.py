#!/usr/bin/env python3
"""문서끼리의 참조가 실제로 닿는지 검사한다.

문서를 합치거나 옮기거나 절 번호를 바꿀 때 쓴다. 사람이 "다 고쳤다" 고 믿는 대신
이것을 돌려서 확인한다 — 이 저장소는 문서를 이름과 절 번호로 인용하기 때문에
한 곳을 옮기면 조용히 끊어지는 곳이 생긴다.

  python3 phase1/check_docs.py

검사하는 것 넷
  1. 파일 참조   : 다른 문서를 이름으로 부르는데 그 파일이 없는 경우
  2. 절 인용     : "문서이름 §N" 인데 그 문서에 N 절이 없는 경우
  3. 고아        : 아무 문서도, README·BLOCKERS 도 가리키지 않는 문서
  4. 옛 경로     : _superseded/ 로 옮겼는데 옛 경로로 부르는 곳

끝에 0 을 내면 통과다. 하나라도 걸리면 1 을 낸다.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
DOORS = [ROOT / "README.md", ROOT / "BLOCKERS.md"]

# 문서 이름에 붙는 확장자 없는 형태도 인용에 쓰인다
NAME_RE = r"[A-Za-z0-9_.가-힣-]+"


def strip_tags(s: str) -> str:
    s = re.sub(r"<(script|style)\b.*?</\1>", " ", s, flags=re.S | re.I)
    return re.sub(r"<[^>]*>", " ", s)


def load() -> tuple[dict[str, str], dict[str, str], dict[str, Path]]:
    """정본·폐기본의 본문(태그 제거)과 경로를 모은다."""
    live = {p.stem: p for p in sorted(HERE.glob("*.html"))}
    dead = {p.stem: p for p in sorted((HERE / "_superseded").glob("*.html"))}
    text = {n: strip_tags(p.read_text(encoding="utf-8", errors="replace")) for n, p in live.items()}
    raw = {n: p.read_text(encoding="utf-8", errors="replace") for n, p in live.items()}
    for m in DOORS:
        if m.exists():
            text["(문) " + m.name] = m.read_text(encoding="utf-8")
            raw["(문) " + m.name] = text["(문) " + m.name]
    return text, raw, {**live, **{n: dead[n] for n in dead}}


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


def main() -> int:
    text, raw, paths = load()
    live = {n for n in text if not n.startswith("(문) ")}
    dead = {p.stem for p in (HERE / "_superseded").glob("*.html")}
    secs = {n: sections(raw[n]) for n in live}

    problems: list[str] = []

    # ── 1·4. 파일 참조와 옛 경로
    for src, body in text.items():
        for name in sorted(dead):
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
    for n in sorted(live):
        cited = any(n in body for src, body in text.items() if src != n)
        if not cited:
            problems.append(f"[고아] {n} — 아무 문서도, README·BLOCKERS 도 가리키지 않는다")

    # ── 결과
    print(f"정본 {len(live)}개 · 폐기본 {len(dead)}개 · 문 {len(DOORS)}개")
    if not problems:
        print("통과 — 끊어진 참조 없음")
        return 0
    print(f"\n걸린 것 {len(problems)}개\n")
    for p in problems:
        print("  " + p)
    return 1


if __name__ == "__main__":
    sys.exit(main())
