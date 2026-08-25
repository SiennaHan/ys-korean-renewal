#!/usr/bin/env python3
"""빠뜨린 말을 되살린 수정문을 만든다.

띄어쓰기는 구판 부록 원문에서 가져온다. 신판 부록은 자간을 좌표로 주기 때문에
공백 글리프가 없어 띄어쓰기를 알 수 없다. 조사 하나만 빠진 자리도 있어서
'앞에 공백을 넣을지'를 규칙으로 정하면 틀린다 — 원문 그대로가 답이다.
"""
import re, csv, json, unicodedata
import fitz, openpyxl

BASE = "/Users/soohyeon/Documents/2606-yonsei3week_parse"
XLSX = "/Users/soohyeon/Documents/2608-yonsei_renewal/글로벌_교재기반_콘텐츠_v13.xlsx"
SKIP = re.compile(r"indb|iTour|기자")


def sq(t):
    t = unicodedata.normalize("NFC", str(t or ""))
    return re.sub(r"[\s.,·’‘“”\"'()\[\]?!~\-—:;/…]", "", t)


def sqmap(t):
    """sq 결과의 각 글자가 원문 어느 자리에서 왔는지."""
    t = unicodedata.normalize("NFC", str(t or ""))
    keep, idx = [], []
    for i, ch in enumerate(t):
        if not re.match(r"[\s.,·’‘“”\"'()\[\]?!~\-—:;/…]", ch):
            keep.append(ch)
            idx.append(i)
    return "".join(keep), idx, t


def sheet(wb, name):
    ws = wb[name]
    hdr = list(next(ws.iter_rows(min_row=1, max_row=1, values_only=True)))
    return [dict(zip(hdr, r)) for r in ws.iter_rows(min_row=2, values_only=True)]


def main():
    wb = openpyxl.load_workbook(XLSX, read_only=True)
    lines = {r["item_id"]: r for r in sheet(wb, "n3_listen_script_line") if r.get("item_id")}
    gaps = [r for r in csv.DictReader(open("verify/listen_gaps.csv"))
            if not SKIP.search(r["빠진말"])]

    old_raw, old_sq = {}, {}
    fixes = []
    for r in gaps:
        b = int(r["book"])
        if b not in old_raw:
            d = fitz.open(f"{BASE}/work/book{b}/appendix.pdf")
            raw = " ".join(d[p].get_text() for p in range(d.page_count))
            raw = unicodedata.normalize("NFC", raw)
            k, idx, _ = sqmap(raw)
            old_raw[b], old_sq[b] = (raw, idx), k
        (raw, ridx), osq = old_raw[b], old_sq[b]

        probe = r["앞말"][-12:] + r["빠진말"]
        j = osq.find(probe)
        if j < 0:
            continue                       # 신판 추가분 — 되살릴 대상 아님
        # 구판 원문에서 '앞말 끝 ~ 빠진말 끝' 구간을 띄어쓰기째로 뜯는다
        a = ridx[j + len(r["앞말"][-12:]) - 1] + 1
        z = ridx[j + len(probe) - 1] + 1
        # 구간 끝을 닫는 괄호·공백까지 늘린다. 여기서 끊으면 '카드(통장 와',
        # '기대를하면'처럼 짝이 안 맞거나 앞말에 붙어 버린다.
        while z < len(raw) and raw[z] in ' \t)）]’”':
            z += 1
        seg = re.sub(r"[\s \t]+", " ", raw[a:z])

        row = lines[r["item_id"]]
        k2, idx2, orig = sqmap(row["text"])
        p = k2.find(r["앞말"][-12:])
        if p < 0:
            continue
        cut = idx2[p + len(r["앞말"][-12:]) - 1] + 1
        tail = orig[cut:]
        # 닫는 괄호 뒤에 오던 공백은 원래 빠진 말 안에 있던 것이다.
        # 그대로 두면 '카드(통장) 와'가 된다.
        if seg.rstrip().endswith((")", "）", "]")) and tail.startswith(" "):
            tail = tail[1:]
        new = orig[:cut] + seg + tail
        new = re.sub(r"  +", " ", new)
        fixes.append(dict(item_id=r["item_id"], book=b, chapter=row["chapter"],
                          script_id=row["script_id"], 빠진말=seg.strip(),
                          before=orig, after=new))

    json.dump(fixes, open("verify/listen_fixes.json", "w"), ensure_ascii=False, indent=1)
    print(f"수정 대상 {len(fixes)}건\n")
    for f in fixes:
        i = 0
        while i < min(len(f['before']), len(f['after'])) and f['before'][i] == f['after'][i]:
            i += 1
        print(f"  {f['book']}급 {f['chapter']:>2}과 {f['item_id']}  ▸[{f['빠진말']}]◂")
        print(f"     전: …{f['before'][max(0,i-26):i+26]}…")
        print(f"     후: …{f['after'][max(0,i-26):i+26+len(f['빠진말'])]}…")


if __name__ == "__main__":
    main()
