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
    ("ko_jamo", "n8_jamo.json", None),
]

RENAME = {"chapter": "chapter_seq", "id": "ledger_id"}


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
            for k, v in r.items():
                nm = RENAME.get(k, k)
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


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="넣지 않고 다른 곳만 센다")
    args = ap.parse_args()

    from sqlalchemy import text
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

    bad = 0
    for table, rows in data.items():
        keys = sorted(cols[table] - {"created_at", "updated_at"})
        if args.check:
            with eng.connect() as c:
                have = {r[0]: r for r in c.execute(
                    text(f"SELECT item_id, {', '.join(keys)} FROM {table}"))}
            miss = [r["item_id"] for r in rows if r["item_id"] not in have]
            extra = set(have) - {r["item_id"] for r in rows}
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
                c.execute(text(f"UPDATE {table} SET review_status='deleted' "
                               f"WHERE item_id IN :ids"), {"ids": tuple(gone)})
        print(f"  {table:<24} {len(rows):>5}행 넣음" + (f" · 사라진 {len(gone)}행 표시" if gone else ""))

    if args.check:
        print(f"\n{'모두 같다' if not bad else f'어긋난 것 {bad}'}")
        return 1 if bad else 0
    print(f"\n{sum(len(v) for v in data.values())}행 · 표 {len(data)}개")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
