#!/usr/bin/env python3
"""부록 '모범 답안'을 파싱해 과·절별 답 문장을 뽑는다.

구조는 이렇다.
    제N과 / 어휘 / 1) … 2) … / 문법 1 / 1) … / 문법 2 / … / 과제 1 / 생략 / …

이 답들은 부록 '문법 활용연습'과 본교재 과제의 정답이다. 우리 n4 완성문과
맞대 보면 교재가 인정하는 문장과 다른 곳을 찾을 수 있다.

산출: verify/answer_key.csv
"""
import os, re, csv, collections, unicodedata
from global_text import GlobalPdf

HERE = os.path.dirname(os.path.abspath(__file__))
APX = "/Users/soohyeon/Documents/2608-yonsei_renewal/book"
SEC = re.compile(r"^(어휘|문법\s*\d?|과제\s*\d?|읽기|듣기|말하기|쓰기)$")
CH = re.compile(r"^제\s*(\d{1,2})\s*과$")
NUM = re.compile(r"^(\d{1,2})\)$")


def head(t):
    return next((l.strip() for l in t.split("\n") if l.strip()), "")


def parse(book):
    gp = GlobalPdf(f"{APX}/(최종본)연세글로벌한국어_{book}급_부록-최종(26.8.10).pdf")
    pages = [p for p in range(1, len(gp) + 1) if head(gp.text(p)) == "모범 답안"]
    out = []
    ch = sec = None
    buf, num = [], None

    def flush():
        if num is not None and buf:
            s = re.sub(r"\s+", " ", " ".join(buf)).strip(" .,")
            if s:
                out.append(dict(book=book, chapter=ch, section=sec, no=num, answer=s))

    for p in pages:
        for line in gp.text(p).split("\n"):
            s = line.strip()
            if not s or s == "모범 답안" or "indb" in s or "연세" in s or "부록" in s:
                continue
            if re.match(r"^\d{4}-\d{2}-\d{2}", s) or re.fullmatch(r"[\d\s|]+", s):
                continue
            m = CH.match(s)
            if m:
                flush(); buf, num = [], None
                ch, sec = int(m.group(1)), None
                continue
            if SEC.match(s):
                flush(); buf, num = [], None
                sec = re.sub(r"\s+", " ", s)
                continue
            m = NUM.match(s)
            if m:
                flush(); buf = []
                num = int(m.group(1))
                continue
            if num is not None:
                buf.append(s)
    flush()
    return out


def main():
    rows = []
    for b in range(1, 9):
        r = parse(b)
        rows += r
        chs = len({x["chapter"] for x in r if x["chapter"]})
        print(f"  {b}급 답 {len(r):4d}개 · 과 {chs}개")
    with open(f"{HERE}/verify/answer_key.csv", "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=["book", "chapter", "section", "no", "answer"])
        wr.writeheader()
        wr.writerows(rows)
    print(f"\n총 {len(rows)}개 -> verify/answer_key.csv")
    print("\n표본 (2급 5과)")
    for x in rows:
        if x["book"] == 2 and x["chapter"] == 5:
            print(f"   [{x['section']}] {x['no']}) {x['answer'][:56]}")


if __name__ == "__main__":
    main()
