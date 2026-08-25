#!/usr/bin/env python3
"""글로벌 신판과 3주완성 구판을 쪽 단위로 전수 대조한다.

1급은 이미 이 방식으로 대조가 끝났고(글로벌_교재기반_콘텐츠_v1_changelog),
여기서는 2~8급으로 확장한다. 두 판은 판형·쪽수·과 구성이 같아서 같은
쪽번호끼리 비교하면 된다.

신판 텍스트는 global_text가 폰트를 복원해 읽는다. 구판은 그대로 읽힌다.

노이즈로 빼는 것 (내용 변경이 아니다):
  - 책 제목 띠      : '3주완성 연세 한국어 N' vs '연세 글로벌 한국어 N'
  - 인쇄 관리 정보  : '...indb', 날짜/시각 도장, 'QR추가'
  - 음원 표기 전면 교체 : 'CD 12' → 'MP3_12' / QR
  - 원문자 스타일   : ➊ vs ❶
  - 쪽번호 단독 줄

사용법: python compare_editions.py [급 ...]
산출:  diff/b{급}_pages.csv   쪽별 변경 요약
       diff/b{급}_segments.csv 변경 구간(구판 문장 → 신판 문장)
"""
import os, sys, csv, re, json, difflib, unicodedata
import fitz
from global_text import GlobalPdf, _is_broken as _broken

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "/Users/soohyeon/Documents/2606-yonsei3week_parse"
OUT = f"{HERE}/diff"

NOISE = [
    re.compile(r"\[?QR ?추가\]?"),
    re.compile(r"\S*\.indb.*"),
    re.compile(r"20\d\d[-.]\d\d[-.]\d\d"),
    re.compile(r"오[전후]\s*\d+:\d+:\d+"),
    re.compile(r"(3주완성\s*)?연세\s*(글로벌\s*)?한국어\s*\d?"),
    re.compile(r"\bCD\s*\d+\b", re.I),
    re.compile(r"\bMP3[_ ]?\d*\b", re.I),
    re.compile(r"\bTrack\s*\d+\b", re.I),
]
CIRCLED = {c: str(i + 1) for i, c in enumerate("➊➋➌➍➎➏➐➑➒➓")}
CIRCLED.update({c: str(i + 1) for i, c in enumerate("❶❷❸❹❺❻❼❽❾❿")})
CIRCLED.update({c: str(i + 1) for i, c in enumerate("①②③④⑤⑥⑦⑧⑨⑩")})


def ordered_spans(doc, pno, gp=None):
    """읽기 순서(위→아래, 좌→우)로 정렬한 span 텍스트 목록.

    양쪽 PDF를 같은 경로(get_texttrace)로 뽑아야 추출 방식 차이가 상쇄된다.
    신판은 공백 글리프 없이 좌표로 자간을 잡아서 '60년이상을한국어...'처럼
    붙어 나오고, 줄바꿈 위치도 구판과 다르다. 그래서 비교 단계에서 공백을
    전부 제거한다 — 한국어는 공백 없이도 문장 단위 비교가 된다.
    """
    page = doc[pno - 1]
    out = []
    for sp in page.get_texttrace():
        chars = sp["chars"]
        if not chars:
            continue
        if gp is not None:
            txt = "".join(
                (gp._decoder(sp["font"])(c[1]) or chr(c[0]))
                if _broken(chr(c[0])) and gp._decoder(sp["font"]) else chr(c[0])
                for c in chars)
        else:
            txt = "".join(chr(c[0]) for c in chars)
        ys = [c[3][1] for c in chars]
        xs = [c[3][0] for c in chars]
        out.append((round(min(ys) / 6), min(xs), txt))
    out.sort()
    return [t for _, _, t in out]


def clean(text):
    """비교용 정규화. 내용이 아닌 차이를 없앤다."""
    text = unicodedata.normalize("NFC", text)
    text = "".join(CIRCLED.get(c, c) for c in text)
    for pat in NOISE:
        text = pat.sub(" ", text)
    text = text.replace("​", "").replace("\xa0", " ")
    return text


def sentences(spans):
    """비교 단위: 문장부호로 끊은 조각. 공백은 전부 제거한다.

    공백을 남기면 신구판 자간·줄바꿈 차이가 그대로 '변경'으로 잡힌다.
    """
    text = clean(" ".join(spans))
    text = re.sub(r"\s+", "", text)
    out = []
    for part in re.split(r"(?<=[.?!。])", text):
        part = part.strip()
        part = "" if re.fullmatch(r"\d+", part) else part      # 쪽번호 단독
        if len(part) >= 3:
            out.append(part)
    return out


def compare_book(b):
    gp = GlobalPdf(f"{BASE}/(최종본)연세글로벌한국어_{b}급_본교재-최종(26.8.10).pdf")
    old = fitz.open(f"{BASE}/{b}_yonsei3week_main.pdf")
    toc = json.load(open(f"{BASE}/work/book{b}/toc.json"))
    ranges = {int(k): v for k, v in toc["ranges"].items()}
    ch_of = {}
    for ch, (a, z) in ranges.items():
        for p in range(a, z + 1):
            ch_of[p] = ch
    titles = toc.get("titles", {})

    n = min(len(gp), old.page_count)
    first = min(a for a, _ in ranges.values())      # 1과 시작 쪽
    pages, segs = [], []
    for pno in range(first, n + 1):
        new_s = sentences(ordered_spans(gp.doc, pno, gp))
        old_s = sentences(ordered_spans(old, pno))
        sm = difflib.SequenceMatcher(a=old_s, b=new_s, autojunk=False)
        ratio = sm.ratio()
        changed = 0
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag == "equal":
                continue
            o = " / ".join(old_s[i1:i2])
            w = " / ".join(new_s[j1:j2])
            if not o and not w:
                continue
            changed += max(i2 - i1, j2 - j1)
            segs.append(dict(book=b, chapter=ch_of.get(pno, ""), pdf_page=pno,
                             kind={"replace": "수정", "delete": "삭제(구판만)",
                                   "insert": "추가(신판만)"}[tag],
                             old=o[:400], new=w[:400]))
        pages.append(dict(book=b, chapter=ch_of.get(pno, ""),
                          ch_title=titles.get(str(ch_of.get(pno, "")), ""),
                          pdf_page=pno, old_lines=len(old_s), new_lines=len(new_s),
                          similarity=round(ratio, 3), changed_units=changed))

    os.makedirs(OUT, exist_ok=True)
    with open(f"{OUT}/b{b}_pages.csv", "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=list(pages[0]))
        wr.writeheader()
        wr.writerows(pages)
    with open(f"{OUT}/b{b}_segments.csv", "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=["book", "chapter", "pdf_page",
                                           "kind", "old", "new"])
        wr.writeheader()
        wr.writerows(segs)

    idn = sum(1 for p in pages if p["changed_units"] == 0)
    heavy = [p for p in pages if p["similarity"] < 0.8]
    print(f"[{b}급] {len(pages)}쪽 | 완전 동일 {idn} | 유사도<0.8 {len(heavy)}쪽 | "
          f"변경 구간 {len(segs)}건")
    return pages, segs


if __name__ == "__main__":
    books = [int(x) for x in sys.argv[1:]] or list(range(2, 9))
    tot = 0
    for b in books:
        _, s = compare_book(b)
        tot += len(s)
    print(f"\n총 변경 구간 {tot}건 -> {OUT}/")
