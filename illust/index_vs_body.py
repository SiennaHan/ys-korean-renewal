#!/usr/bin/env python3
"""부록 색인의 낱말이 신판 본교재에 실제로 있는지 본다.

색인은 책을 훑어 만든 것이라 본문에 없는 말이 오를 이유가 없다.
그런데 6급 6과가 그랬다 — 본문은 '심리 추리 영화'를 '스릴러 영화'로 바꿨는데
색인은 옛 낱말 그대로다. 과 첫 쪽 목록에서 났던 갱신 누락과 같은 유형이다.

구판 본교재에는 있고 신판 본교재에는 없으면 갱신 누락이 거의 확실하다.

산출: verify/index_stale.csv
"""
import os, re, csv, unicodedata
import fitz
from global_text import GlobalPdf

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "/Users/soohyeon/Documents/2606-yonsei3week_parse"


def sq(t):
    t = unicodedata.normalize("NFC", str(t or ""))
    return re.sub(r"[\s.,·’‘“”\"'()\[\]?!~\-—:;/…]", "", t)


def main():
    idx = list(csv.DictReader(open(f"{HERE}/verify/index_vocab.csv")))
    out = []
    for b in range(1, 9):
        gp = GlobalPdf(f"{BASE}/(최종본)연세글로벌한국어_{b}급_본교재-최종(26.8.10).pdf")
        new = sq(" ".join(gp.text(p) for p in range(1, len(gp) + 1)))
        od = fitz.open(f"{BASE}/{b}_yonsei3week_main.pdf")
        old = sq(" ".join(od[p].get_text() for p in range(od.page_count)))
        rows = [r for r in idx if int(r["book"]) == b]
        miss = 0
        for r in rows:
            w = sq(r["word"])
            if len(w) < 2 or w in new:
                continue
            miss += 1
            out.append(dict(book=b, word=r["word"], chapter=r["chapter"], cat=r["cat"],
                            구판본교재="O" if w in old else "X"))
        print(f"  {b}급 색인 {len(rows):4d}개 중 신판 본교재에 없는 것 {miss}")

    with open(f"{HERE}/verify/index_stale.csv", "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=["book", "word", "chapter", "cat", "구판본교재"])
        wr.writeheader()
        wr.writerows(out)
    stale = [o for o in out if o["구판본교재"] == "O"]
    print(f"\n■ 구판 본교재에는 있고 신판 본교재에는 없음 — 색인 갱신 누락 {len(stale)}건")
    for o in stale:
        print(f"   {o['book']}급 {o['chapter']:>2}과 {o['word']}  ({o['cat']})")
    other = [o for o in out if o["구판본교재"] == "X"]
    if other:
        print(f"\n(양쪽 본교재에 다 없음 {len(other)}건 — 표기 차이나 추출 실패일 수 있음)")
        for o in other[:12]:
            print(f"   {o['book']}급 {o['chapter']:>2}과 {o['word']}")
    print(f"\n-> verify/index_stale.csv")


if __name__ == "__main__":
    main()
