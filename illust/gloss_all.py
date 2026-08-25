#!/usr/bin/env python3
"""전 급·전 과의 '본문 글로스 어휘'를 뽑는다.

과 첫 쪽의 '● 어휘' 목록은 정본이 아니다 — 본문을 새로 쓴 과에서 갱신이
누락돼 구판 단어가 그대로 남아 있다(8급 1과·6급 5과·13과에서 확인).
정본은 본문 오른쪽에 세로로 붙는 글로스 열이다.

지면 구조: 글로스는 본문과 같은 y에 걸치는 별도 단이라, 줄 안에서 x가
크게 벌어지는 지점으로 단을 나눈 뒤 오른쪽 단만 취한다.

산출: gloss_all.csv (급, 과, 쪽, 어휘)
"""
import os, csv, re, json
from global_text import GlobalPdf
from extract_dialogue import line_items

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "/Users/soohyeon/Documents/2606-yonsei3week_parse"
GLOSS_X = 400
HANGUL = re.compile(r"[가-힣]")
# 글로스 열에 같이 놓이는 영어·일본어·중국어 뜻풀이와 문법 항목은 뺀다
NOT_WORD = re.compile(r"MP3|indb|^\d+$|^20\d\d|연세|^제\s*\d+\s*과|과제|어휘|문법|"
                      r"^[-–]|답시고|^$")


def main(books):
    rows = []
    for b in books:
        gp = GlobalPdf(f"{BASE}/(최종본)연세글로벌한국어_{b}급_본교재-최종(26.8.10).pdf")
        toc = json.load(open(f"{BASE}/work/book{b}/toc.json"))
        ranges = {int(k): v for k, v in toc["ranges"].items()}
        hangul = set(toc.get("hangul_chapters", []))
        for ch in sorted(ranges):
            if ch in hangul:
                continue
            a, z = ranges[ch]
            for pno in range(a, min(z, len(gp)) + 1):
                for _, x, t in line_items(gp, pno):
                    t = t.strip()
                    if x < GLOSS_X or not t or NOT_WORD.search(t):
                        continue
                    if not HANGUL.search(t):
                        continue
                    # 한국어 표제어만 — 뜻풀이가 붙어 있으면 앞부분만
                    w = re.split(r"\s{2,}", t)[0].strip()
                    if 2 <= len(w) <= 14 and HANGUL.search(w):
                        rows.append(dict(book=b, chapter=ch, pdf_page=pno, word=w))
        print(f"{b}급: {sum(1 for r in rows if r['book'] == b)}개")

    # 같은 과 안 중복 제거
    seen, uniq = set(), []
    for r in rows:
        k = (r["book"], r["chapter"], r["word"])
        if k not in seen:
            seen.add(k)
            uniq.append(r)
    with open(f"{HERE}/gloss_all.csv", "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=["book", "chapter", "pdf_page", "word"])
        wr.writeheader()
        wr.writerows(uniq)
    print(f"중복 제거 후 {len(uniq)}개 -> {HERE}/gloss_all.csv")


if __name__ == "__main__":
    import sys
    main([int(x) for x in sys.argv[1:]] or list(range(2, 9)))
