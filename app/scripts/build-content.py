#!/usr/bin/env python3
"""교재 콘텐츠 원장(xlsx) → 앱 데이터(JSON).

원장이 정본이다. 앱 JSON 은 산출물이므로 손으로 고치지 않는다 —
고치면 다음 생성에서 지워진다. 고칠 것은 xlsx 쪽이다.

    python3 scripts/build-content.py            # 저장소 루트의 최신 v*.xlsx
    python3 scripts/build-content.py --check    # 쓰지 않고 무엇이 달라지는지만

원장은 교재 파생이라 저장소에 없다(.gitignore *.xlsx). 이 스크립트를 돌리려면
원장 파일이 저장소 루트에 있어야 한다.
"""

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = Path(__file__).resolve().parents[1] / "src" / "shared" / "data"

# 시트 이름이 곧 파일 이름이다. 지금 화면이 읽는 9종
CONTENT_SHEETS = [
    "n1_word_list",
    "n1_word_quiz",
    "n2_ai_role_play",
    "n3_listen_script",
    "n3_listen_script_line",
    "n3_listen_repeat",
    "n4_blank_question",
    "n5_read_answer_text",
    "n5_read_answer_questions",
]

# 원장에는 있는데 앱이 아직 안 쓰던 것. 파일 이름을 따로 준다
EXTRA_SHEETS = {
    "n6_flashcard": "n6_flashcard.json",
    "n6_flashcard_card": "n6_flashcard_card.json",
    "문법목록": "grammar_list.json",
}

# 컬럼 이름을 JSON 키로 쓸 수 없는 것만 바꾼다
KEY_FIX = {"grammar_tag(대표형)": "grammar_tag", "급": "level", "분류": "category",
           "도입_과": "intro_chapter", "문항수": "item_count",
           "grammar_focus_수정": "grammar_focus_revised", "오류메모": "error_note"}

# 원장에 없고 앱에만 있던 열. id 로 이어 붙인다
CARRY_OVER = {"n3_listen_script_line": ["voice"]}


LEDGER_RE = re.compile(r"^글로벌_교재기반_콘텐츠_v(\d+)\.xlsx$")


def newest_ledger() -> Path:
    """가장 높은 v 번호를 고른다.

    한글 이름으로 glob 하지 않는다 — macOS 는 파일마다 유니코드 정규화 형태가
    달라질 수 있어서, 한 형태로 짠 패턴이 멀쩡히 있는 파일을 조용히 건너뛴다.
    실제로 v23 을 놓치고 v22 를 정본으로 삼은 적이 있다. 이름을 NFC 로 맞춘 뒤 비교한다.
    """
    found = []
    for p in ROOT.glob("*.xlsx"):
        m = LEDGER_RE.match(unicodedata.normalize("NFC", p.name))
        if m:
            found.append((int(m.group(1)), p))
    if not found:
        sys.exit(f"원장을 찾지 못했다: {ROOT}/글로벌_교재기반_콘텐츠_v*.xlsx")
    return max(found)[1]


def cell(v):
    """빈 칸은 빈 문자열. 정수로 떨어지는 실수는 정수로 (엑셀이 1 을 1.0 으로 준다)"""
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        return int(v)
    if isinstance(v, str):
        return v.strip()
    return v


def read_sheet(ws):
    it = ws.iter_rows(values_only=True)
    head = [KEY_FIX.get(str(h).strip(), str(h).strip()) if h is not None else "" for h in next(it)]
    rows = []
    for r in it:
        if not any(x is not None and str(x).strip() for x in r):
            continue  # 원장 끝의 빈 줄
        rows.append({k: cell(v) for k, v in zip(head, r) if k})
    return head, rows


def int_columns(rows, prev):
    """어느 열을 숫자로 둘지. 이미 있던 JSON 이 정본이고, 새 열은 값으로 정한다"""
    cols = set()
    for key in rows[0]:
        if prev and key in prev[0]:
            if isinstance(prev[0][key], int):
                cols.add(key)
            continue
        vals = [r[key] for r in rows if r[key] != ""]
        if vals and all(isinstance(v, int) for v in vals):
            cols.add(key)
    return cols


def coerce(rows, int_cols):
    for r in rows:
        for k, v in r.items():
            if k in int_cols:
                r[k] = v if isinstance(v, int) else (int(v) if str(v).strip().lstrip("-").isdigit() else 0)
            elif not isinstance(v, str):
                r[k] = str(v)
    return rows


def carry(sheet, rows, prev):
    """원장에 없는 앱 전용 열을 id 로 이어 붙인다"""
    keys = CARRY_OVER.get(sheet)
    if not keys or not prev:
        return 0
    old = {r.get("id"): r for r in prev}
    derived = 0
    for r in rows:
        src = old.get(r.get("id"))
        for k in keys:
            if src and src.get(k) not in (None, ""):
                r[k] = src[k]
            else:
                # 새로 생긴 행 — 성별에서 뽑는다
                r[k] = "male" if str(r.get("gender", "")).strip() == "남" else "female"
                derived += 1
    return derived


def odd_quotes(sheet, rows):
    """따옴표가 홀수인 한글 칸을 찾는다.

    엑셀은 셀 맨 앞의 ' 를 "이건 텍스트다" 라는 서식 지시로 읽고 값에서 지운다.
    그래서 저작자가 '연필'은 … 이라고 써도 연필'은 … 으로 저장된다.
    실제로 n4_blank_question 의 해설 61개가 그 상태였다(2026-08-21 복원).

    엑셀에서 그 칸을 다시 타이핑하면 또 먹히므로 생성할 때마다 본다.
    영어 아포스트로피(I'm · o'clock · one's)는 정상이라, 한글이 절반을 넘는
    칸만 센다.
    """
    out = []
    for i, row in enumerate(rows, start=2):
        for key, val in row.items():
            if not isinstance(val, str) or val.count("'") % 2 == 0:
                continue
            hangul = sum(1 for ch in val if "가" <= ch <= "힣")
            letters = sum(1 for ch in val if ch.isalpha())
            if letters and hangul / letters > 0.5:
                out.append((i, key, val))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--xlsx", type=Path, default=None)
    ap.add_argument("--check", action="store_true", help="쓰지 않고 차이만 본다")
    args = ap.parse_args()

    ledger = args.xlsx or newest_ledger()
    print(f"원장  {ledger.name}")
    print(f"대상  {OUT_DIR.relative_to(ROOT)}\n")
    wb = openpyxl.load_workbook(ledger, read_only=True, data_only=True)

    warnings: list[tuple[str, int, str, str]] = []
    plan = [(s, f"{s}.json") for s in CONTENT_SHEETS] + list(EXTRA_SHEETS.items())
    for sheet, filename in plan:
        if sheet not in wb.sheetnames:
            print(f"  {sheet:<26} 원장에 없다 — 건너뜀")
            continue
        head, rows = read_sheet(wb[sheet])
        if not rows:
            print(f"  {sheet:<26} 내용이 비었다 — 건너뜀")
            continue

        path = OUT_DIR / filename
        prev = json.loads(path.read_text(encoding="utf-8")) if path.exists() else None
        rows = coerce(rows, int_columns(rows, prev))
        derived = carry(sheet, rows, prev)

        text = json.dumps(rows, ensure_ascii=False, indent="\t") + "\n"
        before = len(prev) if prev else 0
        delta = f"{before} → {len(rows)}" if before != len(rows) else f"{len(rows)}"
        new_cols = [k for k in rows[0] if not prev or k not in prev[0]]
        note = f" · 새 열 {len(new_cols)}" if new_cols else ""
        note += f" · voice 추정 {derived}" if derived else ""
        same = path.exists() and path.read_text(encoding="utf-8") == text
        mark = "같음" if same else ("쓸 것" if args.check else "썼음")
        if not args.check and not same:
            path.write_text(text, encoding="utf-8")
        print(f"  {sheet:<26}{delta:>14}행  {mark}{note}")

        # 엑셀이 여는 따옴표를 먹었을 수 있다 — 위 odd_quotes 주석 참조
        for line, key, val in odd_quotes(sheet, rows):
            warnings.append((sheet, line, key, val))

    if warnings:
        print(f"\n⚠️  따옴표가 홀수인 한글 칸 {len(warnings)}개 — 엑셀이 여는 \' 를 먹었을 수 있다")
        print("    셀 맨 앞의 \' 는 서식 지시로 읽혀 값에서 사라진다. 원장에서 되돌려라.")
        for sheet, line, key, val in warnings[:10]:
            print(f"    {sheet} {line}행 {key}: {val[:56]}")
        if len(warnings) > 10:
            print(f"    … 그 밖에 {len(warnings) - 10}개")

    print("\n앱이 아직 쓰지 않는 것:")
    for s in ["n7_mission_chat", "n8_jamo"]:
        ws = wb[s]
        n = sum(1 for r in ws.iter_rows(min_row=2, values_only=True)
                if any(x is not None and str(x).strip() for x in r))
        print(f"  {s:<26}{n:>5}행 — 원장에도 예시뿐이라 만들 것이 없다")


if __name__ == "__main__":
    main()
