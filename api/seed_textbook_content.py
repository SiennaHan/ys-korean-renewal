#!/usr/bin/env python3
"""교재 콘텐츠 JSON 13개를 DB 표 13개로 넣는다 — 그리고 같은지 대조한다.

    python3 api/seed_textbook_content.py           # 넣는다(upsert)
    python3 api/seed_textbook_content.py --check   # 안 넣고 다른 곳만 센다

**원장이 정본이라는 규칙은 그대로다.** 원장 → JSON 은 `app/scripts/build-content.py`
가 하고, 이 스크립트는 **그 산출을 DB 로 옮길 뿐**이다. 그래서 원장을 고치면
`build-content.py` 를 먼저 돌리고 이것을 돌린다.

**왜 원장이 아니라 JSON 을 읽나.** JSON 에는 원장에 없는 파생 열이 있다
(`voice` · `ai_gender` · `ai_role` · `user_role`). 원장을 다시 읽으면 그 변환을
두 벌 갖게 되고, 두 벌은 반드시 갈라진다.

## 열쇠는 `item_id`

13개 파일을 통틀어 전역 고유다(실측 · 충돌 0). 숫자 `id` 는 `n1_word_list` 에서
**124행이 0** 이라 열쇠가 못 된다 — 다만 `ko_learning_record.question_id` 가 그
값이라 `ledger_id` 로 같이 보관한다.

**`legacy_id` 라고 부르지 않는다.** `n6`·`n7`·`n8` 에는 이미 그 이름의 열이 있고
`'F1'`·`'Y3W1'` 같은 **문자열**이다(구 앱의 식별자). 같은 이름이 표마다 다른 뜻이
되면 안 된다 — 처음에 그렇게 붙였다가 `Incorrect integer value: 'F1'` 로 터졌다.

## 부모를 가리키는 열을 푼다

셋 중 **둘이 숫자 `id` 로 부모를 가리킨다**(`script_id` · `text_id`).
`set_item_id` 하나만 이미 `item_id` 다. 넣을 때 숫자를 부모의 `item_id` 로 풀어
`*_item_id` 에 같이 적는다 — 조인이 열쇠 위에서 돌게. **원본 숫자도 남긴다**
(앱이 아직 그것으로 묶는다).

## 지우지 않는다

원장에서 사라진 행은 **지우지 않고** `review_status='deleted'` 로 표시한다.
학습 기록이 그 문항을 가리키고 있을 수 있다.
"""
from __future__ import annotations

import argparse
import io
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "app" / "src" / "shared" / "data"

# (표, 파일, 부모(자식열, 부모표, 푼열))  — 부모가 없으면 None
TABLES: list[tuple[str, str, tuple[str, str, str | None] | None]] = [
    ("ko_word", "n1_word_list.json", None),
    ("ko_word_quiz", "n1_word_quiz.json", None),
    ("ko_roleplay_turn", "n2_ai_role_play.json", None),
    ("ko_listen_script", "n3_listen_script.json", None),
    ("ko_listen_script_line", "n3_listen_script_line.json",
     ("script_id", "n3_listen_script.json", "script_item_id")),
    ("ko_listen_question", "n3_listen_repeat.json",
     ("script_id", "n3_listen_script.json", "script_item_id")),
    ("ko_blank_question", "n4_blank_question.json", None),
    ("ko_read_text", "n5_read_answer_text.json", None),
    ("ko_read_question", "n5_read_answer_questions.json",
     ("text_id", "n5_read_answer_text.json", "text_item_id")),
    ("ko_flashcard_set", "n6_flashcard.json", None),
    ("ko_flashcard_card", "n6_flashcard_card.json",
     ("set_item_id", "n6_flashcard.json", None)),
    ("ko_mission_chat", "n7_mission_chat.json", None),
    # 힌트는 item_id 가 이미 부모(ko_mission_chat)의 열쇠라 부모 해석이 필요 없다
    ("ko_mission_hint", "n7_mission_hint.json", None),
    ("ko_jamo", "n8_jamo.json", None),
]

RENAME = {"chapter": "chapter_seq", "id": "ledger_id"}

# 그 표에서만 다르게 부르는 열. **RENAME 보다 먼저 본다.**
#
# 힌트 시트는 행 열쇠를 `hint_id`, 부모를 `item_id` 라 부른다. 그대로 넣으면 아래
# 「item_id 가 표를 가로질러 겹치면 멈춘다」에 걸린다 — 힌트의 `item_id` 는 일부러
# 부모(`MC-1-04-001`)와 같은 값이고 한 과에서 서넛이 나눠 쓰기 때문이다.
# **검사를 느슨하게 하는 대신 이름을 규약에 맞춘다** — 다른 자식 표들처럼
# 자기 `item_id` 를 갖고 부모는 `<부모>_item_id` 로 가리킨다.
RENAME_BY_TABLE = {
    "ko_mission_hint": {"hint_id": "item_id", "item_id": "chat_item_id"},
}


def load(name: str) -> list[dict]:
    d = json.load(io.open(DATA / name, encoding="utf-8"))
    return d if isinstance(d, list) else next(iter(d.values()))


def engine():
    """`api/.env` 를 읽어 프로젝트가 쓰는 엔진을 그대로 쓴다."""
    env = ROOT / "api" / ".env"
    if env.exists():
        for line in io.open(env, encoding="utf-8"):
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.strip().split("=", 1)
                os.environ.setdefault(k, v.strip())
    sys.path.insert(0, str(ROOT / "api"))
    from persistence.database import ENGINE  # noqa: E402
    return ENGINE


def build_rows(cols: dict[str, set[str]]) -> dict[str, list[dict]]:
    """파일을 읽어 표에 넣을 행을 만든다. **DB 없이도 돈다** — 그래서 대조가 싸다."""
    out: dict[str, list[dict]] = {}
    for table, fname, parent in TABLES:
        rows = load(fname)
        pmap: dict = {}
        if parent:
            ckey, pfile, resolved = parent
            prows = load(pfile)
            if resolved:                       # 숫자 id → 부모 item_id
                pmap = {p["id"]: p["item_id"] for p in prows if "id" in p}
            # 읽기 문항은 `chapter` 가 없다 — 부모 지문에서 가져온다
            chmap = {p.get("id", p.get("item_id")): p.get("chapter") for p in prows}
        made = []
        for r in rows:
            rec: dict = {}
            per_table = RENAME_BY_TABLE.get(table, {})
            for k, v in r.items():
                nm = per_table.get(k) or RENAME.get(k, k)
                if nm in cols[table]:
                    rec[nm] = v
            if parent:
                ckey, _pf, resolved = parent
                if resolved and resolved in cols[table]:
                    rec[resolved] = pmap.get(r.get(ckey))
                if "chapter_seq" not in rec or rec.get("chapter_seq") is None:
                    rec["chapter_seq"] = chmap.get(r.get(ckey))
            rec.setdefault("review_status", "")
            made.append(rec)
        out[table] = made
    return out


def table_columns(conn) -> dict[str, set[str]]:
    from sqlalchemy import text
    cols = {}
    for table, _f, _p in TABLES:
        rs = conn.execute(text(f"SHOW COLUMNS FROM {table}"))
        cols[table] = {r[0] for r in rs}
    return cols



# 그 행이 무엇인지 말해 주는 열. **번호가 밀렸는지 보려면 내용을 봐야 한다**
IDENTITY = {
    "ko_word": "word", "ko_word_quiz": "prompt", "ko_roleplay_turn": "ko",
    "ko_listen_script": "audio_text", "ko_listen_script_line": "text",
    "ko_listen_question": "question", "ko_blank_question": "question",
    "ko_read_text": "text", "ko_read_question": "question",
    "ko_flashcard_set": "set_title", "ko_flashcard_card": "word",
    "ko_mission_chat": "scenario_title", "ko_jamo": "target_word",
    "ko_mission_hint": "hint_ko",
}


def check_renumber(data: dict[str, list[dict]], eng) -> int:
    """**같은 `item_id` 가 딴 것을 가리키게 됐는지** 본다.

    원장의 `item_id` 는 `FCW-3-12-004` 처럼 **과 안의 자리 번호**다. 그래서
    가운데 행을 지우면 **그 뒤가 전부 한 칸씩 밀린다** — 2026-08-31 에 실제로 났다:
    3급 12과에서 「면허증」을 지우자 `FCW-3-12-004` 가 「자가용」에서 「중고차」가 됐다.

    `item_id` 로 upsert 하면 이것이 **조용히 덮어써진다.** 플래시카드는 채점을
    안 해서 손해가 없었지만, 채점하는 시트에서 같은 일이 나면
    `ko_learning_record.question_id` 와 `ko_review_queue` 가 **딴 문항을 가리킨다** —
    맞힌 기록이 다른 문항에 붙는다.

    **그렇다고 자동으로 막지는 않는다.** 문항을 다시 쓰는 것도 내용이 바뀌는 일이고
    (v48 의 「읽기 오답 다시 쓰기」가 그랬다), 그건 정상이다. 둘을 기계가 못 가른다.
    그래서 **세어서 보여 주고 사람이 정한다** — 과의 행 수가 줄었으면 밀림일 가능성이
    높으므로 그것도 같이 찍는다.
    """
    from sqlalchemy import text
    total = 0
    for table, rows in data.items():
        col = IDENTITY.get(table)
        if not col:
            continue
        with eng.connect() as c:
            try:
                have = {r[0]: r[1] for r in c.execute(
                    text(f"SELECT item_id, {col} FROM {table}"))}
                counts = {(r[0], r[1]): r[2] for r in c.execute(text(
                    f"SELECT book_id, chapter_seq, COUNT(*) FROM {table} "
                    f"GROUP BY book_id, chapter_seq"))}
            except Exception:
                return 0                      # 표가 아직 없다 — 첫 씨딩이다
        if not have:
            continue
        now_counts: dict[tuple, int] = {}
        for r in rows:
            k = (r.get("book_id"), r.get("chapter_seq"))
            now_counts[k] = now_counts.get(k, 0) + 1
        moved = [r for r in rows
                 if r["item_id"] in have
                 and str(r.get(col) or "") != str(have[r["item_id"]] or "")]
        if not moved:
            continue
        shrunk = {k for k, n in counts.items() if now_counts.get(k, 0) < n}
        hot = [r for r in moved if (r.get("book_id"), r.get("chapter_seq")) in shrunk]
        total += len(moved)
        print(f"\n!! {table}: 같은 item_id 가 딴 것을 가리킨다 — {len(moved)}개"
              + (f" (그중 {len(hot)}개는 **행이 줄어든 과**라 번호 밀림일 수 있다)" if hot else ""))
        for r in (hot or moved)[:6]:
            print(f"     {r['item_id']}  {str(have[r['item_id']])[:20]!r}"
                  f"  →  {str(r.get(col))[:20]!r}")
        if len(hot or moved) > 6:
            print(f"     … 외 {len(hot or moved) - 6}개")
    return total


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="넣지 않고 다른 곳만 센다")
    ap.add_argument("--force", action="store_true",
                    help="번호가 밀린 것 같아도 그대로 넣는다 — 살펴본 뒤에만")
    args = ap.parse_args()

    from sqlalchemy import bindparam, text
    eng = engine()
    with eng.connect() as c:
        cols = table_columns(c)
    data = build_rows(cols)

    # **item_id 가 표를 가로질러 겹치면 멈춘다.** 겹치면 열쇠 전제가 깨진 것이다
    seen: dict[str, str] = {}
    for table, rows in data.items():
        for r in rows:
            k = r.get("item_id")
            if not k:
                print(f"!! {table}: item_id 가 빈 행이 있다 — 멈춘다")
                return 2
            if k in seen:
                print(f"!! item_id 충돌: {k} 가 {seen[k]} 와 {table} 에 둘 다 있다")
                return 2
            seen[k] = table

    if not args.check:
        moved = check_renumber(data, eng)
        if moved and not args.force:
            print("\n넣지 않았다. 살펴본 뒤 정말 맞으면 --force 로 다시 돌려라.")
            return 2

    bad = 0
    for table, rows in data.items():
        keys = sorted(cols[table] - {"created_at", "updated_at"})
        if args.check:
            with eng.connect() as c:
                have = {r[0]: r for r in c.execute(
                    text(f"SELECT item_id, {', '.join(keys)} FROM {table}"))}
            miss = [r["item_id"] for r in rows if r["item_id"] not in have]
            # **원장에서 사라진 행은 남는 것이 정상이다** — 지우지 않고
            # `review_status='deleted'` 로 표시한다(위 머리말). 그래서 남은 행 중
            # 그 표시가 있는 것은 어긋남이 아니다. 처음엔 그것까지 세어 대조기가
            # 자기 설계를 모르고 울었다(2026-08-31).
            with eng.connect() as c:
                dead = {r[0] for r in c.execute(text(
                    f"SELECT item_id FROM {table} WHERE review_status='deleted'"))}
            extra = (set(have) - {r["item_id"] for r in rows}) - dead
            diff = 0
            for r in rows:
                got = have.get(r["item_id"])
                if not got:
                    continue
                for i, k in enumerate(keys, start=1):
                    a, b = r.get(k), got[i]
                    if a is None and (b is None or b == ""):
                        continue
                    if str(a if a is not None else "") != str(b if b is not None else ""):
                        diff += 1
            mark = "같다" if not (miss or extra or diff) else "다르다"
            print(f"  {table:<24} JSON {len(rows):>5} · DB {len(have):>5} ·"
                  f" 없는 행 {len(miss):>4} · 남은 행 {len(extra):>4} · 다른 칸 {diff:>5}  {mark}")
            bad += len(miss) + len(extra) + diff
            continue

        with eng.begin() as c:
            place = ", ".join(f":{k}" for k in keys)
            upd = ", ".join(f"{k}=VALUES({k})" for k in keys if k != "item_id")
            stmt = text(f"INSERT INTO {table} ({', '.join(keys)}) VALUES ({place}) "
                        f"ON DUPLICATE KEY UPDATE {upd}")
            for i in range(0, len(rows), 500):
                c.execute(stmt, [{k: r.get(k) for k in keys} for r in rows[i:i + 500]])
            # 원장에서 사라진 것 — 지우지 않고 표시만 한다
            ids = {r["item_id"] for r in rows}
            gone = [x[0] for x in c.execute(text(f"SELECT item_id FROM {table}")) if x[0] not in ids]
            if gone:
                # **`IN :ids` 에 튜플을 넘기면 안 된다** — SQLAlchemy 2.x 는
                # `Python type tuple cannot be converted` 로 죽는다(2026-08-31 실측).
                # 목록을 펼치는 바인드를 따로 만들어야 한다.
                stmt_del = (text(f"UPDATE {table} SET review_status='deleted' "
                                 f"WHERE item_id IN :ids")
                            .bindparams(bindparam("ids", expanding=True)))
                c.execute(stmt_del, {"ids": gone})
        print(f"  {table:<24} {len(rows):>5}행 넣음" + (f" · 사라진 {len(gone)}행 표시" if gone else ""))

    if args.check:
        print(f"\n{'모두 같다' if not bad else f'어긋난 것 {bad}'}")
        return 1 if bad else 0
    print(f"\n{sum(len(v) for v in data.values())}행 · 표 {len(data)}개")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
