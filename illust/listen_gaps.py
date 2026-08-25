#!/usr/bin/env python3
"""듣기 대본에서 '빠뜨린 말'만 골라낸다.

어긋난 지점이 다 결함은 아니다. 두 가지가 섞여 있다.
  (가) 엑셀이 교재의 말을 빠뜨렸다      → 문장이 깨진다. 고쳐야 한다.
  (나) 엑셀이 교재와 다르게 썼다        → '국가가'/'국가에서'처럼 뜻이 같다. 둘 다 맞다.

가르는 방법: 어긋난 지점에서 엑셀의 다음 말이 교재의 **바로 뒤쪽**에서 다시 나오면
그 사이에 있는 교재의 말이 통째로 빠진 것이다. 다시 안 나오면 표현이 갈린 것이다.

산출: verify/listen_gaps.csv
"""
import os, re, csv, unicodedata
import fitz, openpyxl
from global_text import GlobalPdf

HERE = os.path.dirname(os.path.abspath(__file__))
APX = "/Users/soohyeon/Documents/2608-yonsei_renewal/book"
BASE = "/Users/soohyeon/Documents/2606-yonsei3week_parse"
XLSX = "/Users/soohyeon/Documents/2608-yonsei_renewal/글로벌_교재기반_콘텐츠_v16.xlsx"
GAP_MAX = 40      # 이보다 많이 빠졌으면 '다른 글'로 본다


def sq(t):
    t = unicodedata.normalize("NFC", str(t or ""))
    return re.sub(r"[\s.,·’‘“”\"'()\[\]?!~\-—:;/…]", "", t)


def sheet(wb, name):
    ws = wb[name]
    hdr = list(next(ws.iter_rows(min_row=1, max_row=1, values_only=True)))
    return [dict(zip(hdr, r)) for r in ws.iter_rows(min_row=2, values_only=True)]


def analyse(t, B):
    """엑셀 한 줄을 교재 뭉치와 맞춰 가며 빠진 말을 모은다."""
    gaps, i = [], 0
    # 시작점 찾기
    seed = t[:24]
    j = B.find(seed)
    if j < 0:
        return None
    i = 0
    while i < len(t):
        # 지금 위치에서 최대한 길게 맞춘다
        k = 0
        while i + k < len(t) and j + k < len(B) and t[i + k] == B[j + k]:
            k += 1
        i += k
        j += k
        if i >= len(t) - 4:
            break
        nxt = t[i:i + 14]
        if len(nxt) < 8:
            break
        # 교재의 바로 뒤쪽에서 엑셀의 다음 말을 찾는다
        w = B.find(nxt, j, j + GAP_MAX + len(nxt))
        if w < 0:
            return gaps + [dict(kind="표현 차이", 교재="", 엑셀=t[i:i + 20],
                                앞=t[max(0, i - 20):i])]
        gaps.append(dict(kind="누락", 교재=B[j:w], 엑셀="", 앞=t[max(0, i - 20):i]))
        j = w
    return gaps


def main():
    wb = openpyxl.load_workbook(XLSX, read_only=True)
    lines = [r for r in sheet(wb, "n3_listen_script_line") if r.get("book_id")]

    out, cache = [], {}
    for r in sorted(lines, key=lambda x: int(x["book_id"])):
        b = int(r["book_id"])
        t = sq(r.get("text"))
        if len(t) < 60:
            continue
        if b not in cache:
            gp = GlobalPdf(f"{APX}/(최종본)연세글로벌한국어_{b}급_부록-최종(26.8.10).pdf")
            s = sq(" ".join(gp.text(p) for p in range(1, len(gp) + 1)))
            od = fitz.open(f"{BASE}/work/book{b}/appendix.pdf")
            s += " " + sq(" ".join(od[p].get_text() for p in range(od.page_count)))
            cache[b] = s
        g = analyse(t, cache[b])
        if not g:
            continue
        for x in g:
            if x["kind"] == "누락" and 1 <= len(x["교재"]) <= GAP_MAX:
                out.append(dict(book=b, chapter=r.get("chapter"),
                                script_id=r.get("script_id"), item_id=r.get("item_id"),
                                빠진말=x["교재"], 앞말=x["앞"]))
    with open(f"{HERE}/verify/listen_gaps.csv", "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=list(out[0]) if out else ["book"])
        wr.writeheader()
        wr.writerows(out)
    print(f"빠뜨린 말 {len(out)}건\n")
    for o in out:
        print(f"  {o['book']}급 {o['chapter']:>2}과 s{o['script_id']:>4}  "
              f"…{o['앞말'][-18:]} ▸[{o['빠진말']}]◂")
    print(f"\n-> verify/listen_gaps.csv")


if __name__ == "__main__":
    main()
