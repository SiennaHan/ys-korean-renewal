#!/usr/bin/env python3
"""v60.7 — n4_blank_question.grammar_focus_수정 안 문법 표기를 '-형태' 로 통일한다.

기획자 피드백(2026-09-15): 문법 사항은 '-아/어요' 처럼 **홑따옴표 + 하이픈**을
같이 쓰는 게 이 칸의 관례인데, 어떤 행은 따옴표 없이 하이픈만 쓰거나
따옴표는 있는데 하이픈이 빠져 있다. 둘 다 '-아/어요' 꼴로 맞춘다.

**어떻게 골랐나 — 짐작하지 않고 같은 문법점 형제 행과 대조했다.**
이 칸은 문항마다 같은 문법 설명을 반복하므로(한 문법점에 문항 여러 개),
같은 GF-급-과- 그룹 안에서 절대다수가 이미 '-하이픈' 꼴이면 소수의 빠진
행이 오타다. 예를 들어 '을/ㄹ 뿐이다'는 GF-7-12 그룹 4행 전부 하이픈이
빠졌는데 바로 옆 '따름이다'는 같은 행들에서 이미 '-을/ㄹ 따름이다'로 맞게
쓰여 있어 대조가 쉬웠다. 반대로 'ㄹ'·'ㄴ'·'에' 처럼 하이픈 있는 쪽과 없는
쪽이 섞여 있어도 실제로는 **다른 뜻**(자음 이름 vs 어미, 다른 과의 다른
문법점)인 경우는 걸렀다 — 원문을 다 열어 확인했다.

## Part A — 따옴표가 아예 없던 것 (20건)
'스템+-어요/아요/여요=결과' 식 공식형 표기 5개 과(GF-1-10·2-3·2-5·2-12·6-4)에
하이픈 붙은 어미가 따옴표 없이 그대로 있었다. 어미 부분만 따옴표로 감싼다
(공식의 +·= 은 그대로 둔다).

## Part B — 따옴표는 있는데 하이픈이 빠진 것 (13개 문법점 · 22행)
같은 문법점의 형제 행 절대다수가 이미 하이픈을 쓰고 있어서 확인했다:
고 · 은/ㄴ데요 · 는데 · 기는 하지만 · 었/았/였군요 · 을/ㄹ텐데 ·
을/ㄹ 뿐이다 · 으세요/세요 · 어/아/여요 · 는/ㄴ다 싶다 · 을/를 위해서 ·
한테서 · 밖에.

돌리기
    python3 illust/fix_grammar_focus_hyphen_quote.py           # 확인만
    python3 illust/fix_grammar_focus_hyphen_quote.py --write   # 실제 반영
"""
from __future__ import annotations

import argparse
import shutil
from datetime import datetime
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
LEDGER = ROOT / "글로벌_교재기반_콘텐츠_v60.xlsx"

# Part B — (따옴표 안 내용, 문법점 설명용 라벨)
HYPHEN_ADDITIONS = [
    "고",
    "은/ㄴ데요",
    "는데",
    "기는 하지만",
    "었/았/였군요",
    "을/ㄹ텐데",
    "을/ㄹ 뿐이다",
    "으세요/세요",
    "어/아/여요",
    "는/ㄴ다 싶다",
    "을/를 위해서",
    "한테서",
    "밖에",
    "밖에, 만",
]

CHANGE_NOTE = (
    "v60.7(2026-09-15) 기획자 피드백 — 문법 표기를 '-하이픈' 꼴로 통일. "
    "같은 문법점 형제 행 대조로 확인함(자음 이름·다른 문법점과의 우연한 "
    "글자 겹침은 원문 확인 후 제외)"
)


def append_note(cell):
    old = cell.value
    cell.value = f"{old} / {CHANGE_NOTE}" if old else CHANGE_NOTE


# Part A — 따옴표가 아예 없던 셀. 자동 경계 추정 대신 셀별 전체 문자열을
# 직접 대조한다 — "-어/아/여 있다를" 처럼 뒤에 조사가 붙어 있으면 정규식은
# 조사까지 같이 먹어 버리는데(붙여 쓰기라 띄어쓰기로 못 가른다), 이 표는
# 20건뿐이라 손으로 경계를 확인하는 편이 정규식을 정교화하는 것보다 안전하다.
PART_A_FIXES = {
    "GF-1-10-002": ("먹+-어요/아요/여요=먹어요", "먹+'-어요/아요/여요'=먹어요"),
    "GF-1-10-005": ("마시다+-어요/아요/여요= 마셔요", "마시다+'-어요/아요/여요'= 마셔요"),
    "GF-1-10-006": ("보다+-어요/아요/여요=봐요", "보다+'-어요/아요/여요'=봐요"),
    "GF-2-3-006": ("가다+-어/아/여 주다= 가 주다", "가다+'-어/아/여 주다'= 가 주다"),
    "GF-2-3-007": ("닫다+-어/아/여 주다= 닫아 주다", "닫다+'-어/아/여 주다'= 닫아 주다"),
    "GF-2-3-008": ("쓰다+-어/아/여 주다= 써 주다", "쓰다+'-어/아/여 주다'= 써 주다"),
    "GF-2-3-009": ("읽다+-어/아/여 주다= 읽어 주다", "읽다+'-어/아/여 주다'= 읽어 주다"),
    "GF-2-3-010": ("이야기하다+-어/아/여 주다= 이야기해 주다", "이야기하다+'-어/아/여 주다'= 이야기해 주다"),
    "GF-2-5-001": ("좋다+-어서/아서/여서=좋아서", "좋다+'-어서/아서/여서'=좋아서"),
    "GF-2-5-002": ("없다+-어서/아서/여서=없어서", "없다+'-어서/아서/여서'=없어서"),
    "GF-2-5-003": ("피곤하다+-어서/아서/여서=피곤해서", "피곤하다+'-어서/아서/여서'=피곤해서"),
    "GF-2-5-004": ("고프다+-어서/아서/여서=고파서", "고프다+'-어서/아서/여서'=고파서"),
    "GF-2-5-005": ("재미있다+-어서/아서/여서=재미있어서", "재미있다+'-어서/아서/여서'=재미있어서"),
    "GF-2-12-001": ("가다+-어서/아서/여서= 가서", "가다+'-어서/아서/여서'= 가서"),
    "GF-2-12-002": ("사다+-어서/아서/여서= 사서", "사다+'-어서/아서/여서'= 사서"),
    "GF-2-12-003": ("빌리다+-어서/아서/여서= 빌려서", "빌리다+'-어서/아서/여서'= 빌려서"),
    "GF-2-12-004": ("받아+-어서/아서/여서= 받아서", "받아+'-어서/아서/여서'= 받아서"),
    "GF-2-12-005": ("만들다+-어서/아서/여서= 만들어서", "만들다+'-어서/아서/여서'= 만들어서"),
    "GF-6-4-003": (
        "상태를 나타내는 피동사 '쓰이다'+-어/아/여 있다를 사용해 '쓰여 있다'가 됩니다.",
        "상태를 나타내는 피동사 '쓰이다'+'-어/아/여 있다'를 사용해 '쓰여 있다'가 됩니다.",
    ),
    "GF-6-4-004": (
        "상태를 나타내는 피동사 '꽂히다'+-어/아/여 있다를 사용해 '꽂혀있다'가 됩니다.",
        "상태를 나타내는 피동사 '꽂히다'+'-어/아/여 있다'를 사용해 '꽂혀있다'가 됩니다.",
    ),
}


def fix_partA(item_id: str, text: str) -> tuple[str, int]:
    fix = PART_A_FIXES.get(item_id)
    if fix is None:
        return text, 0
    old, new = fix
    assert text == old, f"{item_id} 의 원문이 예상과 다르다: {text!r}"
    return new, 1


def fix_partB(text: str) -> tuple[str, int]:
    n = 0
    for bare in HYPHEN_ADDITIONS:
        old_span = f"'{bare}'"
        new_span = f"'-{bare}'"
        count = text.count(old_span)
        if count:
            text = text.replace(old_span, new_span)
            n += count
    return text, n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()

    wb = openpyxl.load_workbook(LEDGER)
    ws = wb["n4_blank_question"]
    header = [c.value for c in ws[1]]
    col = {h: i + 1 for i, h in enumerate(header)}
    gi = col["grammar_focus_수정"] - 1
    ni = col["change_note"] - 1
    ii = col["item_id"] - 1

    totalA = totalB = rows_touched = 0
    for row in ws.iter_rows(min_row=2):
        cell = row[gi]
        val = cell.value
        if not isinstance(val, str) or not val.strip():
            continue
        newA, nA = fix_partA(row[ii].value, val)
        newB, nB = fix_partB(newA)
        if nA or nB:
            print(f"{row[ii].value}  (A={nA} B={nB})")
            print(f"  전: {val}")
            print(f"  후: {newB}")
            if args.write:
                cell.value = newB
                append_note(row[ni])
            totalA += nA
            totalB += nB
            rows_touched += 1

    print(f"\n합계 — Part A(따옴표 추가) {totalA}건 · Part B(하이픈 추가) {totalB}건 · 총 {rows_touched}행")

    if not args.write:
        print("\n--dry(기본값)라 원장을 쓰지 않았다. --write 로 반영해라.")
        return

    backup = LEDGER.with_name(
        LEDGER.stem + f".backup-{datetime.now():%Y%m%d-%H%M%S}.xlsx"
    )
    shutil.copy2(LEDGER, backup)
    wb.save(LEDGER)
    print(f"\n저장했다. 백업 — {backup.name}")


if __name__ == "__main__":
    main()
