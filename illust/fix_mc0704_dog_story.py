#!/usr/bin/env python3
"""v60.5 — MC-7-04-001 스토리를 '이사 도움 요청'에서 '강아지 하루 돌봄 부탁'으로
바꾼다.

기획자 피드백(2026-09-15): "친구한테 연락해서 대뜸 짐 날라달라고 하는 건 너무
예의없고 이상하다." 짐 옮기기(육체노동) 부탁은 실제로도 꽤 무례하게 들릴 수
있는 부탁이라, 더 자연스럽고 흔한 부탁인 '급한 사정이 생겨 하루만 반려견을
봐 달라'로 바꾼다.

바뀌는 자리는 ai_persona_prompt 안 셋뿐이다 — mission_detail·situation_*·
목표 문법은 이미 완전히 일반적인 문구라 이사 이야기를 전혀 언급하지 않았고,
그대로 다른 부탁 상황에도 맞는다(v60.2 에서 이미 확인함).
    1. "당신은 이런 사람입니다" · "대화의 흐름" (상황 절)
    2. "# 첫 대사 (고정)" — v60.2 에서 넣은 "사용자가 물으면 그때 밝힌다"
       지연 공개 장치를 걷는다. 강아지 부탁은 짐 나르기 부탁과 달리 그 자체로
       예의 바른 요청이라, 첫 마디에 사정과 부탁을 한 번에 말해도 어색하지
       않다.
    3. 미션 1·2·3의 "사용자가 할 법한 말(예시)" — 새 스토리에 맞는 예문으로.
       "아직 안 나왔을 때 당신이 할 말" 쪽은 이미 일반적이라 그대로 둔다.
content_img(C94.jpg)는 전화 통화 중 놀라는/곤란해하는 두 사람 그림이라 특정
소품(이사 상자 등)이 없어 그대로 써도 된다 — 확인 완료.

돌리기
    python3 illust/fix_mc0704_dog_story.py            # 확인만
    python3 illust/fix_mc0704_dog_story.py --write     # 실제 반영
"""
from __future__ import annotations

import argparse
import shutil
from datetime import datetime
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
LEDGER = ROOT / "글로벌_교재기반_콘텐츠_v60.xlsx"

OLD_BIO = (
    "이사 전날에 업체가 못 오게 되어 몹시 당황한 지인이다. 해요체로 급하게 "
    "사정을 설명하며 도움을 청하고, 거절을 들으면 아쉬워하면서도 이해해 준다."
)
NEW_BIO = (
    "갑자기 급한 일이 생겨서 반려견을 하루 맡길 곳이 필요해진 지인이다. "
    "해요체로 미안해하며 사정을 설명하고 도움을 청하며, 거절을 들으면 "
    "아쉬워하면서도 이해해 준다."
)

OLD_FLOW = (
    "AI는 내일 바쁜지 물으며 급히 도움이 필요하다고만 말한다 — 이 시점에는 "
    "무슨 일인지 밝히지 않는다. 사용자가 무슨 일이냐고 물으면 그제서야 내일 "
    "이사를 하는데 이사 업체 기사님이 다쳐서 갑자기 못 오게 됐다고 사정을 "
    "설명하며 내일 와서 도와줄 수 있는지 묻는다. 사용자는 그 소식에 놀라고, "
    "상대의 사정에 공감한 뒤, 자신도 도저히 갈 수 없는 이유를 들어 정중하게 "
    "거절한다. 대화는 처음부터 끝까지 존댓말로 이어진다."
)
NEW_FLOW = (
    "AI는 갑자기 급한 일이 생겼다며 내일 하루만 반려견을 봐 줄 수 있는지 "
    "묻는다. 사용자는 그 부탁에 놀라고, 상대의 사정에 공감한 뒤, 자신도 "
    "도저히 봐 줄 수 없는 이유를 들어 정중하게 거절한다. 대화는 처음부터 "
    "끝까지 존댓말로 이어진다."
)

OLD_FIRST_LINE_BLOCK = (
    "# 첫 대사 (고정)\n"
    "대화는 반드시 아래 문장으로 시작합니다. 이 문장만 말하고 사용자의 응답을 기다리세요.\n"
    "「내일 바쁘세요? 급히 도움이 필요해서요.」\n"
    "※ 이 문장은 고정 대사입니다. 아래의 어떤 규칙보다 우선하며 한 글자도 바꾸지 마세요.\n"
    "※ 두 번째 문장부터는 사용자의 응답을 듣고 나서 말합니다.\n"
    "※ 사용자가 무슨 일인지 물으면 그때 사정을 설명하세요: "
    "「내일 이사인데, 이사 업체 기사님이 다쳐서 갑자기 못 오신대요. "
    "혹시 내일 와서 좀 도와주실 수 있어요?」"
)
NEW_FIRST_LINE = (
    "미안한데 제가 갑자기 급한 일이 생겨서 그런데, 혹시 내일 하루만 저희 "
    "강아지 좀 봐주실 수 있어요?"
)
NEW_FIRST_LINE_BLOCK = (
    "# 첫 대사 (고정)\n"
    "대화는 반드시 아래 문장으로 시작합니다. 이 문장만 말하고 사용자의 응답을 기다리세요.\n"
    f"「{NEW_FIRST_LINE}」\n"
    "※ 이 문장은 고정 대사입니다. 아래의 어떤 규칙보다 우선하며 한 글자도 바꾸지 마세요.\n"
    "※ 두 번째 문장부터는 사용자의 응답을 듣고 나서 말합니다."
)

MISSION_EXAMPLE_FIXES = [
    (
        "「이사 하루 전에 업체가 못 온다니 이게 무슨 일이에요?」",
        "「갑자기 강아지를 봐 달라니, 무슨 급한 일 있으신 거예요?」",
    ),
    (
        "「혼자서 그 많은 짐을 옮길 생각을 하면 얼마나 막막하시겠어요.」",
        "「갑자기 그렇게 되셨다니 얼마나 당황스러우세요.」",
    ),
    (
        "「저도 하필 내일 오전에 발표가 있어서 도저히 갈 수가 있어야지요.」",
        "「저도 마침 내일부터 이틀 동안 출장을 가야 해서 봐 드릴 수가 있어야지요.」",
    ),
]

CHANGE_NOTE = (
    "v60.5(2026-09-15) 기획자 피드백 — 짐 나르기 부탁은 대뜸 하기엔 무례하게 "
    "들릴 수 있어, 더 자연스러운 부탁인 '급한 사정으로 하루만 반려견 돌봄"
    "부탁'으로 스토리 교체. mission_detail·situation_*·목표 문법은 이미 "
    "일반적인 문구라 손대지 않음. v60.2 의 첫 대사 지연 공개 장치는 걷음 — "
    "강아지 부탁은 그 자체로 예의 바른 요청이라 한 문장에 다 담아도 자연스러움"
)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()

    wb = openpyxl.load_workbook(LEDGER)
    ws = wb["n7_mission_chat"]
    header = [c.value for c in ws[1]]
    col = {h: i + 1 for i, h in enumerate(header)}

    touched = 0
    for row in ws.iter_rows(min_row=2):
        if row[col["item_id"] - 1].value != "MC-7-04-001":
            continue
        prompt_cell = row[col["ai_persona_prompt"] - 1]
        first_line_cell = row[col["ai_first_line"] - 1]
        prompt = prompt_cell.value

        assert OLD_BIO in prompt, "인물 소개 문장을 못 찾았다"
        assert OLD_FLOW in prompt, "대화의 흐름 문장을 못 찾았다"
        assert OLD_FIRST_LINE_BLOCK in prompt, "첫 대사 블록을 못 찾았다"

        new_prompt = prompt.replace(OLD_BIO, NEW_BIO)
        new_prompt = new_prompt.replace(OLD_FLOW, NEW_FLOW)
        new_prompt = new_prompt.replace(OLD_FIRST_LINE_BLOCK, NEW_FIRST_LINE_BLOCK)
        for old, new in MISSION_EXAMPLE_FIXES:
            assert old in new_prompt, f"미션 예시를 못 찾았다: {old!r}"
            new_prompt = new_prompt.replace(old, new)

        print("=== 새 첫 대사 ===")
        print(NEW_FIRST_LINE)
        print("\n=== 새 인물 소개 ===")
        print(NEW_BIO)
        print("\n=== 새 대화 흐름 ===")
        print(NEW_FLOW)

        if args.write:
            prompt_cell.value = new_prompt
            first_line_cell.value = NEW_FIRST_LINE
            cn_cell = row[col["change_note"] - 1]
            old_note = cn_cell.value
            cn_cell.value = f"{old_note} / {CHANGE_NOTE}" if old_note else CHANGE_NOTE
        touched += 1
    assert touched == 1, f"MC-7-04-001 을 정확히 한 번 고쳐야 하는데 {touched}번 걸렸다"

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
