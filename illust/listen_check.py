#!/usr/bin/env python3
"""듣기 지문(n3)을 신판·구판 부록과 대조한다.

부록 '듣기 지문' 절이 정본이다. 본교재에는 문항만 실리고 음성 대본은 부록에만 있다.
그동안 n3를 못 본 이유가 이것이고, 신판 부록이 들어와 비로소 대조가 열렸다.

verify_content.py와 같은 판정 틀:
  신판에 있다            → 유지
  구판에만 있다          → 구판 잔재 (재저작 필요)
  양쪽에 없다            → 부록 밖 (창작이거나 추출 실패)

구간은 쪽 머리글로 잡는다. 간지에는 절 목록이 통째로 찍혀 있어 오탐이 나므로
머리글이 절 이름 하나뿐인 쪽만 센다. 구판은 머리글 추출이 들쭉날쭉해
검출된 쪽의 최소~최대 구간을 통째로 쓴다.

산출: verify/listen.csv
"""
import os, csv, re, collections, unicodedata
import fitz, openpyxl
from global_text import GlobalPdf

HERE = os.path.dirname(os.path.abspath(__file__))
APX = "/Users/soohyeon/Documents/2608-yonsei_renewal/book"
BASE = "/Users/soohyeon/Documents/2606-yonsei3week_parse"
XLSX = "/Users/soohyeon/Documents/2608-yonsei_renewal/글로벌_교재기반_콘텐츠_v13.xlsx"
OUT = f"{HERE}/verify"

# 신판은 자간을 좌표로 주므로 공백 글리프가 없다. 양쪽 다 공백·문장부호를 턴다.
def sq(t):
    t = unicodedata.normalize("NFC", str(t or ""))
    return re.sub(r"[\s.,·’‘“”\"'()\[\]?!~\-—:;/…]", "", t)


def head(t):
    return next((l.strip() for l in t.split("\n") if l.strip()), "")


def span(pages_text, name):
    hit = [p for p, t in pages_text.items()
           if head(t).replace(" ", "") == name.replace(" ", "")]
    return (min(hit), max(hit)) if hit else None


def blob(pages_text, rng):
    if not rng:
        return ""
    return sq(" ".join(pages_text.get(p, "") for p in range(rng[0], rng[1] + 1)))


def sheet(wb, name):
    ws = wb[name]
    hdr = list(next(ws.iter_rows(min_row=1, max_row=1, values_only=True)))
    return [dict(zip(hdr, r)) for r in ws.iter_rows(min_row=2, values_only=True)]


def main():
    wb = openpyxl.load_workbook(XLSX, read_only=True)
    lines = [r for r in sheet(wb, "n3_listen_script_line") if r.get("book_id")]

    rows, stat = [], collections.Counter()
    per_book = {}
    for b in range(1, 9):
        gp = GlobalPdf(f"{APX}/(최종본)연세글로벌한국어_{b}급_부록-최종(26.8.10).pdf")
        npt = {p: gp.text(p) for p in range(1, len(gp) + 1)}
        od = fitz.open(f"{BASE}/work/book{b}/appendix.pdf")
        opt = {p + 1: od[p].get_text() for p in range(od.page_count)}
        nr, orr = span(npt, "듣기 지문"), span(opt, "듣기 지문")
        # 부록 밖으로 밀린 대본이 있을 수 있어 본교재도 받쳐 둔다.
        mb = GlobalPdf(f"{BASE}/(최종본)연세글로벌한국어_{b}급_본교재-최종(26.8.10).pdf")
        per_book[b] = dict(
            new_listen=blob(npt, nr), old_listen=blob(opt, orr),
            new_all=sq(" ".join(npt.values())) + sq(" ".join(mb.text(p) for p in range(1, len(mb) + 1))),
            old_all=sq(" ".join(opt.values())),
            nr=nr, orr=orr)
        print(f"  {b}급 듣기 구간  신판 p{nr[0]}~{nr[1]} ({len(per_book[b]['new_listen'])}자)  "
              f"구판 p{orr[0]}~{orr[1]} ({len(per_book[b]['old_listen'])}자)")

    for r in lines:
        b = int(r["book_id"])
        t = sq(r.get("text"))
        if len(t) < 6:
            stat[f"{b}급 짧음(제외)"] += 1
            continue
        key = t[:18]
        d = per_book[b]
        innew = key in d["new_listen"] or key in d["new_all"]
        inold = key in d["old_listen"] or key in d["old_all"]
        if innew:
            v = "유지"
        elif inold:
            v = "구판 잔재"
        else:
            v = "양쪽 밖"
        stat[f"{b}급 {v}"] += 1
        if v != "유지":
            rows.append(dict(verdict=v, item_id=r.get("item_id"), book=b,
                             chapter=r.get("chapter"), script_id=r.get("script_id"),
                             seq=r.get("seq"), speaker=r.get("speaker"),
                             text=str(r.get("text"))[:90]))

    with open(f"{OUT}/listen.csv", "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=list(rows[0]) if rows else
                            ["verdict", "item_id", "book", "chapter", "script_id",
                             "seq", "speaker", "text"])
        wr.writeheader()
        wr.writerows(rows)

    print("\n급별 판정")
    for b in range(1, 9):
        d = {k.split(" ", 1)[1]: v for k, v in stat.items() if k.startswith(f"{b}급 ")}
        tot = sum(d.values())
        keep = d.get("유지", 0)
        print(f"  {b}급 {tot:4d}줄  유지 {keep:4d} ({keep/max(tot,1):5.1%})  "
              f"구판잔재 {d.get('구판 잔재',0):3d}  양쪽밖 {d.get('양쪽 밖',0):3d}")
    print(f"\n-> {OUT}/listen.csv ({len(rows)}건)")


if __name__ == "__main__":
    main()
