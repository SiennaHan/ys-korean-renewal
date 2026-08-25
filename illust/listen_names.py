#!/usr/bin/env python3
"""듣기 대본의 등장인물이 신판 교재에 실재하는지 본다.

대본 375개 중 147개는 부록에 대본이 없어(부록은 발문만 싣는다) 원래 파싱 때
창작으로 채운 것이다. 문자열 대조가 성립하지 않으므로 다른 잣대가 필요하다.

인물 이름은 교재가 바꾸면 바로 어긋난다. 1급 4과가 그 예다 —
신판 본문은 '야마모토 유리'인데 듣기 대본은 '영주'를 쓴다.

이름이 신판 책 전체에 한 번도 없으면 확실한 잔재다.
책에는 있으나 그 과에 없으면 '과 밖 인물'로 따로 표시만 한다(급 전체에서
인물을 끌어오는 편집이 실제로 있어 오탐이 되기 쉽다).

산출: verify/listen_names.csv
"""
import os, re, csv, collections, unicodedata
import fitz, openpyxl, json
from global_text import GlobalPdf

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "/Users/soohyeon/Documents/2606-yonsei3week_parse"
XLSX = "/Users/soohyeon/Documents/2608-yonsei_renewal/글로벌_교재기반_콘텐츠_v13.xlsx"

# 역할 표기는 인물이 아니다
ROLE = re.compile(r"^(남자?|여자?|남[12]|여[12]|손님|점원|종업원|의사|간호사|기사|아나운서|"
                  r"기자|사회자|선생님|학생|직원|주인|안내원|리포터|해설|내레이션|"
                  r"대학신문기자|대학 신문 기자|아저씨|아주머니|엄마|아빠|어머니|아버지|"
                  r"할머니|할아버지|친구[12]?|딸|아들|형|누나|언니|오빠|동생)$")


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

    out = []
    print(f"{'':4s}{'인물':>6s}{'신판에 없음':>12s}{'과 밖':>8s}")
    for b in range(1, 9):
        mb = GlobalPdf(f"{BASE}/(최종본)연세글로벌한국어_{b}급_본교재-최종(26.8.10).pdf")
        whole = sq(" ".join(mb.text(p) for p in range(1, len(mb) + 1)))
        toc = json.load(open(f"{BASE}/work/book{b}/toc.json"))
        ranges = {int(k): v for k, v in toc["ranges"].items()}
        per = {ch: sq(" ".join(mb.text(p) for p in range(a, min(z, len(mb)) + 1)))
               for ch, (a, z) in ranges.items()}
        od = fitz.open(f"{BASE}/{b}_yonsei3week_main.pdf")
        oldw = sq(" ".join(od[p].get_text() for p in range(od.page_count)))

        seen, gone, off = set(), 0, 0
        for r in [x for x in lines if int(x["book_id"]) == b]:
            sp = str(r.get("speaker") or "").strip()
            if not sp or ROLE.match(sp):
                continue
            ch = int(r["chapter"])
            k = (b, ch, sp)
            if k in seen:
                continue
            seen.add(k)
            inbook = sq(sp) in whole
            inch = sq(sp) in per.get(ch, "")
            if not inbook:
                gone += 1
                out.append(dict(kind="신판에 없는 인물", book=b, chapter=ch, speaker=sp,
                                script_id=r.get("script_id"), item_id=r.get("item_id"),
                                구판에있음="O" if sq(sp) in oldw else "X",
                                text=str(r.get("text"))[:60]))
            elif not inch:
                off += 1
                out.append(dict(kind="그 과에 없는 인물", book=b, chapter=ch, speaker=sp,
                                script_id=r.get("script_id"), item_id=r.get("item_id"),
                                구판에있음="O" if sq(sp) in oldw else "X",
                                text=str(r.get("text"))[:60]))
        print(f"{b}급 {len(seen):6d} {gone:12d} {off:8d}")

    with open(f"{HERE}/verify/listen_names.csv", "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=list(out[0]))
        wr.writeheader()
        wr.writerows(out)
    print(f"\n-> verify/listen_names.csv ({len(out)}건)")
    print("\n■ 신판 책 전체에 없는 인물")
    for o in out:
        if o["kind"] == "신판에 없는 인물":
            print(f"  {o['book']}급 {o['chapter']:>2}과 [{o['speaker']}] 구판{o['구판에있음']}  {o['text'][:44]}")


if __name__ == "__main__":
    main()
