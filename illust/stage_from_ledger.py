#!/usr/bin/env python3
"""원장이 실제로 참조하는 (급, 파일명)을 직접 읽어 스테이징한다.

stage_images.stage() 는 links.csv 를 읽는데, links.csv 는 build_catalog.py가
만든다. 그런데 build_catalog.py는 원장의 image 칸이 **구 3주완성판 파일명**일
때만(legacy_key 정규식) 좌표 매칭을 한다 — 지금 원장은 이미 재배선이 끝나
전부 새 글로벌 파일명이 들어 있어서, 이번에 다시 돌리면 좌표 매칭이 전멸하고
라벨 매칭만 남아(576→563장으로 줄어든 이유) 잘못된 축소가 생긴다.

build_catalog.py 는 "구 파일명 → 새 파일명" 최초 이관에나 맞는 일회성
도구였다 — 이미 이관이 끝난 지금 다시 돌리면 안 된다. 대신 원장이 지금
그대로 들고 있는 새 파일명을 100dpi든 600dpi든 상관없이 그대로 다시
렌더링해서 얹는다. 파일명 자체는 DPI 와 무관하게 안정적이다(감지는 좌표
공간에서 하고 DPI 는 저장 시점에만 쓴다) — 재추출 후 603개 참조 중 601개가
그대로 이름이 맞았다(나머지 2건은 fix_shifted_and_wrong.py 로 손으로 정리).

산출: app/public/textbook/{book}/{filename}.jpg (덮어쓰기)
"""
import json
import os

from PIL import Image

ROOT = "/Users/soohyeon/Documents/2608-yonsei_renewal"
APP = f"{ROOT}/app/src/shared/data"
SRC = os.path.dirname(os.path.abspath(__file__)) + "/images"
PUBLIC = f"{ROOT}/app/public/textbook"
MAX_SIDE = 720
QUALITY = 85


def needed():
    wl = json.load(open(f"{APP}/n1_word_list.json"))
    wq = json.load(open(f"{APP}/n1_word_quiz.json"))
    lr = json.load(open(f"{APP}/n3_listen_repeat.json"))
    out = set()
    for x in wl:
        if x.get("image"):
            out.add((x["book_id"], x["image"]))
    for x in wq:
        if x.get("image"):
            out.add((x["book_id"], x["image"]))
    for x in lr:
        for i in (1, 2, 3, 4):
            f = x.get(f"selection{i}_image")
            if f:
                out.add((x["book_id"], f))
    return out


def main():
    need = needed()
    written = 0
    missing = []
    for book, fn in sorted(need):
        png = fn.replace(".jpg", ".png")
        src = f"{SRC}/b{book}/{png}"
        if not os.path.exists(src):
            missing.append((book, fn))
            continue
        dst_dir = f"{PUBLIC}/{book}"
        os.makedirs(dst_dir, exist_ok=True)
        im = Image.open(src).convert("RGB")
        im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        im.save(f"{dst_dir}/{fn}", "JPEG", quality=QUALITY)
        written += 1
    total = sum(os.path.getsize(f"{PUBLIC}/{b}/{fn}")
                for b, fn in need if os.path.exists(f"{PUBLIC}/{b}/{fn}"))
    print(f"참조 {len(need)}개 중 저장 {written}개 (총 {total/1e6:.1f}MB)")
    if missing:
        print(f"소스 없음 {len(missing)}건:")
        for b, fn in missing:
            print(f"  {b} {fn}")


if __name__ == "__main__":
    main()
