#!/usr/bin/env python3
"""연세글로벌한국어 본교재 PDF에서 삽화를 추출하고 매니페스트를 만든다.

글로벌 교재는 3주완성 대비 삽화가 새로 그려졌으므로 기존 자산을 못 쓴다.
본문 Rix* 폰트의 ToUnicode가 깨져 있는 건 global_text.GlobalPdf가
Adobe-Korea1 CID 표로 복원하므로, 라벨은 글로벌 PDF 자체에서 읽는다.

이미지 열거는 page.get_images()가 아니라 page.get_image_info()를 쓴다.
전자는 인라인 이미지(xref=0)와 중첩 XObject 배치를 놓쳐서, 예를 들어
1급 53쪽 '보기' 인물 8개가 통째로 빠진다.

저장은 임베드 원본 픽스맵이 아니라 '해당 영역 렌더링'이다. 그래야
소프트마스크·투명도·겹친 레이어가 지면에 보이는 대로 합성된다.

버리는 것:
  - 한 변 40pt 미만 (폰트 렌더링 부산물)
  - 페이지 90% 이상 덮는 배경
  - 좌상단 과 표시 리본(x1<320 & y0<105)과 하단 푸터(y0>740)의 장식 조각
  - 같은 자리 + 비슷한 크기로 겹친 중복 레이어(마스크·그림자)

사용법: python extract_global_images.py [book_no ...]
산출:  images/b{book}/b{book}_ch{ch}_p{page}_{idx}.png
       manifest_b{book}.csv
"""
import sys, os, csv, json, re, hashlib
import fitz
from global_text import GlobalPdf
from relabel import vocab_label, band_rect

BASE = "/Users/soohyeon/Documents/2606-yonsei3week_parse"
OUT = os.path.dirname(os.path.abspath(__file__))

MIN_SIDE = 40
BG_RATIO = 0.9
TAB_X, TAB_Y = 320, 105   # 좌상단 과 표시 리본/탭 — y0 기준(y1로 보면 첫 줄 삽화까지 먹는다)
FOOTER_Y = 740            # 쪽번호/책제목 띠
OVERLAP = 0.8             # 작은 쪽 면적의 80% 이상 겹치고
SIZE_SIM = 0.55           # 면적도 비슷해야 같은 그림의 중복 레이어로 본다
PAD = 1.5                 # 렌더 여백(pt) — 테두리 잘림 방지
DPI = 300


def global_pdf(b):
    return f"{BASE}/(최종본)연세글로벌한국어_{b}급_본교재-최종(26.8.10).pdf"


def same_artwork(a, b):
    """같은 그림에 겹쳐 깔린 마스크/그림자 레이어인가.

    '작은 쪽이 큰 쪽 안에 들어간다'만 보면 배경(세계지도 등) 위에 얹힌
    작은 썸네일까지 버리게 된다. 겹침 + 면적 유사도를 함께 본다.
    """
    ix = max(0.0, min(a.x1, b.x1) - max(a.x0, b.x0))
    iy = max(0.0, min(a.y1, b.y1) - max(a.y0, b.y0))
    aa, ab = a.get_area(), b.get_area()
    if not aa or not ab:
        return False
    return (ix * iy / min(aa, ab) > OVERLAP) and (min(aa, ab) / max(aa, ab) > SIZE_SIM)


def labels(gp, pno, r):
    """(어휘 라벨, 그림 아래 띠 전체 텍스트). 판정 규칙은 relabel.vocab_label 참조."""
    toks = gp.tokens_in(pno, band_rect(r))
    return vocab_label(toks, r), " ".join(t for t, _ in toks if t.strip())


def text_cover(gp, pno, r):
    """bbox 안을 글자가 얼마나 덮고 있는지 (0~1).

    삽화 뒤에 깔린 라벨 상자·설명 패널은 이 값이 높다. 거르지는 않고
    카탈로그에 남겨서 사람이 판단하게 한다.
    """
    area = r.get_area()
    if area <= 0:
        return 0.0
    covered = 0.0
    for txt, tr, _ in gp.spans(pno):
        if not txt.strip():
            continue
        inter = fitz.Rect(tr) & r
        if not inter.is_empty:
            covered += inter.get_area()
    return round(min(covered / area, 1.0), 3)


def placements(page):
    """페이지의 이미지 배치들 중 삽화 후보만. 큰 것부터 자리 잡고 중복 제거."""
    pw, ph = page.rect.width, page.rect.height
    cands = []
    for info in page.get_image_info(xrefs=True):
        r = fitz.Rect(info["bbox"]) & page.rect
        if r.is_empty or r.width < MIN_SIDE or r.height < MIN_SIDE:
            continue
        if r.width >= pw * BG_RATIO and r.height >= ph * BG_RATIO:
            continue
        if (r.x1 < TAB_X and r.y0 < TAB_Y) or r.y0 > FOOTER_Y:
            continue
        cands.append(r)
    cands.sort(key=lambda r: -r.get_area())
    kept = []
    for r in cands:
        if not any(same_artwork(r, k) for k in kept):
            kept.append(r)
    kept.sort(key=lambda r: (round(r.y0 / 10), r.x0))
    return kept


def extract_book(b):
    toc = json.load(open(f"{BASE}/work/book{b}/toc.json"))
    ranges = {int(k): v for k, v in toc["ranges"].items()}
    hangul = set(toc.get("hangul_chapters", []))
    titles = toc.get("titles", {})

    gp = GlobalPdf(global_pdf(b))
    img_dir = f"{OUT}/images/b{b}"
    os.makedirs(img_dir, exist_ok=True)

    rows = []
    for ch in sorted(ranges):
        a, z = ranges[ch]
        idx = 0
        for pno in range(a, min(z, len(gp)) + 1):
            page = gp.page(pno)
            for r in placements(page):
                idx += 1
                fname = f"b{b}_ch{ch}_p{pno}_{idx}.png"
                clip = fitz.Rect(r.x0 - PAD, r.y0 - PAD, r.x1 + PAD, r.y1 + PAD) & page.rect
                page.get_pixmap(clip=clip, dpi=DPI).save(os.path.join(img_dir, fname))
                rows.append([
                    fname, b, ch, "한글" if ch in hangul else "본문",
                    titles.get(str(ch), ""), pno, idx,
                    round(r.x0), round(r.y0), round(r.width), round(r.height),
                    *labels(gp, pno, r),
                    text_cover(gp, pno, r),
                    hashlib.md5(open(os.path.join(img_dir, fname), "rb").read()).hexdigest()[:12],
                ])

    man = f"{OUT}/manifest_b{b}.csv"
    with open(man, "w", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(["filename", "book", "chapter", "ch_kind", "ch_title",
                     "pdf_page", "idx", "x0", "y0", "w", "h",
                     "vocab_label", "band_text", "text_cover", "md5"])
        wr.writerows(rows)
    labeled = sum(1 for r in rows if r[11])
    print(f"[{b}급] 추출 {len(rows)}개 / 아래라벨 {labeled} -> {man}")
    return rows


if __name__ == "__main__":
    books = [int(x) for x in sys.argv[1:]] or list(range(1, 9))
    for b in books:
        extract_book(b)
