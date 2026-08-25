#!/usr/bin/env python3
"""미션대화가 그 과 문법을 겨누고 있는지 본다.

주제어 겹침으로 재려던 것은 버렸다 — 시나리오와 학습목표는 같은 뜻을 다른 말로
적어서('전자제품이 작동하지 않는 상황' ↔ '기계 등의 문제점') 겹침이 낮게 나온다.

시트를 읽어 보니 미션대화의 잣대는 주제가 아니라 **문법**이었다.
target_grammar 열이 그 과 문법을 그대로 담고 있다. 그래서 그 열과
교재 과 첫 쪽 ● 문법을 맞댄다. 이건 문자열로 확인된다.

문법은 신구판에서 바뀌지 않았으므로, 여기서 맞으면 미션대화는 신판에서도 유효하다.

산출: verify/chat_vs_grammar.csv
"""
import os, re, csv, collections, unicodedata
from n4_assign import gram_items, skeleton

HERE = os.path.dirname(os.path.abspath(__file__))


def forms(t):
    """target_grammar에서 문법형을 쪼갠다. '-을지/ㄹ지 -을지/ㄹ지 이든지/든지'."""
    t = unicodedata.normalize("NFC", str(t or ""))
    out, cur = [], ""
    for tok in t.split():
        if tok.startswith("-") and cur:
            out.append(cur); cur = tok
        else:
            cur = (cur + " " + tok).strip()
    if cur:
        out.append(cur)
    return [x for x in out if x]


def main():
    syl = {}
    for r in csv.DictReader(open(f"{HERE}/syllabus.csv")):
        if r["field"] == "문법":
            syl[(int(r["book"]), int(r["chapter"]))] = gram_items(r["value"])

    cd = list(csv.DictReader(open(f"{HERE}/gsheet/chat_dialog.csv")))
    out, stat = [], collections.Counter()
    for r in cd:
        b, ch = int(r["book_id"]), int(r["chapter"])
        items = syl.get((b, ch), [])
        tg = forms(r.get("target_grammar"))
        if not tg:
            stat["target_grammar 없음"] += 1
            continue
        if not items:
            stat["교재 문법 목록 없음"] += 1
            continue
        matched = []
        for g in tg:
            sk = skeleton(g)
            hit = next((it for it in items if sk and (skeleton(it) in sk or sk in skeleton(it))), None)
            matched.append((g, hit))
        miss = [g for g, h in matched if not h]
        if not miss:
            stat["문법 일치"] += 1
        else:
            stat["일부 불일치"] += 1
            out.append(dict(id=r["id"], book=b, chapter=ch,
                            target=r.get("target_grammar"),
                            교재문법=" / ".join(items),
                            안맞는것=" / ".join(miss),
                            scenario=r["scenario"][:44]))
    with open(f"{HERE}/verify/chat_vs_grammar.csv", "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=["id", "book", "chapter", "target",
                                           "교재문법", "안맞는것", "scenario"])
        wr.writeheader()
        wr.writerows(out)
    print("미션대화 117개 — target_grammar vs 교재 과 문법")
    print(" ", dict(stat))
    print(f"\n■ 안 맞는 것 {len(out)}건")
    for o in out:
        print(f"  {o['book']}권 {o['chapter']:>2}과 {o['id']:5s}")
        print(f"       target : {o['target']}")
        print(f"       교재   : {o['교재문법']}")
        print(f"       안맞음 : {o['안맞는것']}")
    print(f"\n-> verify/chat_vs_grammar.csv")


if __name__ == "__main__":
    main()
