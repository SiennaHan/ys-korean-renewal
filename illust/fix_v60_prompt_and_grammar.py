#!/usr/bin/env python3
"""v60.2·v60.3 — 미션대화 프롬프트를 편집된 첫 대사에 맞추고, 빈칸채우기 해설의
품사 표기를 불규칙 표기로 통일한다.

v60.2 — MC-7-04-001
    기획자가 ai_first_line 을 「내일 이사인데, 이사 업체 기사님이 다쳐서 갑자기
    못 오신대요. 혹시 내일 와서 좀 도와주실 수 있어요?」에서 「내일 바쁘세요?
    급히 도움이 필요해서요.」로 직접 고쳤다(change_note 없이 — 스프레드시트에서
    바로 편집). 그런데 ai_persona_prompt 의 "# 첫 대사 (고정)" 은 옛 문장을
    그대로 인용하고 있었고, "대화의 흐름" 도 AI 가 첫 마디부터 이사 사정을
    설명한다고 적혀 있었다 — 둘 다 새 첫 대사와 어긋난다.
    미션 1(놀라움)의 예시("이사 하루 전에 업체가 못 온다니...")는 이사 사정을
    사용자가 이미 안다고 전제하므로, 사정 자체를 지우지 않고 **한 턴 늦춘다**:
    AI 는 첫 마디로는 사정을 밝히지 않고, 사용자가 무슨 일이냐고 물으면 그때
    옛 문장 그대로 사정을 설명한다. 미션·예시·목표문법은 그대로 유효하다.

v60.3 — n4_blank_question.grammar_focus_수정
    'ㅎ동사'·'ㅎ형용사'는 표준 문법 용어가 아니다(하다·형용사 구분과 상관없이
    똑같이 'ㅎ'이 탈락하는 불규칙 활용이다 — 어떻다·빨갛다는 형용사인데도
    'ㅎ동사'라고 적힌 칸이 있었다). 품사 구분 없이 'ㅎ불규칙'·'ㅂ불규칙'으로
    통일한다. 해설 문장 안의 다른 말은 건드리지 않는다.

돌리기
    python3 illust/fix_v60_prompt_and_grammar.py           # 확인만(--dry 기본값)
    python3 illust/fix_v60_prompt_and_grammar.py --write   # 원장에 실제로 쓴다
"""
from __future__ import annotations

import argparse
import shutil
from datetime import datetime
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
LEDGER = ROOT / "글로벌_교재기반_콘텐츠_v60.xlsx"

OLD_FIRST_LINE = (
    "내일 이사인데, 이사 업체 기사님이 다쳐서 갑자기 못 오신대요. "
    "혹시 내일 와서 좀 도와주실 수 있어요?"
)
NEW_FIRST_LINE = "내일 바쁘세요? 급히 도움이 필요해서요."

OLD_FLOW = (
    "AI는 내일 이사를 하는데 이사 업체 기사님이 다쳐서 갑자기 못 오게 됐다. "
    "AI가 사정을 설명하며 내일 와서 도와줄 수 있는지 묻는다. 사용자는 그 소식에 "
    "놀라고, 상대의 사정에 공감한 뒤, 자신도 도저히 갈 수 없는 이유를 들어 "
    "정중하게 거절한다. 대화는 처음부터 끝까지 존댓말로 이어진다."
)
NEW_FLOW = (
    "AI는 내일 바쁜지 물으며 급히 도움이 필요하다고만 말한다 — 이 시점에는 "
    "무슨 일인지 밝히지 않는다. 사용자가 무슨 일이냐고 물으면 그제서야 내일 "
    "이사를 하는데 이사 업체 기사님이 다쳐서 갑자기 못 오게 됐다고 사정을 "
    "설명하며 내일 와서 도와줄 수 있는지 묻는다. 사용자는 그 소식에 놀라고, "
    "상대의 사정에 공감한 뒤, 자신도 도저히 갈 수 없는 이유를 들어 정중하게 "
    "거절한다. 대화는 처음부터 끝까지 존댓말로 이어진다."
)

OLD_FIRST_LINE_BLOCK = (
    "# 첫 대사 (고정)\n"
    "대화는 반드시 아래 문장으로 시작합니다. 이 문장만 말하고 사용자의 응답을 기다리세요.\n"
    f"「{OLD_FIRST_LINE}」\n"
    "※ 이 문장은 고정 대사입니다. 아래의 어떤 규칙보다 우선하며 한 글자도 바꾸지 마세요.\n"
    "※ 두 번째 문장부터는 사용자의 응답을 듣고 나서 말합니다."
)
NEW_FIRST_LINE_BLOCK = (
    "# 첫 대사 (고정)\n"
    "대화는 반드시 아래 문장으로 시작합니다. 이 문장만 말하고 사용자의 응답을 기다리세요.\n"
    f"「{NEW_FIRST_LINE}」\n"
    "※ 이 문장은 고정 대사입니다. 아래의 어떤 규칙보다 우선하며 한 글자도 바꾸지 마세요.\n"
    "※ 두 번째 문장부터는 사용자의 응답을 듣고 나서 말합니다.\n"
    "※ 사용자가 무슨 일인지 물으면 그때 사정을 설명하세요: "
    f"「{OLD_FIRST_LINE}」"
)

PROMPT_FIX_NOTE = (
    "v60.2(2026-09-15) 첫 대사를 짧게 고친 것에 맞춰 프롬프트 동기화 — "
    "고정 대사를 새 문장으로 바꾸고, 이사·업체 사정은 사용자가 무슨 일인지 "
    "물으면 그때 밝히도록 대화 흐름과 첫 대사 규칙을 고침(미션·예시·목표문법은 "
    "그대로 유효해 손대지 않음)"
)

GRAMMAR_LABEL_FIXES = [
    ("ㅎ동사", "ㅎ불규칙"),
    ("ㅎ형용사", "ㅎ불규칙"),
    ("ㅂ동사", "ㅂ불규칙"),
    ("ㅂ형용사", "ㅂ불규칙"),
]
GRAMMAR_FIX_NOTE = (
    "v60.3(2026-09-15) 해설 표기 통일 — 'ㅎ동사/ㅎ형용사'·'ㅂ동사/ㅂ형용사'는 "
    "품사 구분과 상관없이 같은 불규칙 활용이라 'ㅎ불규칙'·'ㅂ불규칙'으로 통일"
)


def append_note(cell, note):
    old = cell.value
    cell.value = f"{old} / {note}" if old else note


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="실제로 원장에 쓴다(기본은 확인만)")
    args = ap.parse_args()

    wb = openpyxl.load_workbook(LEDGER)

    # v60.2 — MC-7-04-001 프롬프트 동기화
    ws = wb["n7_mission_chat"]
    header = [c.value for c in ws[1]]
    col = {h: i + 1 for i, h in enumerate(header)}
    mc_touched = 0
    for row in ws.iter_rows(min_row=2):
        item_id = row[col["item_id"] - 1].value
        if item_id != "MC-7-04-001":
            continue
        prompt_cell = row[col["ai_persona_prompt"] - 1]
        prompt = prompt_cell.value
        assert OLD_FIRST_LINE_BLOCK in prompt, "첫 대사 블록을 못 찾았다 — 원문이 바뀐 것 같다"
        assert OLD_FLOW in prompt, "대화의 흐름 문장을 못 찾았다 — 원문이 바뀐 것 같다"
        new_prompt = prompt.replace(OLD_FIRST_LINE_BLOCK, NEW_FIRST_LINE_BLOCK)
        new_prompt = new_prompt.replace(OLD_FLOW, NEW_FLOW)
        print(f"[mission_chat] {item_id} 프롬프트 갱신 (미리보기 --write 없이는 안 씀)")
        if args.write:
            prompt_cell.value = new_prompt
            append_note(row[col["change_note"] - 1], PROMPT_FIX_NOTE)
        mc_touched += 1
    assert mc_touched == 1, f"MC-7-04-001 을 정확히 한 번 고쳐야 하는데 {mc_touched}번 걸렸다"

    # v60.3 — n4_blank_question 해설 표기 통일
    ws2 = wb["n4_blank_question"]
    header2 = [c.value for c in ws2[1]]
    col2 = {h: i + 1 for i, h in enumerate(header2)}
    gf_touched = 0
    for row in ws2.iter_rows(min_row=2):
        gf_cell = row[col2["grammar_focus_수정"] - 1]
        val = gf_cell.value
        if not isinstance(val, str):
            continue
        if not any(k in val for k in ("ㅎ동사", "ㅎ형용사", "ㅂ동사", "ㅂ형용사")):
            continue
        new_val = val
        for old, new in GRAMMAR_LABEL_FIXES:
            new_val = new_val.replace(old, new)
        item_id = row[col2["item_id"] - 1].value
        print(f"[blank_question] {item_id}  {val!r}  ->  {new_val!r}")
        if args.write:
            gf_cell.value = new_val
            append_note(row[col2["change_note"] - 1], GRAMMAR_FIX_NOTE)
        gf_touched += 1
    print(f"\n합계 — mission_chat 프롬프트 {mc_touched}건 · blank_question 해설 {gf_touched}건")

    if not args.write:
        print("\n--dry(기본값)라 원장을 쓰지 않았다. --write 로 실제 반영해라.")
        return

    backup = LEDGER.with_name(
        LEDGER.stem + f".backup-{datetime.now():%Y%m%d-%H%M%S}.xlsx"
    )
    shutil.copy2(LEDGER, backup)
    wb.save(LEDGER)
    print(f"\n저장했다. 백업 — {backup.name}")


if __name__ == "__main__":
    main()
