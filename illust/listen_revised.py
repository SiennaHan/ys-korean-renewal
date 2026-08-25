#!/usr/bin/env python3
"""신판에서 내용이 고쳐진 듣기 대본을 찾는다.

앞선 출처 판정(listen_provenance)은 '줄의 과반이 걸리는가'로 봐서
대본 안에서 문단 하나가 통째로 바뀐 경우를 못 잡는다.
6급 13과가 그렇다 — 구판은 터치스크린 냉장고, 신판은 스스로 식재료를
파악하는 냉장고로 설명이 바뀌었는데 나머지 줄이 같아 '유지'로 나왔다.

그래서 대본을 40자씩 잘라 구판·신판 부록에서 각각 몇 토막이 걸리는지 센다.
구판에서는 많이 걸리는데 신판에서 눈에 띄게 덜 걸리면 신판이 고친 것이다.

산출: verify/listen_revised.csv
"""
import os, re, csv, collections, unicodedata
import fitz, openpyxl
from global_text import GlobalPdf

HERE = os.path.dirname(os.path.abspath(__file__))
APX = "/Users/soohyeon/Documents/2608-yonsei_renewal/book"
BASE = "/Users/soohyeon/Documents/2606-yonsei3week_parse"
XLSX = "/Users/soohyeon/Documents/2608-yonsei_renewal/글로벌_교재기반_콘텐츠_v16.xlsx"
WIN = 40


def sq(t):
    t = unicodedata.normalize("NFC", str(t or ""))
    return re.sub(r"[\s.,·’‘“”\"'()\[\]?!~\-—:;/…]", "", t)


def sheet(wb, name):
    ws = wb[name]
    hdr = list(next(ws.iter_rows(min_row=1, max_row=1, values_only=True)))
    return [dict(zip(hdr, r)) for r in ws.iter_rows(min_row=2, values_only=True)]


def main():
    wb = openpyxl.load_workbook(XLSX, read_only=True)
    lines = [r for r in sheet(wb, "n3_listen_script_line") if r.get("book_id")]
    by = collections.defaultdict(list)
    for r in lines:
        by[(int(r["book_id"]), str(r["script_id"]))].append(r)

    out, cache = [], {}
    for (b, sid), rs in sorted(by.items()):
        if b not in cache:
            gp = GlobalPdf(f"{APX}/(최종본)연세글로벌한국어_{b}급_부록-최종(26.8.10).pdf")
            new = sq(" ".join(gp.text(p) for p in range(1, len(gp) + 1)))
            od = fitz.open(f"{BASE}/work/book{b}/appendix.pdf")
            old = sq(" ".join(od[p].get_text() for p in range(od.page_count)))
            cache[b] = (old, new)
        old, new = cache[b]
        chunks = []
        for r in rs:
            t = sq(r.get("text"))
            chunks += [t[i:i + WIN] for i in range(0, max(1, len(t) - WIN + 1), WIN)]
        chunks = [c for c in chunks if len(c) >= 20]
        if len(chunks) < 3:
            continue
        no = sum(1 for c in chunks if c in old) / len(chunks)
        nn = sum(1 for c in chunks if c in new) / len(chunks)
        if no >= 0.5 and no - nn >= 0.2:
            out.append(dict(book=b, chapter=rs[0].get("chapter"), script_id=sid,
                            토막=len(chunks), 구판=round(no, 2), 신판=round(nn, 2),
                            head=str(rs[0].get("text"))[:60]))
    with open(f"{HERE}/verify/listen_revised.csv", "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=list(out[0]) if out else ["book"])
        wr.writeheader()
        wr.writerows(out)
    print(f"신판에서 고쳐진 대본 {len(out)}건\n")
    for o in sorted(out, key=lambda x: -(x["구판"] - x["신판"])):
        print(f"  {o['book']}급 {o['chapter']:>2}과 s{o['script_id']:>4}  "
              f"구판 {o['구판']:.0%} → 신판 {o['신판']:.0%}  ({o['토막']}토막)  {o['head'][:44]}")
    print(f"\n-> verify/listen_revised.csv")


if __name__ == "__main__":
    main()
