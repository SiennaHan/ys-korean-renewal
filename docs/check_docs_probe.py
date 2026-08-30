#!/usr/bin/env python3
"""검사기를 검사한다 — 검사마다 일부러 어기고, 그 검사가 우는지 본다.

**왜 있나.** `check_docs.py` 는 이 저장소의 모든 문서가 기대는 것인데
**정작 그것을 검사하는 것이 없었다.** 2026-08-30 에 그 파일에서 구멍 둘을
찾았는데 둘 다 우연히 찾았다 —

  · `(\\d+)` 만 쓰는 패턴이 **한글 수사(「넷」·「다섯」)를 못 잡았다.**
    비교하는 쪽은 `HANGUL_NUM` 으로 읽을 줄 아는데 아무 패턴도 캡처하지 않았다.
  · `.md` 문서로 가는 `§N` 인용은 **한 번도 검사된 적이 없었다.**

**우연에 기대면 다음 구멍은 못 찾는다.** 그래서 검사를 넣을 때마다 손으로 하던
"틀린 값 넣어 보기" 를 여기에 굳힌다. 검사를 새로 넣으면 **항목도 같이 넣어라** —
패턴을 넣는 것과 그 패턴이 무언가를 잡는 것은 다르다.

    python3 docs/check_docs_probe.py          # 전부
    python3 docs/check_docs_probe.py 문구      # 이름에 그 글자가 든 것만

## 안전

원본을 건드렸다가 되돌린다. 그래서 두 가지를 지킨다.

  · **작업 트리가 깨끗할 때만 돈다.** 안 그러면 되돌리기가 남의 변경을 지운다.
  · 되돌린 뒤 **바이트까지 같은지 확인**한다. 다르면 거기서 멈추고 소리친다.

내용을 다 만든 뒤 마지막에 파일을 연다. `open(p, "w")` 는 **쓰기 전에 이미 비우므로**,
쓸 내용을 만들다 죽으면 파일이 0바이트로 남는다 — 2026-08-30 에 실제로
`legal_draft_v1.html` 을 그렇게 날렸다(커밋에 있어서 복구했다).

## 이 하네스를 시험하려면

"검사를 망가뜨리면 여기가 우는가" 를 확인할 때 **커밋하지 마라.**
`docs/check_docs.py` 는 `doc_review_v1.md` 가 관찰한다고 선언한 경로다 —
커밋하면 `[관찰 기준]` 이 울어서 이 하네스가 "시작부터 깨끗하지 않다" 며 거부한다.
그 자리에서 파일만 고치고 `CASES` 를 직접 부르는 쪽이 빠르다.
"""
from __future__ import annotations

import io
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CHECK = HERE / "check_docs.py"


# ── 파일을 안전하게 다루는 최소 도구 ─────────────────────────────
def read(rel: str) -> str:
    return io.open(ROOT / rel, encoding="utf-8").read()


def write(rel: str, body: str) -> None:
    """**다 만든 뒤 마지막에 연다.** 그리고 빈 내용은 쓰지 않는다."""
    if not body.strip():
        raise SystemExit(f"빈 내용을 쓰려 했다: {rel}")
    io.open(ROOT / rel, "w", encoding="utf-8").write(body)


def run_check() -> tuple[int, str]:
    r = subprocess.run([sys.executable, str(CHECK)], cwd=ROOT,
                       capture_output=True, text=True)
    return r.returncode, r.stdout + r.stderr


# ── 주입 방법 셋 ─────────────────────────────────────────────
def append(rel: str, text: str):
    return lambda: {rel: read(rel) + text}


def replace(rel: str, old: str, new: str, count: int = 1):
    def go():
        s = read(rel)
        if old not in s:
            raise SystemExit(f"주입점이 없다 — {rel}: {old[:40]!r}\n"
                             f"문서가 바뀌었으면 이 항목도 고쳐라")
        return {rel: s.replace(old, new, count)}
    return go


def stale_baseline(rel: str):
    """그 문서의 관찰 기준을 **아주 옛 커밋**으로 돌린다.

    **커밋 해시를 적어 두지 않는다.** 처음에 지금 기준을 그대로 적었더니
    다음 커밋에서 바로 주입점이 사라졌다 — 이 저장소가 문서에 대해 늘 말하는
    그 취약함을 하네스가 저지른 것이다. 지금 값을 읽어서 바꾼다.
    """
    def go():
        s = read(rel)
        m = re.search(r"@ ([0-9a-f]{7,}) -->", s)
        if not m:
            raise SystemExit(f"{rel} 에 관찰 기준이 없다")
        first = subprocess.run(["git", "rev-list", "--max-parents=0", "HEAD"],
                               cwd=ROOT, capture_output=True, text=True).stdout.split()[0][:7]
        return {rel: s.replace(m.group(0), f"@ {first} -->", 1)}
    return go


def new_file(rel: str, body: str):
    """없던 파일을 만든다 — 되돌릴 때 지운다."""
    return lambda: {rel: body}


def prepend_in_main(rel: str, text: str):
    """`<main>` 바로 뒤에 넣는다 — 앞 60자에 다른 문서 이름이 없는 자리다.

    「자기 절」검사는 이름 없이 쓴 `§N` 을 보는데, 촘촘한 문서에서는 앞쪽에
    아무 문서 이름이나 걸려 「절 인용」이 대신 운다. 그 자리를 피한다.
    """
    def go():
        s = read(rel)
        i = s.index("<main>") + len("<main>")
        return {rel: s[:i] + text + s[i:]}
    return go


# ── 항목 ────────────────────────────────────────────────────
# (이름, 기대하는 지적 태그, 주입)
#
# **「없다」를 뽑는 항목이 가장 위험하다** — 패턴이 낡아도 결과는 그럴듯하다.
# 그래서 전부 "있는 것을 심어 놓고 뒤집히는지" 로 짠다.
def has_ledger() -> bool:
    """원장 xlsx 가 저장소 루트에 있나.

    **없는 것이 정상이다** — 교재 파생이라 `.gitignore` 가 막는다. 그래서 CI 에서는
    「원장 버전」 검사가 돌 수가 없고, 그 항목을 그냥 두면 **CI 가 「안 운다」로 빨개진다**
    (실제로 그랬다 — 로컬에는 원장이 있어서 여기서는 안 보였다).
    조용히 건너뛰지 않고 **이유를 찍고** 건너뛴다. 확인한 수에서도 뺀다.
    """
    return any(ROOT.glob("글로벌_교재기반_콘텐츠_v*.xlsx"))


# (이름, 태그, 주입) 또는 (이름, 태그, 주입, 조건)
CASES: list[tuple] = [
    # ── 참조 계열
    ("색인 — 없는 문서를 부른다", "색인",
     append("docs/INDEX.md", "\n`totally_missing_doc.html` 을 부른다.\n")),
    ("절 인용 — 있는 문서의 없는 절", "절 인용",
     append("CLAUDE.md", "\n`masterplan_v3.html` §97 을 본다.\n")),
    ("절 인용 — .md 문서로 가는 §N (2026-08-30 까지 한 번도 안 봤다)", "절 인용",
     append("CLAUDE.md", "\n`BLOCKERS.md` §99 를 본다.\n")),
    ("하위절 — 있는 문서의 없는 하위절", "하위절",
     append("CLAUDE.md", "\n`access_and_pricing_v1.html` §12.9 를 본다.\n")),
    ("하위절 중복 — 같은 번호가 둘", "하위절 중복",
     replace("docs/access_and_pricing_v1.html", "<h3>11.1", "<h3>11.5 중복</h3>\n<h3>11.1")),
    ("자기 절 — 이름 없이 쓴 §N", "자기 절",
     prepend_in_main("docs/user_flow_v1.html", "\n<p>그냥 §99 를 보라고만 적는다.</p>\n")),
    ("옛 경로 — _superseded 없이 옛 이름", "옛 경로",
     append("CLAUDE.md", "\n`legacy_shell_mockup.html` 을 본다.\n")),
    ("죽은 링크", "죽은 링크",
     replace("docs/masterplan_v3.html", "</main>",
             '<p><a href="definitely_not_here.html">없는 링크</a></p>\n</main>')),
    ("앵커 — 다른 문서의 없는 앵커", "앵커",
     replace("docs/user_flow_v1.html", "</main>",
             '<p><a href="masterplan_v3.html#s999">없는 앵커</a></p>\n</main>')),
    ("id 중복", "id 중복",
     replace("docs/masterplan_v3.html", '<h2 id="s16"', '<h2 id="s15">중복</h2>\n<h2 id="s16"')),
    ("id 라벨 — 보이는 번호와 id 가 다르다", "id 라벨",
     replace("docs/masterplan_v3.html", '<h2 id="s4"', '<h2 id="s9"')),

    # ── 숫자 계열. **꼴마다 따로 본다** — 표 꼴만 보다 산문을 놓친 적이 있다
    ("숫자 주장 — 이식 화면 수 (산문 꼴)", "숫자 주장",
     append("README.md", "\n이식 화면 25 개다.\n")),
    ("숫자 주장 — 페이월 상태 수 (한글 수사 「넷」)", "숫자 주장",
     replace("docs/paywall_SOT.html", "다섯의 다음 행동", "넷의 다음 행동")),
    ("숫자 주장 — 자모 활동 수 (masterplan)", "숫자 주장",
     replace("docs/masterplan_v3.html", "한글 파트는 활동이 따로 <b>여섯</b>",
             "한글 파트는 활동이 따로 다섯")),
    ("숫자 주장 — 자모 활동 수 (jamo_authoring_spec)", "숫자 주장",
     replace("docs/jamo_authoring_spec_v1.html", "자모는 활동이 6종", "자모는 활동이 5종")),
    # **네 문서가 동시에 낡았던 수다**(2026-08-30). 지금은 아무도 안 적는다 —
    # 다시 적으면 걸리는지 본다. 한글 수사도 같이.
    ("숫자 주장 — CI 검사 스텝 수 (「게이트 여섯을 돈다」)", "숫자 주장",
     append("README.md", "\n게이트 여섯을 돈다.\n")),
    ("사실 중복 — 문서가 CI 스텝 수를 적는다", "사실 중복",
     append("README.md", "\n게이트 8 개를 돌린다.\n")),

    ("숫자 주장 — 원장 버전", "원장 버전",
     append("README.md", "\n원장 정본은 v3 이다.\n"), has_ledger),
    ("사실 중복 — 주인이 아닌 문서가 그 수를 적는다", "사실 중복",
     append("docs/user_flow_v1.html", "<p>이식 화면 26 개다.</p>\n")),

    # ── 문구 지뢰. 한 번 거짓이라 밝혀진 문장이 되살아나는 자리
    ("문구 지뢰 — 무료 범위만 낸다", "문구 지뢰",
     append("README.md", "\n이 API 는 늘 무료 범위만 낸다.\n")),
    ("문구 지뢰 — 탈퇴 기능이 없다", "문구 지뢰",
     append("README.md", "\n앱에 탈퇴 기능이 없다.\n")),
    ("문구 지뢰 — 자모 검수 전", "문구 지뢰",
     append("README.md", "\n자모는 아직 검수 전이다.\n")),
    ("문구 지뢰 — 서버 작업 미착수", "문구 지뢰",
     append("README.md", "\n서버 작업은 시작되지 않았다.\n")),

    # ── 코드를 보는 검사. **문서가 아니라 코드가 축이다**
    ("데이터 정본 — 자모 화면이 problem.ts 를 읽는다", "데이터 정본",
     lambda: {"app/src/components/learn/jamo/choose.tsx":
              'import { x } from "@/shared/data/problem";\n'
              + read("app/src/components/learn/jamo/choose.tsx")}),

    # ── 못 재는 상태. **0 을 「볼 것 없음」으로 넘기면 검사가 조용히 사라진다**
    ("잴 수 없었다 — 원본이 깨져 세는 함수가 0 을 낸다", "잴 수 없었다",
     replace("app/src/shared/data/chapter.ts", "[", "{")),

    # ── 분량. **줄과 글자를 각각 본다** — 한 줄을 길게 써서 피하는 길을 막았는지
    ("분량 — CLAUDE.md 가 줄 상한을 넘는다", "분량",
     append("CLAUDE.md", "\n" + "\n".join(f"채우는 줄 {i}" for i in range(120)) + "\n")),
    ("분량 — CLAUDE.md 가 글자 상한을 넘는다 (줄은 안 넘게)", "분량",
     append("CLAUDE.md", "\n" + "가" * 4000 + "\n")),

    # ── 관찰 기준
    ("관찰 기준 — 기준 커밋이 낡았다", "관찰 기준",
     stale_baseline("docs/legal_draft_v1.html")),

    # ── 없던 파일을 만드는 것 · 여러 파일을 같이 건드리는 것
    ("고아 — 색인에 없는 정본", "고아",
     new_file("docs/orphan_probe_v1.html",
              '<meta charset="utf-8"><title>고아 탐침</title>\n<main><h2>1 시험</h2></main>\n')),
    ("화면 승격 — 캡처가 갈렸는데 표에 줄이 없다", "화면 승격",
     lambda: {
         "app/src/screens_ref/nav__home__none.html":
             read("app/src/screens_ref/nav__home__none.html") + '<div data-probe="1"></div>\n',
         "docs/screen_promotions.md": "\n".join(
             l for l in read("docs/screen_promotions.md").split("\n")
             if not l.startswith("| `nav__home__none`")),
     }),
]


def main() -> int:
    only = sys.argv[1] if len(sys.argv) > 1 else ""

    dirty = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT,
                           capture_output=True, text=True).stdout.strip()
    if dirty:
        print("작업 트리가 깨끗하지 않다 — 되돌리기가 남의 변경을 지운다.\n"
              "커밋하거나 stash 한 뒤에 돌려라.")
        return 2

    base_code, _ = run_check()
    if base_code != 0:
        print(f"시작부터 check_docs 가 {base_code} 를 낸다 — 먼저 그것을 고쳐라.")
        return 2

    ok, bad, skipped = 0, [], []
    for case in CASES:
        name, tag, mutate = case[0], case[1], case[2]
        need = case[3] if len(case) > 3 else None
        if only and only not in name:
            continue
        if need is not None and not need():
            skipped.append(name)
            print(f"  건너뜀 {name}  — 돌릴 조건이 없다(원장이 저장소에 없는 것은 정상이다)")
            continue
        originals: dict[str, str | None] = {}
        try:
            changes = mutate()
            for rel in changes:
                # None = 원래 없던 파일. 되돌릴 때 지운다
                originals[rel] = read(rel) if (ROOT / rel).exists() else None
            for rel, body in changes.items():
                write(rel, body)
            code, out = run_check()
            fired = f"[{tag}]" in out
        finally:
            for rel, body in originals.items():
                if body is None:
                    (ROOT / rel).unlink(missing_ok=True)
                else:
                    write(rel, body)
            for rel, body in originals.items():
                now = read(rel) if (ROOT / rel).exists() else None
                if now != body:                  # 바이트까지 같아야 한다
                    print(f"!! 되돌리기 실패: {rel} — 여기서 멈춘다")
                    return 2

        if fired:
            ok += 1
            print(f"  운다   {name}")
        else:
            bad.append(name)
            print(f"  ⚠ 안 운다  {name}  (주입 뒤 exit={code})")

    # ── 생성물도 같은 규칙을 받는다 ────────────────────────────
    # `gen_status.py --check` 가 「낡았다」를 정말 잡는지. 검사 태그를 내는 것이
    # 아니라 종료코드로 말하므로 위 항목과 따로 본다.
    if not only or "생성물" in only:
        gen = HERE / "status.generated.md"
        orig = gen.read_text(encoding="utf-8") if gen.exists() else None
        try:
            write("docs/status.generated.md", (orig or "") + "\n손으로 고친 자국\n")
            r = subprocess.run([sys.executable, str(HERE / "gen_status.py"), "--check"],
                               cwd=ROOT, capture_output=True, text=True)
            fired = r.returncode != 0
        finally:
            if orig is not None:
                write("docs/status.generated.md", orig)
        total_extra = 1
        if fired:
            ok += 1
            print("  운다   생성물 — status.generated.md 가 낡으면 --check 가 잡는다")
        else:
            bad.append("생성물 — status.generated.md 낡음")
            print("  ⚠ 안 운다  생성물 — status.generated.md 가 낡아도 통과한다")
    else:
        total_extra = 0

    end_code, _ = run_check()
    if end_code != 0:
        print("\n!! 다 돌린 뒤 check_docs 가 깨끗하지 않다 — 잔재가 남았다")
        return 2

    total = ok + len(bad)
    print(f"\n{total}개 중 {ok}개가 제 몫을 한다."
          + (f" (조건이 없어 건너뛴 것 {len(skipped)}개)" if skipped else ""))
    if bad:
        print("**안 우는 것 — 검사가 있으나 마나다:**")
        for b in bad:
            print(f"  · {b}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
