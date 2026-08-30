#!/usr/bin/env python3
"""과(課) 구조의 정본이 `chapter.ts` 임을 지킨다 — 그리고 세면 안 되는 곳을 말한다.

왜 있나 — 2026-08-29 에 기획서 §0 이 **"1급만 12과"** 라고 적었다. 틀렸다.
여덟 권 모두 15과다. 어떻게 틀렸나: `n1_word_list.json` 에서 `book_id` 별로
`chapter` 를 세었는데, **1급 1~3과는 한글 파트라 어휘 데이터가 없다.**
그래서 12로 나왔다.

**이건 한 번 밟을 함정이 아니다.** 아래 표가 매번 찍는다 — 문항 데이터 파일
대부분이 1급을 12과로 보이게 한다. 하나만 열어 보고 세면 거의 확실히 틀린다.

무엇을 세나 — 셋이다.
  ① `chapter.ts` 가 정본이라는 것을 출력으로 못박는다(급별 과 수와 한글/일반 갈래)
  ② `n*.json` 이 가리키는 (book_id, chapter) 가 전부 `chapter.ts` 안에 있는가
     — 없으면 콘텐츠가 없는 과를 가리키는 것이고 화면에서 빈칸이 된다
  ③ 일반 과 중 **어떤 활동 데이터도 닿지 않는 과**가 있는가
     — 있으면 학습자가 열었을 때 활동이 하나도 없는 과다

**못 잡는 것** — 사람이 파이썬 한 줄로 `n*.json` 을 세는 것은 이 검사가 막을 수
없다. 그래서 막는 대신 **매번 소리 내어 말한다.** 게이트를 돌리는 사람은 이 표를 본다.
"""

import collections
import json
import re
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "src" / "shared" / "data"


def authority() -> dict[tuple[int, int], str]:
    """정본 — (book_id, seq) → type. `type == "jamo"` 가 한글 파트다."""
    t = (DATA / "chapter.ts").read_text()
    rows = json.loads(t[t.index("[") : t.rindex("]") + 1])
    return {(r["book_id"], r["seq"]): (r.get("type") or "") for r in rows}


def main() -> int:
    auth = authority()
    if not auth:
        print("★ chapter.ts 에서 과를 하나도 못 읽었다 — 검사가 무의미하다")
        return 1

    jamo = {k for k, v in auth.items() if v == "jamo"}
    per_book = collections.Counter(b for b, _ in auth)
    print(
        f"과 구조의 정본은 chapter.ts 다 — 과 {len(auth)}개 "
        f"(한글 {len(jamo)} · 일반 {len(auth) - len(jamo)})"
    )
    print(f"  급별 과 수: {dict(sorted(per_book.items()))}")

    # ── n*.json 이 무엇을 가리키나 ──
    seen: dict[tuple[int, int], set[str]] = collections.defaultdict(set)
    dangling: list[str] = []
    per_file_book1: list[tuple[str, int]] = []
    skipped: list[str] = []

    for f in sorted(DATA.glob("n*.json")):
        rows = json.loads(f.read_text())
        if not (isinstance(rows, list) and rows and isinstance(rows[0], dict)):
            continue
        if "book_id" not in rows[0] or "chapter" not in rows[0]:
            # 과에 직접 안 붙는 파일(다른 표의 id 로 이어진다). 셀 대상이 아니다
            skipped.append(f.name)
            continue
        for r in rows:
            k = (r["book_id"], r["chapter"])
            if k in auth:
                seen[k].add(f.name)
            else:
                dangling.append(f"{f.name}  {k} 는 chapter.ts 에 없다")
        b1 = {r["chapter"] for r in rows if r["book_id"] == 1}
        jamo_seq = {sq for (bk, sq) in jamo if bk == 1}
        per_file_book1.append((f.name, len(b1), b1 <= jamo_seq and bool(b1)))

    # ── 함정을 매번 소리 내어 말한다 ──
    true_b1 = per_book[1]
    misleading = [(n, c, only_jamo) for n, c, only_jamo in per_file_book1 if c != true_b1]
    print(
        f"\n  ── 문항 데이터에서 과 수를 세지 마라 ──\n"
        f"  1급의 참값은 {true_b1}과인데, 아래 {len(misleading)}/{len(per_file_book1)} 파일이 다르게 보인다."
    )
    for n, c, only_jamo in misleading:
        why = "한글 과만 덮는다 — 여기가 그 3과의 주인이다" if only_jamo else "한글 3과에 이 데이터가 없다"
        print(f"     {n:<32} 1급 {c:>2}과  — {why}")
    if skipped:
        print(f"     (과에 직접 안 붙는 파일: {', '.join(skipped)})")

    # ── 실패 조건 둘 ──
    empty = sorted(k for k in auth if k not in jamo and k not in seen)
    print(f"\n콘텐츠가 닿는 과 {len(seen)}/{len(auth)} · 정본 밖 참조 {len(dangling)}개")

    for line in dangling:
        print(f"  [정본 밖 과] {line}")
    for b, s in empty:
        print(f"  [빈 과] {b}급 {s}과 — 어떤 활동 데이터도 닿지 않는다")

    if dangling:
        print(
            "\n실패 — 콘텐츠가 chapter.ts 에 없는 과를 가리킨다.\n"
            "     과를 늘렸으면 chapter.ts 를 같이 고쳐라. 그 파일이 과 구조의 정본이고\n"
            "     교재학습 탭도 거기서 만들어진다(components/main/textbook/labels.ts)."
        )
    if empty:
        print(
            "\n실패 — 학습자가 열면 활동이 하나도 없는 과다.\n"
            "     한글 파트(type: \"jamo\")는 이 검사에서 빠진다 — 그 과는 n8_jamo 가 채운다."
        )
    if dangling or empty:
        return 1
    print("과 구조가 정본과 어긋나지 않는다")
    return 0


if __name__ == "__main__":
    sys.exit(main())
