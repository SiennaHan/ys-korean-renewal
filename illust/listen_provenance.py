#!/usr/bin/env python3
"""n3 대본이 어디서 왔는지 대본(script_id) 단위로 가른다.

줄 단위로 세면 한 대본 안에서 몇 줄만 걸려 비율이 뒤죽박죽이 된다.
대본은 통째로 교재에서 왔거나 통째로 아닌 것이므로 대본 단위가 옳다.

각 대본의 줄을 신판 부록·신판 본교재·구판 부록·구판 본교재에서 찾아
'몇 줄이 걸리는지'로 판정한다.
"""
import re, json, collections, unicodedata, csv, os
import fitz, openpyxl
from global_text import GlobalPdf

HERE = os.path.dirname(os.path.abspath(__file__))
APX = "/Users/soohyeon/Documents/2608-yonsei_renewal/book"
BASE = "/Users/soohyeon/Documents/2606-yonsei3week_parse"
XLSX = "/Users/soohyeon/Documents/2608-yonsei_renewal/글로벌_교재기반_콘텐츠_v13.xlsx"


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
    by_script = collections.defaultdict(list)
    for r in lines:
        by_script[(int(r["book_id"]), str(r["script_id"]))].append(r)

    out = []
    for b in range(1, 9):
        gp = GlobalPdf(f"{APX}/(최종본)연세글로벌한국어_{b}급_부록-최종(26.8.10).pdf")
        na = sq(" ".join(gp.text(p) for p in range(1, len(gp) + 1)))
        mb = GlobalPdf(f"{BASE}/(최종본)연세글로벌한국어_{b}급_본교재-최종(26.8.10).pdf")
        nm = sq(" ".join(mb.text(p) for p in range(1, len(mb) + 1)))
        od = fitz.open(f"{BASE}/work/book{b}/appendix.pdf")
        oa = sq(" ".join(od[p].get_text() for p in range(od.page_count)))
        om_ = fitz.open(f"{BASE}/{b}_yonsei3week_main.pdf")
        om = sq(" ".join(om_[p].get_text() for p in range(om_.page_count)))

        for (bb, sid), rs in sorted(by_script.items()):
            if bb != b:
                continue
            keys = [sq(r.get("text"))[:18] for r in rs]
            keys = [k for k in keys if len(k) >= 8]
            if not keys:
                continue
            hit = lambda blob: sum(1 for k in keys if k in blob)
            out.append(dict(book=b, chapter=rs[0].get("chapter"), script_id=sid,
                            lines=len(keys),
                            신부록=hit(na), 신본교재=hit(nm),
                            구부록=hit(oa), 구본교재=hit(om),
                            head=str(rs[0].get("text"))[:50]))
        print(f"  {b}급 대본 {sum(1 for o in out if o['book']==b)}개 분석")

    with open(f"{HERE}/verify/listen_provenance.csv", "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=list(out[0]))
        wr.writeheader()
        wr.writerows(out)

    print("\n대본 출처 (줄의 과반이 걸리면 '있음')")
    print(f"{'':4s} {'대본':>4s} {'신판부록':>8s} {'신판본교재':>10s} {'구판부록':>8s} {'구판본교재':>10s} {'어디에도없음':>12s}")
    for b in range(1, 9):
        rs = [o for o in out if o["book"] == b]
        f_ = lambda k: sum(1 for o in rs if o[k] > o["lines"] / 2)
        none = sum(1 for o in rs if all(o[k] <= o["lines"] / 2
                                        for k in ["신부록", "신본교재", "구부록", "구본교재"]))
        print(f"{b}급 {len(rs):6d} {f_('신부록'):8d} {f_('신본교재'):10d} "
              f"{f_('구부록'):8d} {f_('구본교재'):10d} {none:12d}")


if __name__ == "__main__":
    main()
