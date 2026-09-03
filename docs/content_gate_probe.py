#!/usr/bin/env python3
"""콘텐츠 공개 게이트를 검사하는 것을 검사한다 — 일부러 어기고, 우는지 본다.

**왜 있나(DEV-07).** 「검수 상태가 문서 문구가 아니라 실제 배포 산출물을 막는
규칙이 되게 한다」가 이 카드의 목적인데, 정작 **그 규칙이 지켜지는지 확인하는 것이
글자 대조뿐**이었다. `project_contract.py` 는 `build-content.py` 안에
`DROP_STATUS = {"deleted"}` 라는 **문자열이 있는지**만 봤다.

그래서 이런 변경이 통과했다 —

    if st in DROP_STATUS or st.startswith("draft"):   # 상수는 안 건드렸다
        dropped += 1

**상수 글자는 그대로고 학생에게 나가는 것만 달라진다.** 저작 중인 9,124행이
조용히 사라지거나, 반대로 `deleted` 가 새어 나가도 게이트는 초록불이다.

그래서 `project_contract.py` 에 `check_publication_behavior` 를 넣어 **정책을
돌려서** 보게 했고, 이 파일은 **그 검사가 정말 무는지**를 지킨다. 검사를 넣는 것과
그 검사가 무언가를 잡는 것은 다르다 — `check_docs_probe.py` 가 문서 쪽에서 같은
말을 하고 있고, 이것은 콘텐츠 쪽 판이다.

    python3 docs/content_gate_probe.py          # 전부
    python3 docs/content_gate_probe.py 동작      # 이름에 그 글자가 든 것만

## 원장이 없어도 돈다

이 검사는 **지어낸 행**을 `drop_unshippable` 에 통과시킨다. 원장 xlsx 는 저장소에
없으므로(`.gitignore` 의 `*.xlsx` — 교재 파생이라 일부러 뺐다) 원장을 읽는 검사는
CI 에서 못 돈다. 정책이 지켜지는지는 원장과 무관한 성질이라 이렇게 갈랐다.

## 안전

`check_docs_probe.py` 와 같은 규칙을 쓴다.

  · **작업 트리가 깨끗할 때만 돈다.** 안 그러면 되돌리기가 남의 변경을 지운다.
  · 되돌린 뒤 **바이트까지 같은지 확인**한다. 다르면 거기서 멈추고 소리친다.
  · 내용을 다 만든 뒤 마지막에 파일을 연다 — `open(p, "w")` 는 쓰기 전에 이미
    비우므로, 쓸 내용을 만들다 죽으면 파일이 0바이트로 남는다.
"""
from __future__ import annotations

import io
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CONTRACT = HERE / "project_contract.py"

BUILDER = "app/scripts/build-content.py"
STATUS_JSON = "docs/project_status.json"


# ── 파일을 안전하게 다루는 최소 도구 ─────────────────────────────
def read(rel: str) -> str:
    return io.open(ROOT / rel, encoding="utf-8").read()


def write(rel: str, body: str) -> None:
    """**다 만든 뒤 마지막에 연다.** 그리고 빈 내용은 쓰지 않는다."""
    if not body.strip():
        raise SystemExit(f"빈 내용을 쓰려 했다: {rel}")
    io.open(ROOT / rel, "w", encoding="utf-8").write(body)


def run_contract() -> tuple[int, str]:
    r = subprocess.run([sys.executable, str(CONTRACT)], cwd=ROOT,
                       capture_output=True, text=True)
    return r.returncode, r.stdout + r.stderr


def replace(rel: str, old: str, new: str, count: int = 1):
    def go():
        s = read(rel)
        if old not in s:
            raise SystemExit(f"주입점이 없다 — {rel}: {old[:60]!r}\n"
                             f"코드가 바뀌었으면 이 항목도 고쳐라")
        return {rel: s.replace(old, new, count)}
    return go


def policy(**changes):
    """`project_status.json` 의 content_publication 을 고친다."""
    def go():
        d = json.loads(read(STATUS_JSON))
        d["policies"]["content_publication"].update(changes)
        return {STATUS_JSON: json.dumps(d, ensure_ascii=False, indent=2) + "\n"}
    return go


# ── 어길 것들 ────────────────────────────────────────────────
#
# 셋째 칸은 **울 때 나와야 하는 말의 한 조각**이다. 비어 있으면 「울면 안 된다」는
# 뜻이다 — 검사가 넓어져서 멀쩡한 것까지 무는 사고를 막는다.
CASES: list[tuple] = [
    # ── 정책 상수 계열: JSON 쪽을 어긴다
    ("정책 — 제외 목록에 draft 를 더한다", "제외 상태는 deleted 하나",
     policy(excluded_review_statuses=["deleted", "draft"])),
    ("정책 — 모르는 상태를 버리겠다고 한다", "경고 후 포함",
     policy(unknown_status_behavior="drop")),
    ("정책 — mode 를 모르는 값으로", "mode 가 허용값이 아니다",
     policy(mode="ship_everything")),

    # ── 정책 상수 계열: 코드 쪽을 어긴다
    ("상수 — DROP_STATUS 에 draft 를 더한다", "DROP_STATUS가 다르다",
     replace(BUILDER, 'DROP_STATUS = {"deleted"}',
             'DROP_STATUS = {"deleted", "draft"}')),

    # ── 실제 행 처리 계열: **상수는 그대로 두고 동작만 바꾼다**
    #
    # 여기가 이 파일이 있는 이유다. 위 네 개는 글자 대조로도 잡히지만
    # 아래 다섯은 **돌려 보지 않으면 못 잡는다** — 검사를 떼고 돌려서 이 다섯만
    # 「안 운다」로 뒤집히는 것을 확인했다(2026-09-03).
    ("동작 — 상수는 그대로, draft 를 몰래 막는다", "나가야 하는데 막혔다",
     replace(BUILDER,
             "        if st in DROP_STATUS:",
             '        if st in DROP_STATUS or st.startswith("draft"):')),
    ("동작 — deleted 를 그냥 내보낸다", "막혀야 하는데 나갔다",
     replace(BUILDER,
             "        if st in DROP_STATUS:\n            dropped += 1\n            continue",
             "        if False:\n            dropped += 1\n            continue")),
    ("동작 — 모르는 상태를 조용히 넘긴다", "경고하지 않는다",
     replace(BUILDER, "            unknown.add(st)", "            pass")),
    ("동작 — review_status 열이 없는 시트를 비운다", "그대로 통과시키지 않는다",
     replace(BUILDER,
             '    if not rows or "review_status" not in rows[0]:\n        return rows, 0, set()',
             '    if not rows or "review_status" not in rows[0]:\n        return [], 0, set()')),
    ("동작 — drop_unshippable 자체를 없앤다", "drop_unshippable 이 없다",
     replace(BUILDER, "def drop_unshippable(sheet, rows):",
             "def _renamed_away(sheet, rows):")),

    # ── 울면 안 되는 것 ─────────────────────────────────────
    #
    # 정책과 무관한 자리를 건드렸을 때까지 물면 검사가 너무 넓은 것이다.
    ("대조군 — 정책과 무관한 주석을 고친다", "",
     replace(BUILDER, "# ── 검수 상태 ─", "# ── 검수 상태(주석만 바꿔 본다) ─")),
]


def main() -> int:
    only = sys.argv[1] if len(sys.argv) > 1 else ""

    dirty = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT,
                           capture_output=True, text=True).stdout.strip()
    if dirty:
        print("작업 트리가 깨끗하지 않다 — 되돌리기가 남의 변경을 지운다.\n"
              "커밋하거나 stash 한 뒤에 돌려라.")
        return 2

    base_code, base_out = run_contract()
    if base_code != 0:
        print(f"시작부터 project_contract 가 {base_code} 를 낸다 — 먼저 그것을 고쳐라.\n{base_out}")
        return 2

    ok, bad = 0, []
    for name, need, mutate in CASES:
        if only and only not in name:
            continue
        originals: dict[str, str] = {}
        try:
            changes = mutate()
            for rel in changes:
                originals[rel] = read(rel)
            for rel, body in changes.items():
                write(rel, body)
            code, out = run_contract()
            fired = (code == 0) if not need else (code != 0 and need in out)
        finally:
            for rel, body in originals.items():
                write(rel, body)
            for rel, body in originals.items():
                if read(rel) != body:            # 바이트까지 같아야 한다
                    print(f"!! 되돌리기 실패: {rel} — 여기서 멈춘다")
                    return 2

        if fired:
            ok += 1
            print(f"  {'조용' if not need else '운다'}   {name}")
        else:
            bad.append(name)
            print(f"  ⚠ {'울었다' if not need else '안 운다'}  {name}  (주입 뒤 exit={code})")

    print()
    if bad:
        # **「아무도 안 잡았다」고 말하지 않는다.** 여기서 보는 것은 *기대한 지적이
        # 나왔는가* 다. 어떤 주입은 다른 검사(글자 대조)가 대신 물어서 exit 는 1인데
        # 이 자리의 말은 안 나올 수 있다 — 그것도 실패로 친다. 물어야 할 검사가
        # 물지 않으면, 글자 대조를 우회하는 다음 변경은 그냥 통과하기 때문이다.
        print(f"콘텐츠 게이트 대조군 실패 {len(bad)}개 — 기대한 지적이 안 나왔다:")
        for name in bad:
            print(f"  - {name}")
        return 1
    print(f"콘텐츠 공개 게이트 대조군 통과 — {ok}개를 어겨 봤고 검사가 다 알아챘다")
    return 0


if __name__ == "__main__":
    sys.exit(main())
