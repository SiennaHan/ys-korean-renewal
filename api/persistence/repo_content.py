"""교재 콘텐츠를 읽는다 — 과 단위로만.

**활동 하나가 표 여럿을 쓴다.** 듣기는 지문·줄·문항 셋이고 읽기는 지문·문항 둘이다.
그래서 `menuType` 하나에 표 묶음을 매달아 둔다 — 부르는 쪽이 표 이름을 몰라도 되게.

`menuType` 어휘는 **앱·`requireChapter`·활동 상태가 이미 함께 쓰는 것**이다
(word · roleplay · listen-answer · fill-blank · read-answer · flashcard ·
mission-chat · jamo). 여기서 새로 만들지 않는다 — 어휘가 두 벌이 되면 갈라진다.
"""
from sqlalchemy import func
from sqlalchemy.orm import Session

from persistence import model

# menuType → (내보낼 이름, 모델, 부모를 가리키는 열)
#
# 부모가 있는 표는 **과로 직접 거르지 않고 부모의 item_id 로 묶는다.**
# 과로도 걸러지긴 하지만(그 열도 채워 뒀다) 부모를 따라가는 쪽이 뜻이 분명하다.
BUNDLES: dict[str, list[tuple[str, type, str | None]]] = {
    "word":         [("words", model.KoWord, None),
                     ("quiz", model.KoWordQuiz, None)],
    "roleplay":     [("turns", model.KoRoleplayTurn, None)],
    "listen-answer": [("scripts", model.KoListenScript, None),
                      ("lines", model.KoListenScriptLine, "script_item_id"),
                      ("questions", model.KoListenQuestion, "script_item_id")],
    "fill-blank":   [("questions", model.KoBlankQuestion, None)],
    "read-answer":  [("texts", model.KoReadText, None),
                     ("questions", model.KoReadQuestion, "text_item_id")],
    "flashcard":    [("sets", model.KoFlashcardSet, None),
                     ("cards", model.KoFlashcardCard, "set_item_id")],
    "mission-chat": [("scenarios", model.KoMissionChat, None)],
    "jamo":         [("items", model.KoJamo, None)],
}

# **앱에 내보내지 않는 열.** 원장 살림살이지 학습자가 볼 것이 아니다.
# `review_status` 는 표에 남기고 응답에서만 뺀다. **다만 이 열로 게이트를 걸면
# 안 된다** — 실제 검수 상태가 아니다(2026-08-31 확인 · `model.py` 의 그 절).
HIDDEN = {
    "review_status", "source_page", "change_note", "hold_reason",
    "error_note", "module_code", "created_at", "updated_at",
}


# DB 안에서만 쓰는 이름 → **앱이 이미 쓰는 이름**으로 되돌린다.
#
# 표에서는 `chapter_seq`·`ledger_id` 로 두었다(기존 표들과 어휘를 맞추려고).
# 그런데 앱은 JSON 시절의 `chapter`·`id` 로 거른다 — 예컨대 `fill-blank.tsx` 가
# `q.chapter === chapterSeq` 와 `retryOnly.includes(q.id)` 를 쓴다.
#
# **응답을 앱 모양으로 내면 배선은 「어디서 오느냐」만 바뀌고 「무엇이냐」는 안 바뀐다.**
# 앱 13곳을 동시에 고치는 것보다 여기 두 줄이 싸고, 되돌리기도 쉽다.
OUT_NAME = {"chapter_seq": "chapter", "ledger_id": "id"}


def _row(obj) -> dict:
    return {OUT_NAME.get(c.name, c.name): getattr(obj, c.name)
            for c in obj.__table__.columns if c.name not in HIDDEN}


async def findChapter(bookId: int, chapterSeq: int, menuType: str, db: Session) -> dict | None:
    """그 과의 그 활동에 필요한 표 묶음을 통째로 낸다. 없는 활동이면 None."""
    bundle = BUNDLES.get(menuType)
    if bundle is None:
        return None
    out: dict[str, list[dict]] = {}
    parent_ids: set[str] = set()
    for name, mdl, parent_col in bundle:
        q = db.query(mdl)
        if parent_col and parent_ids:
            q = q.filter(getattr(mdl, parent_col).in_(parent_ids))
        else:
            q = q.filter(mdl.book_id == bookId, mdl.chapter_seq == chapterSeq)
        rows = q.all()
        if not parent_col:
            parent_ids |= {r.item_id for r in rows}
        out[name] = [_row(r) for r in rows]
    return out


async def countAll(db: Session) -> list[dict]:
    """과별로 활동마다 몇 개인지 — **본문은 주지 않는다.**

    목록 화면이 자물쇠와 「몇 문항」을 그리려면 잠긴 과의 수도 알아야 한다.
    그래서 이것은 권한을 안 본다. 수만으로는 콘텐츠가 새지 않는다.
    """
    out: dict[tuple[int, int], dict] = {}
    for menu, bundle in BUNDLES.items():
        name, mdl, _p = bundle[0]          # 그 활동의 으뜸 표 하나만 센다
        rows = (db.query(mdl.book_id, mdl.chapter_seq,
                         func.count(mdl.item_id))
                  .group_by(mdl.book_id, mdl.chapter_seq).all())
        for book, ch, n in rows:
            key = (book, ch)
            out.setdefault(key, {"bookId": book, "chapterSeq": ch, "counts": {}})
            out[key]["counts"][menu] = n
    return [out[k] for k in sorted(out)]
