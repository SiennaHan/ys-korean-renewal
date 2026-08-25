#!/usr/bin/env python3
"""어휘 추가 후보를 '라벨과 함께' 급별 시트로 묶는다.

앞서 단어 모양만으로 규칙을 세워 가르려다 실패했다.
'영화를 보다'의 '보다'가 비교 조사로 잡히고, 격자 크기도 '시10분'(격자 6)과
'흉몽'(격자 8)을 못 가른다. 어휘 박스인지 아닌지는 지면 구조를 봐야 안다.

그래서 이 시트는 판독용이 아니라 판정용이다. 여기서 보는 것은
"이 그림이 어휘 박스의 한 칸인가, 아니면 문항 보기·캡션인가" 하나다.
그래서 라벨을 일부러 함께 찍는다(삽화 검수 시트와 반대).

사용법: python vocab_sheets.py [급 ...]
산출:  vocab_sheets/b{급}_{n}.png
"""
import os, sys, csv, collections
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
COLS, ROWS = 4, 5
CELL, PAD, CAP = 250, 14, 52
FONT = "/System/Library/Fonts/Supplemental/AppleSDGothicNeo.ttc"


def font(sz, idx=0):
    try:
        return ImageFont.truetype(FONT, sz, index=idx)
    except Exception:
        return ImageFont.load_default()


def main(books):
    os.makedirs(f"{HERE}/vocab_sheets", exist_ok=True)
    rows = [r for r in csv.DictReader(open(f"{HERE}/vocab_review.csv"))
            if r["disposition"] in ("추가후보", "보류:고유명사")]
    by_book = collections.defaultdict(list)
    for r in rows:
        by_book[int(r["book"])].append(r)

    for b in books:
        items = sorted(by_book.get(b, []), key=lambda r: (int(r["chapter"]), r["word"]))
        if not items:
            continue
        per = COLS * ROWS
        for si, start in enumerate(range(0, len(items), per), 1):
            chunk = items[start:start + per]
            W = COLS * (CELL + PAD) + PAD
            H = ROWS * (CELL + PAD + CAP) + PAD + 34
            sheet = Image.new("RGB", (W, H), "white")
            d = ImageDraw.Draw(sheet)
            d.text((PAD, 8), f"{b}급 어휘 추가 후보  ({start + 1}–{start + len(chunk)}"
                             f" / {len(items)})", fill="black", font=font(20))
            for k, r in enumerate(chunk):
                cx = PAD + (k % COLS) * (CELL + PAD)
                cy = 34 + PAD + (k // COLS) * (CELL + PAD + CAP)
                d.rectangle([cx, cy, cx + CELL, cy + CELL], outline="#bbbbbb")
                try:
                    im = Image.open(f"{HERE}/images/b{b}/{r['asset']}").convert("RGB")
                    im.thumbnail((CELL - 8, CELL - 8))
                    sheet.paste(im, (cx + (CELL - im.width) // 2,
                                     cy + (CELL - im.height) // 2))
                except Exception as e:
                    d.text((cx + 8, cy + 8), f"ERR {e}", fill="red", font=font(11))
                d.text((cx + 4, cy + CELL + 3), f"{r['chapter']}과 {r['word']}",
                       fill="black", font=font(17))
                sub = f"p{r['pdf_page']}"
                if r["en_in_book"]:
                    sub += f"  ·  {r['en_in_book'][:26]}"
                d.text((cx + 4, cy + CELL + 26), sub, fill="#777777", font=font(13))
            sheet.save(f"{HERE}/vocab_sheets/b{b}_{si}.png")
        print(f"{b}급: {len(items)}건 -> vocab_sheets/b{b}_1..{si}.png")


if __name__ == "__main__":
    main([int(x) for x in sys.argv[1:]] or list(range(1, 9)))
