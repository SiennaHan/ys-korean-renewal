#!/usr/bin/env python3
"""본교재 어휘 쪽에서 '낱말 - 영 - 일 - 중' 네 줄 묶음을 뽑는다.

원래 파싱은 본문 오른쪽 뜻풀이 열만 봤다. 그런데 어휘 쪽(그림과 함께 낱말을
늘어놓는 면)에도 세 언어 대역이 실려 있다 — 우리 원장의 번역 빈칸 167건 중
대부분이 거기 있는 말들이다.

신판은 공백 글리프가 없어 영어가 'companyworker'로 붙어 나온다. 글자 사이
간격으로 띄어쓰기를 되살린다(글자 폭 대비 0.22 이상이면 공백). 단 칸이 갈리는
자리는 간격이 훨씬 크므로 그건 줄을 나누는 신호로 쓴다.

산출: verify/vocab_trans.csv
"""
import os, re, csv, json, unicodedata, statistics
from global_text import GlobalPdf

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "/Users/soohyeon/Documents/2606-yonsei3week_parse"
WORD_GAP = 0.22        # 글자 폭 대비 — 이보다 벌어지면 공백
COL_GAP = 1.6          # 이보다 벌어지면 다른 칸(줄을 나눈다)

HANGUL = re.compile(r"[가-힣]")
LATIN = re.compile(r"[A-Za-z]")
KANA = re.compile(r"[぀-ヿ]")
CJK = re.compile(r"[一-鿿]")


def lines_of(gp, pno):
    """[(문자열, y, x중심)] — 낱자 좌표로 줄을 묶고 띄어쓰기를 되살린다."""
    ch = [(c, r) for c, r in gp.chars(pno) if not c.isspace()]
    if not ch:
        return []
    ch.sort(key=lambda t: (round((t[1].y0 + t[1].y1) / 2 / 5), t[1].x0))
    out, cur, prev, y0, x0 = [], "", None, None, None
    for c, r in ch:
        cy = (r.y0 + r.y1) / 2
        if prev is not None:
            newline = abs(cy - y0) > 5
            gap = r.x0 - prev.x1
            w = max(r.width, prev.width, 1e-6)
            if newline or gap > w * COL_GAP:
                if cur.strip():
                    out.append((cur.strip(), y0, (x0 + prev.x1) / 2))
                cur, x0 = "", None
            elif gap > w * WORD_GAP:
                cur += " "
        if x0 is None:
            x0 = r.x0
        cur += c
        prev, y0 = r, cy
    if cur.strip():
        out.append((cur.strip(), y0, (x0 + prev.x1) / 2))
    return out


def grid_entries(ls):
    """표로 놓인 어휘 블록을 읽는다.

    어휘 면은 낱말이 한 줄, 영어가 그 아래 줄, 일본어·중국어가 다시 그 아래로
    **가로 표**를 이룬다. 위에서 아래로만 읽으면 '낱말 낱말 낱말 … 영어 영어 영어'가
    되어 짝이 안 맞는다. 줄(띠)로 묶고 x 위치로 세로 짝을 찾는다.
    """
    bands, cur = [], []
    for item in sorted(ls, key=lambda t: t[1]):
        if cur and abs(item[1] - cur[-1][1]) > 4:
            bands.append(sorted(cur, key=lambda t: t[2]))
            cur = []
        cur.append(item)
    if cur:
        bands.append(sorted(cur, key=lambda t: t[2]))

    out = []
    for i in range(len(bands) - 2):
        b0, b1, b2 = bands[i], bands[i + 1], bands[i + 2]
        if len(b0) < 2 or not all(kind(s) == "ko" for s, _, _ in b0):
            continue
        if len(b1) != len(b0) or not all(kind(s) == "en" for s, _, _ in b1):
            continue
        if len(b2) != len(b0) or not all(kind(s) in ("jp", "cjk") for s, _, _ in b2):
            continue
        b3 = bands[i + 3] if i + 3 < len(bands) else []
        use3 = (len(b3) == len(b0)
                and all(kind(s) in ("jp", "cjk") for s, _, _ in b3))
        for j in range(len(b0)):
            out.append((b0[j][0], b1[j][0], b2[j][0], b3[j][0] if use3 else ""))
    return out


def kind(s):
    t = s.strip()
    if not t:
        return None
    if HANGUL.search(t):
        return "ko"
    if LATIN.search(t):
        return "en"
    if KANA.search(t):
        return "jp"
    if CJK.search(t):
        return "cjk"
    return None


def main():
    rows = []
    for b in range(1, 9):
        gp = GlobalPdf(f"{BASE}/(최종본)연세글로벌한국어_{b}급_본교재-최종(26.8.10).pdf")
        toc = json.load(open(f"{BASE}/work/book{b}/toc.json"))
        ranges = {int(k): v for k, v in toc["ranges"].items()}
        page_ch = {}
        for c, (a, z) in ranges.items():
            for p in range(a, z + 1):
                page_ch.setdefault(p, c)
        n = 0
        for p in range(1, len(gp) + 1):
            raw = lines_of(gp, p)
            for ko, en, jp, cn in grid_entries(raw):
                if len(ko) <= 14 and len(en) <= 60:
                    rows.append(dict(book=b, page=p, chapter=page_ch.get(p, ""),
                                     word=ko, en=en, jp=jp, cn=cn))
                    n += 1
            ls = [s for s, _, _ in raw]
            ks = [kind(s) for s in ls]
            i = 0
            while i < len(ls) - 2:
                # 낱말 - 영 - (일) - (중)
                if ks[i] == "ko" and ks[i + 1] == "en" and ks[i + 2] in ("jp", "cjk"):
                    ko, en = ls[i], ls[i + 1]
                    jp = ls[i + 2]
                    cn = ls[i + 3] if (i + 3 < len(ls) and ks[i + 3] in ("jp", "cjk")) else ""
                    step = 4 if cn else 3
                    if len(ko) <= 14 and len(en) <= 60:
                        rows.append(dict(book=b, page=p, chapter=page_ch.get(p, ""),
                                         word=ko, en=en, jp=jp, cn=cn))
                        n += 1
                    i += step
                    continue
                i += 1
        print(f"  {b}급 {n}개")

    with open(f"{HERE}/verify/vocab_trans.csv", "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=["book", "page", "chapter", "word", "en", "jp", "cn"])
        wr.writeheader()
        wr.writerows(rows)
    print(f"\n-> verify/vocab_trans.csv ({len(rows)}건)")
    for r in rows[:8]:
        print(f"   {r['book']}급 {r['chapter']}과 {r['word']:10s} | {r['en']:22s} | {r['jp']:10s} | {r['cn']}")


if __name__ == "__main__":
    main()
