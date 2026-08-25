#!/usr/bin/env python3
"""매니페스트의 라벨 컬럼만 다시 계산한다 (이미지는 재렌더링하지 않음).

바뀐 점: span 단위 → 낱자 단위.
  - vocab_label : 그림 폭 안, 바로 아래에 '낱말 하나'가 가운데 놓인 경우만.
                  어휘 박스 그림의 단어 라벨이 이것이다.
  - band_text   : 그림 아래 띠 전체 텍스트. 큰 장면 삽화 밑의 '낱말 상자'
                  (예: 2급 3과 35쪽 '기다리다 앉다 가르치다 쓰다 읽다 오다')가
                  여기 잡힌다. 개별 그림 라벨은 아니지만 그 과의 학습 어휘라
                  버리지 않고 따로 남긴다.

기존 label_below는 이 둘을 못 갈라서, 낱말 상자와 옆 칸 라벨이 섞여 들어왔다.
"""
import os, sys, csv, re
import fitz
from global_text import GlobalPdf

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "/Users/soohyeon/Documents/2606-yonsei3week_parse"
BAND = 26          # 그림 아래 라벨 띠 높이(pt)
CENTER_TOL = 0.34  # 낱말 중심이 그림 중심에서 폭의 이 비율 안에 있어야 라벨로 본다
MAX_THUMB = 240    # 이보다 넓으면 어휘 썸네일이 아니라 장면 삽화로 본다
PHRASE_GAP = 0.8   # 어절 공백(≈0.27)은 잇고, 칸 간격(≈2.7)은 끊는 경계
HANGUL = re.compile(r"[가-힣]")
ORDINAL = re.compile(r"[0-9]+[.)]?|[①-⑳❶-❿➀-➓]")
ORDINAL_HEAD = re.compile(r"^\s*(?:[0-9]+\s*[.)]?|[①-⑳❶-❿➀-➓])\s*")


def global_pdf(b):
    return f"{BASE}/(최종본)연세글로벌한국어_{b}급_본교재-최종(26.8.10).pdf"


def band_rect(r, dy0=0, dy1=BAND):
    return fitz.Rect(r.x0 - 4, r.y1 + dy0, r.x1 + 4, r.y1 + dy1)


def char_w(text, rect):
    return rect.width / max(len(text), 1)


def vocab_label(toks, r):
    """어휘 박스 그림의 단어 라벨만 골라낸다. 아니면 빈 문자열.

    거르는 것:
      - 큰 장면 삽화(폭 240pt 초과) — 그 아래 텍스트는 낱말 상자다
      - 낱말 사이 간격이 넓은 것 — '기다리다   앉다   가르치다'(낱말 상자)나
        '강남 | 지하철 40분'(표 칸)은 라벨이 아니다
      - 그림 중심에서 벗어나 놓인 것 — 옆 칸 라벨
    통과시키는 것:
      - 한 낱말('가방')과, 좁은 간격으로 붙은 구 단위('쓰레기를 배출하다')
    """
    if r.width > MAX_THUMB:
        return ""
    if any("|" in t or "｜" in t for t, _ in toks):
        return ""
    # 앞머리 번호(1. / ① / ❶ / 1)) 는 라벨이 아니다
    toks = [(t, rr) for t, rr in toks if not ORDINAL.fullmatch(t)]
    kor = [(t, rr) for t, rr in toks if HANGUL.search(t)]
    if not kor:
        return ""
    line = {round((rr.y0 + rr.y1) / 2 / 6) for _, rr in kor}
    if len(line) > 1:
        return ""
    # 어절 공백(≈0.27)으로 이어진 동안만 한 라벨로 합친다.
    # 낱말 상자·표 칸 간격(≈2.7)이 끼면 라벨이 아니다.
    keep = [kor[0]]
    for t, rr in kor[1:]:
        pt, pr = keep[-1]
        if rr.x0 - pr.x1 <= char_w(pt, pr) * PHRASE_GAP:
            keep.append((t, rr))
        else:
            return ""
    text = " ".join(t for t, _ in keep)
    text = ORDINAL_HEAD.sub("", text).strip()
    if not HANGUL.search(text):
        return ""
    cx = (keep[0][1].x0 + keep[-1][1].x1) / 2
    if abs(cx - (r.x0 + r.x1) / 2) > r.width * CENTER_TOL:
        return ""
    return text


def relabel(b):
    gp = GlobalPdf(global_pdf(b))
    path = f"{HERE}/manifest_b{b}.csv"
    rows = list(csv.DictReader(open(path)))
    tok_cache = {}

    for row in rows:
        pno = int(row["pdf_page"])
        r = fitz.Rect(float(row["x0"]), float(row["y0"]),
                      float(row["x0"]) + float(row["w"]),
                      float(row["y0"]) + float(row["h"]))
        key = (pno, row["filename"])
        toks = gp.tokens_in(pno, band_rect(r))
        tok_cache[key] = toks

        band = " ".join(t for t, _ in toks if t.strip())
        row["vocab_label"] = vocab_label(toks, r)
        row["band_text"] = band

    fields = [f for f in rows[0] if f not in ("label_below", "label_above")]
    fields = fields[:fields.index("md5")] + ["md5"] if "md5" in fields else fields
    order = ["filename", "book", "chapter", "ch_kind", "ch_title", "pdf_page", "idx",
             "x0", "y0", "w", "h", "vocab_label", "band_text", "text_cover", "md5"]
    with open(path, "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=order, extrasaction="ignore")
        wr.writeheader()
        wr.writerows(rows)

    v = sum(1 for x in rows if x["vocab_label"])
    bd = sum(1 for x in rows if x["band_text"] and not x["vocab_label"])
    print(f"[{b}급] {len(rows)}장 | 어휘라벨 {v} | 낱말상자·기타 띠텍스트 {bd}")


if __name__ == "__main__":
    for b in [int(x) for x in sys.argv[1:]] or range(1, 9):
        relabel(b)
