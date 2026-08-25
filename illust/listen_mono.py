#!/usr/bin/env python3
"""1줄짜리 독백 대본을 원문과 대조한다.

앞 검사는 '대본 안의 다른 줄이 맞는지'로 대조 대상을 골라서
줄이 하나뿐인 독백은 통째로 빠졌다. 5급 8과 '피곤해서' 누락이 그렇게 새어 나갔다.

독백은 길어서 통짜 대조가 안 된다. 40자씩 잘라 각 토막이 교재에 있는지 보고,
없는 토막의 앞뒤로 좁혀 어긋난 지점을 짚는다.
"""
import os, re, csv, unicodedata
import fitz, openpyxl
from global_text import GlobalPdf

HERE = os.path.dirname(os.path.abspath(__file__))
APX = "/Users/soohyeon/Documents/2608-yonsei_renewal/book"
BASE = "/Users/soohyeon/Documents/2606-yonsei3week_parse"
XLSX = "/Users/soohyeon/Documents/2608-yonsei_renewal/글로벌_교재기반_콘텐츠_v13.xlsx"
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
    mono = [r for r in lines if len(sq(r.get("text"))) >= 120]

    out = []
    cache = {}
    for r in sorted(mono, key=lambda x: int(x["book_id"])):
        b = int(r["book_id"])
        if b not in cache:
            gp = GlobalPdf(f"{APX}/(최종본)연세글로벌한국어_{b}급_부록-최종(26.8.10).pdf")
            s = sq(" ".join(gp.text(p) for p in range(1, len(gp) + 1)))
            od = fitz.open(f"{BASE}/work/book{b}/appendix.pdf")
            s += sq(" ".join(od[p].get_text() for p in range(od.page_count)))
            cache[b] = s
        B = cache[b]
        t = sq(r.get("text"))
        chunks = [(i, t[i:i + WIN]) for i in range(0, len(t) - WIN, WIN)]
        if not chunks:
            continue
        hit = [c in B for _, c in chunks]
        if not any(hit):
            continue                       # 창작 독백 — 대조 대상 아님
        bad = [i for i, (_, c) in enumerate(chunks) if not hit[i]]
        if not bad:
            continue
        # 어긋난 토막의 시작 지점을 한 글자씩 좁힌다
        for i in bad:
            off, c = chunks[i]
            k = 0
            while k < len(c) and c[:k + 1] in B:
                k += 1
            out.append(dict(book=b, chapter=r.get("chapter"),
                            script_id=r.get("script_id"), item_id=r.get("item_id"),
                            일치까지=c[:k], 어긋난뒤=c[k:k + 22],
                            앞뒤토막일치=f"{sum(hit)}/{len(chunks)}"))
    with open(f"{HERE}/verify/listen_mono.csv", "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=list(out[0]) if out else ["book"])
        wr.writeheader()
        wr.writerows(out)
    print(f"독백 {len(mono)}개 중 어긋난 토막 {len(out)}건\n")
    for o in out:
        print(f"  {o['book']}급 {o['chapter']}과 s{o['script_id']} ({o['앞뒤토막일치']})")
        print(f"     …{o['일치까지'][-24:]}  ▸▸  {o['어긋난뒤']}…")
    print(f"\n-> verify/listen_mono.csv")


if __name__ == "__main__":
    main()
