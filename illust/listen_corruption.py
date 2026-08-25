#!/usr/bin/env python3
"""교재에서 온 듣기 대본에서 문자열 손상을 찾는다.

같은 대본의 다른 줄은 교재에서 그대로 찾히는데 어떤 줄만 안 찾히면,
그 줄은 옮기는 과정에서 망가졌을 가능성이 크다(5급 8과 '피곤해서' 누락이 그 예).

창작 대본은 애초에 교재에 없으므로 대상에서 뺀다. 대본의 줄 중
절반 이상이 교재에서 찾히는 것만 '교재에서 온 대본'으로 본다.

산출: verify/listen_corruption.csv
"""
import os, re, csv, collections, unicodedata
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
    by = collections.defaultdict(list)
    for r in lines:
        by[(int(r["book_id"]), str(r["script_id"]))].append(r)

    out = []
    for b in range(1, 9):
        gp = GlobalPdf(f"{APX}/(최종본)연세글로벌한국어_{b}급_부록-최종(26.8.10).pdf")
        blob = sq(" ".join(gp.text(p) for p in range(1, len(gp) + 1)))
        od = fitz.open(f"{BASE}/work/book{b}/appendix.pdf")
        blob += sq(" ".join(od[p].get_text() for p in range(od.page_count)))
        mb = GlobalPdf(f"{BASE}/(최종본)연세글로벌한국어_{b}급_본교재-최종(26.8.10).pdf")
        blob += sq(" ".join(mb.text(p) for p in range(1, len(mb) + 1)))
        om = fitz.open(f"{BASE}/{b}_yonsei3week_main.pdf")
        blob += sq(" ".join(om[p].get_text() for p in range(om.page_count)))

        for (bb, sid), rs in by.items():
            if bb != b:
                continue
            found = {}
            for r in rs:
                t = sq(r.get("text"))
                found[r["item_id"]] = (len(t) >= 10 and t[:20] in blob, t, r)
            hits = sum(1 for v in found.values() if v[0])
            usable = sum(1 for v in found.values() if len(v[1]) >= 10)
            if usable < 2 or hits < usable / 2:
                continue                      # 창작 대본 — 대조 대상 아님
            for iid, (ok, t, r) in found.items():
                if ok or len(t) < 10:
                    continue
                # 앞 20자는 안 맞아도 뒤쪽이 맞으면 앞부분이 망가진 것
                tail = t[-20:] in blob
                mid = any(t[i:i + 15] in blob for i in range(0, max(1, len(t) - 15), 5))
                out.append(dict(book=b, chapter=r.get("chapter"), script_id=sid,
                                item_id=iid, speaker=r.get("speaker"),
                                뒷부분일치="O" if tail else "X",
                                일부일치="O" if mid else "X",
                                text=str(r.get("text"))[:110]))
    with open(f"{HERE}/verify/listen_corruption.csv", "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=list(out[0]))
        wr.writeheader()
        wr.writerows(out)
    print(f"교재에서 온 대본 중 안 맞는 줄 {len(out)}건")
    c = collections.Counter((o["뒷부분일치"], o["일부일치"]) for o in out)
    print("  (뒷부분일치, 일부일치):", dict(c))
    for o in out:
        if o["일부일치"] == "O":     # 일부만 맞음 = 손상 의심이 가장 큼
            print(f"  ★ {o['book']}급 {o['chapter']}과 s{o['script_id']} [{o['speaker']}] {o['text'][:80]}")
    print(f"-> verify/listen_corruption.csv")


if __name__ == "__main__":
    main()
