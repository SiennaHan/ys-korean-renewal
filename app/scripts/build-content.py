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
    # 자모 529행. 내용은 problem.ts 를 옮긴 것이라 화면이 보는 것이 안 바뀐다 —
    # 배관만 원장 쪽으로 돌린다. BLOCKERS.md §2
    "n8_jamo": "n8_jamo.json",
    # 117행 · 검수 완료(v29). ai_gender·ai_role·user_role 은 컬럼을 늘리지 않고
    # ai_persona_prompt 본문에서 뽑는다(파생 가능한 것은 옆에 안 둔다는 원칙) —
    # DERIVE_FROM_PROMPT 참고.
    "n7_mission_chat": "n7_mission_chat.json",
}

# ai_persona_prompt 본문에 박혀 있는 것을 정규식으로 뽑아 JSON 에 얹는다.
# 컬럼을 늘리지 않되, 화면이 바로 쓸 수 있게 한다(n3 의 voice CARRY_OVER 와 같은 결).
DERIVE_FROM_PROMPT = {
    "ai_gender": r"\*\*AI Gender:\*\*\s*(\w+)",
    "ai_role": r"\*\*Role:\*\*\s*([^\n-]+?)\s*-\s*\*\*AI Gender",
    "user_role": r"\*\*User Role:\*\*\s*([^\n]+?)\s*-\s*\*\*Situation",
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


# ── 검수 상태 ────────────────────────────────────────────────────────────────
#
# **G1 은 "reviewed 만 학생에게 낸다" 로 정했는데 그대로는 성립하지 않는다.**
# 원장을 세어 보면 `reviewed` 가 거의 없다 — 미션 대화 117행은 **0개**이고
# (전부 `fixed_v29`), 자모 529행도 0개다. 그대로 걸면 **이미 배선까지 끝난 화면이
# 통째로 빈다.** 실제 상태 값이 두 갈래가 아니라 여럿이기 때문이다:
#
#   auto_checked · draft · reviewed · deleted
#   fixed_v14~v29 · authored_v21/v23 · tagged_v20 · filled_v19 · added_v17
#
# 그래서 **내보내지 않을 것만 정한다**(기획 확정 2026-08-28 — "예외 상태를 둔다").
# 나머지는 낸다. 저작이 진행 중인 것을 학생이 보는 것과, 지운 것을 학생이 보는 것은
# 무게가 다르다 — 뒤쪽만 막는다.
DROP_STATUS = {"deleted"}

# 위 목록에 없는 값이 나오면 **조용히 내보내지 않고 알린다.** 새 상태가 생겼는데
# 아무도 모르는 채 학생에게 가는 것이 지금까지의 문제였다.
KNOWN_STATUS = {
    "auto_checked", "draft", "reviewed", "deleted",
    "tagged_v20", "filled_v19", "added_v17", "authored_v21", "authored_v23",
} | {f"fixed_v{n}" for n in range(10, 40)}

# **이전한 콘텐츠의 예외.** 자모 529행은 전부 `draft` 인데 저작 전이라는 뜻이 아니다 —
# 구 앱 `problem.ts` 를 **그대로 옮긴 것**이고 화면이 보는 값이 바뀌지 않았다
# (BLOCKERS.md §2). 검수로 남은 것은 받침·겹받침 낱자 목록뿐이다.
# 여기 이름으로 적어 두는 이유는, 나중에 "draft 는 다 막자" 가 나왔을 때
# **이 시트가 왜 다른지**를 그 자리에서 알 수 있게 하기 위해서다.
PORTED_AS_IS = {
    "n8_jamo": "구 앱 problem.ts 를 그대로 이전(2026-08-24). draft 는 '저작 전'이 아니다",
}


def drop_unshippable(sheet, rows):
    """내보내지 않을 행을 걸러 낸다. (남은 행, 뺀 수, 처음 보는 상태) 를 준다."""
    if not rows or "review_status" not in rows[0]:
        return rows, 0, set()
    kept, dropped, unknown = [], 0, set()
    for r in rows:
        st = str(r.get("review_status") or "").strip()
        if st and st not in KNOWN_STATUS:
            unknown.add(st)
        if st in DROP_STATUS:
            dropped += 1
            continue
        kept.append(r)
    return kept, dropped, unknown


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


def derive_from_prompt(sheet, rows):
    """ai_persona_prompt 본문에서 ai_gender·ai_role·user_role 을 뽑아 얹는다.

    n7_mission_chat 전용. 컬럼을 늘리지 않기로 한 결정(v27) 때문에 이 셋은
    프롬프트 텍스트 안에만 있다 — 화면이 매번 정규식을 돌리게 두지 않고
    생성 시점에 한 번 뽑아 둔다. 117행 전량 매치 확인됨(2026-08-24).
    """
    if sheet != "n7_mission_chat":
        return
    for r in rows:
        p = str(r.get("ai_persona_prompt", ""))
        for key, pat in DERIVE_FROM_PROMPT.items():
            m = re.search(pat, p)
            r[key] = m.group(1).strip() if m else ""


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
    warnings_status: list[tuple[str, list[str]]] = []
    dropped_total = 0
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
        rows, dropped, unknown = drop_unshippable(sheet, rows)
        if unknown:
            warnings_status.append((sheet, sorted(unknown)))
        derive_from_prompt(sheet, rows)
        rows = coerce(rows, int_columns(rows, prev))
        derived = carry(sheet, rows, prev)

        text = json.dumps(rows, ensure_ascii=False, indent="\t") + "\n"
        before = len(prev) if prev else 0
        delta = f"{before} → {len(rows)}" if before != len(rows) else f"{len(rows)}"
        new_cols = [k for k in rows[0] if not prev or k not in prev[0]]
        dropped_total += dropped
        note = f" · 뺀 행 {dropped}" if dropped else ""
        note += f" · 새 열 {len(new_cols)}" if new_cols else ""
        note += f" · voice 추정 {derived}" if derived else ""
        same = path.exists() and path.read_text(encoding="utf-8") == text
        mark = "같음" if same else ("쓸 것" if args.check else "썼음")
        if not args.check and not same:
            path.write_text(text, encoding="utf-8")
        print(f"  {sheet:<26}{delta:>14}행  {mark}{note}")

        # 엑셀이 여는 따옴표를 먹었을 수 있다 — 위 odd_quotes 주석 참조
        for line, key, val in odd_quotes(sheet, rows):
            warnings.append((sheet, line, key, val))

    if dropped_total:
        print(f"\n원장에서 지운 행 {dropped_total}개를 내보내지 않았다 (review_status = deleted)")
    if warnings_status:
        print("\n⚠️  처음 보는 review_status — 내보내기는 했지만 규칙에 없다")
        print("    scripts/build-content.py 의 KNOWN_STATUS 에 넣거나, 막을 것이면 DROP_STATUS 로.")
        for sheet, vals in warnings_status:
            print(f"    {sheet}: {', '.join(vals)}")
    if warnings:
        print(f"\n⚠️  따옴표가 홀수인 한글 칸 {len(warnings)}개 — 엑셀이 여는 \' 를 먹었을 수 있다")
        print("    셀 맨 앞의 \' 는 서식 지시로 읽혀 값에서 사라진다. 원장에서 되돌려라.")
        for sheet, line, key, val in warnings[:10]:
            print(f"    {sheet} {line}행 {key}: {val[:56]}")
        if len(warnings) > 10:
            print(f"    … 그 밖에 {len(warnings) - 10}개")

    # n7_mission_chat·n8_jamo 둘 다 배선됐다(2026-08-24) — 이 안내는 더 필요 없다.
    # 새로 원장에 시트가 생기고 아직 안 쓴다면 여기에 같은 모양으로 다시 둔다.


if __name__ == "__main__":
    main()
