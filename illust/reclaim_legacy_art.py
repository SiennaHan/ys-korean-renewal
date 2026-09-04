#!/usr/bin/env python3
"""겹치는 삽화는 옛 3주완성 PDF에서 다시 뽑는다 — 그쪽이 진짜 300~400+ PPI다.

발단: 글로벌판 PDF에 박힌 삽화가 실측 150~200 PPI 뿐이었다(사용자 지적으로
확인). 그런데 옛 3주완성 PDF의 같은 자리 그림은 300~400+ PPI다 — 직접 대조해
보니 가방·수첩·지갑·티슈·연필·펜·지우개 등 **글씨체까지 완전히 같은 그림**이었다.
"삽화는 전부 새로 그렸다"(2026-08-14 메모)는 본문 대화 장면에는 맞지만,
낱말 그림 격자(사물 아이콘류)는 그대로 재사용된 경우가 있다.

방법: 원장의 change_note 에 재배선 이력이 "구파일명 -> 신파일명" 형태로
남아 있다(apply_images.py 가 적었다). 구파일명은 옛 3주완성 PDF에서 뽑은
파일 — work/book{b}/images_manifest.csv 에 좌표가 있다. change_note 가 없는
것은 book_offset() 으로 좌표를 거꾸로 찾는다.

**같은 그림인지는 추측하지 않고 직접 대조한다** — 둘을 64x64 그레이스케일로
줄여 상관계수를 본다. 임계값(0.90) 이상만 "같은 그림"으로 보고 옛 PDF에서
600dpi로 다시 뽑아 바꿔치기한다. 못 미치면 그리다 만 것(장면 재편집·완전
redraw)일 수 있으니 새 글로벌판 것을 그대로 둔다 — 틀린 그림을 넣느니
지금 화질이 낫다.

산출: app/public/textbook/{book}/{filename}.jpg (품질 통과분만 덮어쓰기)
      reclaim_report.csv (판정 기록 — 재검토용)
"""
import csv
import json
import os
import re
import sys

import fitz
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_catalog import book_offset, find_by_bbox, load_legacy

ROOT = "/Users/soohyeon/Documents/2608-yonsei_renewal"
OLD_PDF = "/Users/soohyeon/Documents/2606-yonsei3week_parse/{n}_yonsei3week_main.pdf"
APP = f"{ROOT}/app/src/shared/data"
PUBLIC = f"{ROOT}/app/public/textbook"
HERE = os.path.dirname(os.path.abspath(__file__))
MAX_SIDE = 720
QUALITY = 85
SIM_THRESHOLD = 0.65
PAD = 1.5

# 44건 남은 "유사도 낮음" 을 육안으로 표본 확인했다 — 대부분 진짜 다른 사진/그림
# 이었다(같은 개념을 다른 스톡사진으로 바꿔 찍었거나, 격자 위치가 살짝 밀려
# 옆 칸을 문 경우). 딱 하나, VL-1-8-014(남동생 초상)만 같은 그림인데 임계값에
# 걸렸다 — 여기만 수동으로 강제 포함한다. 나머지 43건은 전수 확인 전이라
# 그대로 새 글로벌판을 유지한다(추측으로 바꾸느니 낮은 화질이 낫다).
FORCE_INCLUDE = {"VL-1-8-014"}


def needed():
    """{(book, 신파일명): item_id} — 어느 항목이 이 그림을 쓰는지도 같이."""
    wl = json.load(open(f"{APP}/n1_word_list.json"))
    wq = json.load(open(f"{APP}/n1_word_quiz.json"))
    out = {}
    for x in wl:
        if x.get("image"):
            out.setdefault((x["book_id"], x["image"]), []).append((x["item_id"], x.get("change_note", "")))
    for x in wq:
        if x.get("image"):
            out.setdefault((x["book_id"], x["image"]), []).append((x["item_id"], x.get("change_note", "")))
    return out


def parse_old_name(change_note):
    m = re.search(r"재배선\((\S+)\s*->|재배선\((\S+)\s*→", change_note)
    if not m:
        return None
    return (m.group(1) or m.group(2)).strip()


def new_manifest_rows(book):
    rows = list(csv.DictReader(open(f"{HERE}/manifest_b{book}.csv")))
    for r in rows:
        for k in ("pdf_page", "x0", "y0", "w", "h"):
            r[k] = int(r[k])
    return rows


def similarity(im_a, im_b):
    """색상 히스토그램 교집합 — 정렬(크롭 위치·비율) 어긋남에 강하다.

    처음엔 64x64 그레이스케일 픽셀 상관계수를 썼는데, 옛/신 크롭 박스가
    정확히 안 맞아떨어지는 경우가 흔해서(옛 매니페스트 좌표가 딱 맞지 않음)
    같은 그림인데도 상관계수가 낮게 나왔다 — 확인해 보니 확실히 같은
    "휴지" 그림이 0.69, 확실히 다른 "편의점" 그림이 0.37로 겹쳤다.
    히스토그램 교집합은 같은 셋(같은 팔레트로 그린 그림)은 0.84~0.94,
    다른 그림은 0.56 대로 뚜렷이 갈라져서 이걸로 바꿨다.
    """
    def hist(im):
        arr = np.asarray(im.convert("RGB").resize((96, 96)), dtype=np.float64).reshape(-1, 3) / 255.0
        idx = (arr * 7.999).astype(int)
        h = np.zeros((8, 8, 8))
        for r, g, b in idx:
            h[r, g, b] += 1
        h = h.flatten()
        return h / h.sum()
    return float(np.minimum(hist(im_a), hist(im_b)).sum())


def main():
    need = needed()
    by_book = {}
    for (book, fn), uses in need.items():
        by_book.setdefault(book, []).append((fn, uses))

    report = []
    swapped = skipped_low_sim = skipped_no_old = skipped_no_new_row = 0

    for book in sorted(by_book):
        legacy = load_legacy()  # 8권 전체를 읽지만 book_offset 은 해당 권만 쓴다
        new_rows = new_manifest_rows(book)
        offset = book_offset(new_rows, legacy, book)
        old_pdf = fitz.open(OLD_PDF.format(n=book))
        new_by_fn = {r["filename"]: r for r in new_rows}

        for fn, uses in by_book[book]:
            item_ids = [u[0] for u in uses]
            notes = [u[1] for u in uses]
            new_row = new_by_fn.get(fn.replace(".jpg", ".png"))
            if not new_row:
                skipped_no_new_row += 1
                continue

            old_name = None
            for note in notes:
                old_name = parse_old_name(note)
                if old_name:
                    break

            old_row = None
            if old_name and old_name in legacy:
                L = legacy[old_name]
                if L["book"] == book:
                    old_row = L
            if old_row is None:
                # change_note 가 없거나 안 맞으면 좌표로 거꾸로 찾는다
                # find_by_bbox 는 pdf_page 키를 쓰는데 legacy 행은 page 다 — 여기서만 맞춰 준다
                legacy_as_new = [{**L, "pdf_page": L["page"]} for L in legacy.values() if L["book"] == book]
                hit = find_by_bbox(legacy_as_new, new_row["pdf_page"],
                                    new_row["x0"], new_row["y0"], new_row["w"], new_row["h"],
                                    off=(-offset[0], -offset[1]))
                if hit:
                    old_row = hit

            if old_row is None:
                skipped_no_old += 1
                report.append([book, fn, item_ids, "", "", "옛 PDF에 대응 위치 없음"])
                continue

            new_png = f"{HERE}/images/b{book}/{fn.replace('.jpg', '.png')}"
            if not os.path.exists(new_png):
                continue
            new_im = Image.open(new_png).convert("RGB")

            clip = fitz.Rect(old_row["x0"] - PAD, old_row["y0"] - PAD,
                              old_row["x0"] + old_row["w"] + PAD, old_row["y0"] + old_row["h"] + PAD)
            page = old_pdf[old_row["page"] - 1]
            pix = page.get_pixmap(clip=clip & page.rect, dpi=600)
            old_im = Image.open(__import__("io").BytesIO(pix.tobytes("png"))).convert("RGB")

            sim = similarity(new_im, old_im)
            old_label = old_name or f"bbox@p{old_row['page']}"
            forced = bool(FORCE_INCLUDE & set(item_ids))
            if sim < SIM_THRESHOLD and not forced:
                skipped_low_sim += 1
                report.append([book, fn, item_ids, old_label, f"{sim:.3f}", "유사도 낮음(다른 그림으로 판단) — 새 글로벌판 유지"])
                continue

            dst_dir = f"{PUBLIC}/{book}"
            os.makedirs(dst_dir, exist_ok=True)
            im = old_im.copy()
            im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
            im.save(f"{dst_dir}/{fn}", "JPEG", quality=QUALITY)
            swapped += 1
            verdict = "옛 PDF로 교체(고화질, 수동 확정)" if forced else "옛 PDF로 교체(고화질)"
            report.append([book, fn, item_ids, old_label, f"{sim:.3f}", verdict])

    with open(f"{HERE}/reclaim_report.csv", "w", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(["book", "filename", "item_ids", "old_ref", "similarity", "판정"])
        for row in report:
            wr.writerow([row[0], row[1], ";".join(row[2]), row[3], row[4], row[5]])

    print(f"교체 {swapped} · 유사도 낮아 유지 {skipped_low_sim} · 옛 대응 없음 {skipped_no_old} · 신규행 없음 {skipped_no_new_row}")
    print(f"판정 상세: {HERE}/reclaim_report.csv")


if __name__ == "__main__":
    main()
