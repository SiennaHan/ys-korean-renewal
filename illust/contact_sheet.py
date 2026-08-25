#!/usr/bin/env python3
"""검수용 컨택트시트를 만든다.

일부러 '정답 단어'를 시트에 찍지 않는다. 단어를 보여 주면 그림이 그 단어로
보이기 마련이라(앵커링), 먼저 그림만 보고 무엇인지 적은 뒤에 정답과 대조해야
'그림이 단어를 실제로 표현하는가'를 판정할 수 있다.

사용법: python contact_sheet.py [급 ...]
산출:  sheets/b{급}_{n}.png   +  sheets/b{급}_key.csv (번호 -> 자산·정답단어)
"""
import os, sys, csv, collections
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
COLS, ROWS = 5, 6
CELL, PAD, HDR = 230, 12, 34
FONT = "/System/Library/Fonts/Supplemental/AppleSDGothicNeo.ttc"


def font(sz):
    try:
        return ImageFont.truetype(FONT, sz)
    except Exception:
        return ImageFont.load_default()


def sheets_for(book, items):
    per = COLS * ROWS
    out = []
    for start in range(0, len(items), per):
        chunk = items[start:start + per]
        W = COLS * (CELL + PAD) + PAD
        H = ROWS * (CELL + PAD + HDR) + PAD
        sheet = Image.new("RGB", (W, H), "white")
        d = ImageDraw.Draw(sheet)
        for k, (no, path) in enumerate(chunk):
            cx = PAD + (k % COLS) * (CELL + PAD)
            cy = PAD + (k // COLS) * (CELL + PAD + HDR)
            d.rectangle([cx, cy, cx + CELL, cy + CELL], outline="#cccccc")
            try:
                im = Image.open(path).convert("RGB")
                im.thumbnail((CELL - 8, CELL - 8))
                sheet.paste(im, (cx + (CELL - im.width) // 2,
                                 cy + (CELL - im.height) // 2))
            except Exception as e:
                d.text((cx + 8, cy + 8), f"ERR {e}", fill="red", font=font(12))
            d.text((cx + 6, cy + CELL + 4), f"#{no}", fill="black", font=font(24))
        out.append(sheet)
    return out


def main(books):
    os.makedirs(f"{HERE}/sheets", exist_ok=True)
    rows = list(csv.DictReader(open(f"{HERE}/image_map.csv")))
    for b in books:
        seen, items, key = {}, [], []
        for r in rows:
            if int(r["book"]) != b or r["asset"] in seen:
                continue
            seen[r["asset"]] = True
            words = sorted({x["word"] for x in rows if x["asset"] == r["asset"] and x["word"]})
            ids = [x["item_id"] for x in rows if x["asset"] == r["asset"]]
            no = len(items) + 1
            items.append((no, f"{HERE}/images/b{b}/{r['asset']}"))
            key.append(dict(no=no, book=b, chapter=r["chapter"], asset=r["asset"],
                            claimed_word=" / ".join(words), item_ids=" ".join(ids),
                            matched_by=r["matched_by"]))
        for i, s in enumerate(sheets_for(b, items), 1):
            s.save(f"{HERE}/sheets/b{b}_{i}.png")
        with open(f"{HERE}/sheets/b{b}_key.csv", "w", newline="") as f:
            wr = csv.DictWriter(f, fieldnames=["no", "book", "chapter", "asset",
                                               "claimed_word", "item_ids", "matched_by"])
            wr.writeheader()
            wr.writerows(key)
        print(f"{b}급: {len(items)}장 -> sheets/b{b}_1..{(len(items) - 1) // (COLS * ROWS) + 1}.png")


if __name__ == "__main__":
    main([int(x) for x in sys.argv[1:]] or list(range(1, 9)))
