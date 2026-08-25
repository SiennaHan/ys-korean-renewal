#!/usr/bin/env python3
"""3급 12과 그림 퀴즈 정답 표기 오류 2건을 고쳐 v11을 만든다.

교재 변경이 아니라 원본 데이터(v71)부터 있던 오류다. 그림에 붙은 라벨은
'마트'·'재래시장'인데 퀴즈 정답은 '슈퍼마켓'·'시장'으로 적혀 있었다.
특히 '마트' 그림은 건물 간판에 '마트'라고 쓰여 있어 '슈퍼마켓'은 명백한 오답이다.

보기와 충돌하지 않는지 확인했다.
  WQ-3-12-001 보기(휴가·호선·경기장) 중 '재래시장'과 겹치는 것 없음
  WQ-3-12-002 보기(백화점·노선도·편의점) 중 '마트'와 겹치는 것 없음

산출: 글로벌_교재기반_콘텐츠_v11.xlsx
"""
import shutil, openpyxl

ROOT = "/Users/soohyeon/Documents/2608-yonsei_renewal"
SRC, DST = f"{ROOT}/글로벌_교재기반_콘텐츠_v10.xlsx", f"{ROOT}/글로벌_교재기반_콘텐츠_v11.xlsx"
FIX = {"WQ-3-12-001": ("시장", "재래시장", "그림 라벨은 '재래시장' — 원장 표제어에 맞춤"),
       "WQ-3-12-002": ("슈퍼마켓", "마트", "그림 간판에 '마트'라고 인쇄됨 — 명백한 정답 오기")}


def col(ws, n):
    for i, c in enumerate(ws[1], 1):
        if c.value == n:
            return i


shutil.copyfile(SRC, DST)
wb = openpyxl.load_workbook(DST)
ws = wb["n1_word_quiz"]
C = {n: col(ws, n) for n in ("item_id", "answer_index", "selection1", "selection2",
                             "selection3", "selection4", "review_status", "change_note")}
log = []
for row in range(2, ws.max_row + 1):
    iid = ws.cell(row, C["item_id"]).value
    if iid not in FIX:
        continue
    old, new, why = FIX[iid]
    ai = int(ws.cell(row, C["answer_index"]).value)
    cell = ws.cell(row, C[f"selection{ai + 1}"])
    if str(cell.value) != old:
        log.append(["실패", iid, str(cell.value), new, "정답 칸 값이 예상과 다름"])
        continue
    cell.value = new
    ws.cell(row, C["review_status"]).value = "reviewed"
    ws.cell(row, C["change_note"]).value = f"정답 표기 교정 {old}→{new} — {why}"
    log.append(["정답 교정", iid, old, new, why])

name = "99_변경내역_v11"
if name in wb.sheetnames:
    del wb[name]
sh = wb.create_sheet(name)
sh.append(["구분", "item_id", "구값", "신값", "비고"])
sh.append(["", "", "", "", ""])
sh.append(["범위", "그림 퀴즈 정답 표기 오류", "", "", "v71부터 있던 오류. 교재 변경 아님"])
sh.append(["", "", "", "", ""])
for r in log:
    sh.append(r)
for i, w in enumerate((14, 16, 20, 20, 54), 1):
    sh.column_dimensions[chr(64 + i)].width = w
wb.save(DST)
for r in log:
    print(f"  [{r[0]}] {r[1]}  {r[2]} → {r[3]}")
print(f"-> {DST}")
