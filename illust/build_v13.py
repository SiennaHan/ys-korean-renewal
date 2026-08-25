#!/usr/bin/env python3
"""문법 문항(n4) 점검에서 나온 실제 버그를 고쳐 v13을 만든다.

answer_index 누락 2건 — GF-2-1-003 / GF-2-1-004.
  answer가 '-입니까?'(물음표 포함)인데 보기는 '-입니까'라 문자열이 안 맞아
  answer_index가 비어 있었다. 앱에서 정답 판정이 되지 않는다.
  보기 문자열을 기준으로 index를 채우고 answer/answer_text도 보기에 맞춘다.

completion이 문제와 다른 4건은 hold_reason으로 표기만 한다. 문제 화면과
정답 화면의 문장이 달라 보이는 정도라 판단이 필요하다.

산출: 글로벌_교재기반_콘텐츠_v13.xlsx
"""
import shutil, re, unicodedata, openpyxl

ROOT = "/Users/soohyeon/Documents/2608-yonsei_renewal"
SRC, DST = f"{ROOT}/글로벌_교재기반_콘텐츠_v12.xlsx", f"{ROOT}/글로벌_교재기반_콘텐츠_v13.xlsx"
FIX_INDEX = {"GF-2-1-003", "GF-2-1-004"}
HOLD = {
    "GF-2-11-006": "completion이 문제와 다른 문장 — 문제의 앞 절이 빠지고 어순도 다름",
    "GF-2-12-009": "completion이 문제와 다른 문장 — 앞 절 생략",
    "GF-2-14-002": "completion이 문제와 다른 문장 — '제니 씨' → '제니 씨는' 조사 추가",
    "GF-2-15-008": "completion이 문제와 다른 문장 — 주어 '저는'이 completion에만 있음",
}


def norm(s):
    return re.sub(r"[\s?.]", "", unicodedata.normalize("NFC", str(s or "")))


def col(ws, n):
    for i, c in enumerate(ws[1], 1):
        if c.value == n:
            return i


shutil.copyfile(SRC, DST)
wb = openpyxl.load_workbook(DST)
ws = wb["n4_blank_question"]
C = {n: col(ws, n) for n in ("item_id", "answer", "answer_text", "answer_index",
                             "selection1", "selection2", "selection3", "selection4",
                             "review_status", "change_note", "hold_reason")}
log = []
for row in range(2, ws.max_row + 1):
    iid = ws.cell(row, C["item_id"]).value
    if iid in FIX_INDEX:
        sels = [ws.cell(row, C[f"selection{i}"]).value for i in range(1, 5)]
        live = [s for s in sels if s]
        ans = ws.cell(row, C["answer"]).value
        idx = next((i for i, s in enumerate(live) if norm(s) == norm(ans)), None)
        if idx is None:
            log.append(["실패", iid, str(ans), "", "보기에서 정답을 못 찾음"])
            continue
        ws.cell(row, C["answer_index"]).value = idx
        ws.cell(row, C["answer"]).value = live[idx]
        ws.cell(row, C["answer_text"]).value = live[idx]
        ws.cell(row, C["review_status"]).value = "reviewed"
        ws.cell(row, C["change_note"]).value = (
            f"answer_index 누락 보정 → {idx}. answer의 물음표를 떼어 보기와 맞춤")
        log.append(["answer_index 보정", iid, str(ans), f"index={idx}, {live[idx]}", ""])
    elif iid in HOLD:
        ws.cell(row, C["hold_reason"]).value = HOLD[iid]
        ws.cell(row, C["review_status"]).value = "draft"
        log.append(["보류 표기", iid, "", "", HOLD[iid]])

name = "99_변경내역_v13"
if name in wb.sheetnames:
    del wb[name]
sh = wb.create_sheet(name)
sh.append(["구분", "item_id", "구값", "신값", "비고"])
sh.append(["", "", "", "", ""])
sh.append(["범위", "n4 문법 문항 점검 결과 반영", "", "",
           "836문항 중 실제 결함 2건(정답 판정 불가) + 확인 필요 4건"])
sh.append(["점검 통과", "이형태 규칙 49문항", "", "", "받침 유무 규칙 위반 0건"])
sh.append(["점검 통과", "중복 문항", "", "", "같은 문제+정답 반복 0쌍"])
sh.append(["", "", "", "", ""])
for r in log:
    sh.append(r)
for i, w in enumerate((16, 16, 22, 34, 56), 1):
    sh.column_dimensions[chr(64 + i)].width = w
wb.save(DST)
for r in log:
    print(f"  [{r[0]}] {r[1]}  {r[3] or r[4]}")
print(f"-> {DST}")
