#!/usr/bin/env python3
"""links.csv를 받아 문항 ID 파일명으로 정리한 사본을 만든다.

  by_item/VL-1-4-001__안녕하다.png      어휘 원장
  by_item/WQ-1-6-001__볼펜.png          그림 보고 단어 고르기
  by_item/LC-6-1-005_s1__하숙집.png     듣기 선택지 그림

파일명에 단어를 함께 박는 이유: ID만 있으면 사람이 폴더에서 눈으로 못 고른다.
앱에서는 ID 앞부분만 쓰면 되고, 검수할 때는 단어가 보인다.
한 그림이 여러 문항에 쓰이면(어휘원장+단어퀴즈) 각각 사본을 만든다 —
앱이 조인 없이 바로 집어가게.

산출: by_item/*.png, image_map.csv
"""
import os, csv, shutil, re, collections

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = f"{HERE}/images"
DST = f"{HERE}/by_item"


def safe(w):
    """파일명에 쓸 수 있게 단어 다듬기."""
    w = re.sub(r"\s+", "_", str(w or "").strip())
    return re.sub(r"[^\w가-힣_-]", "", w)[:24]


def main():
    if os.path.isdir(DST):
        shutil.rmtree(DST)
    os.makedirs(DST)

    rows = [r for r in csv.DictReader(open(f"{HERE}/links.csv")) if r["filename"]]
    out, missing = [], []
    seen = collections.Counter()
    for r in rows:
        src = f"{SRC}/b{r['book']}/{r['filename']}"
        if not os.path.exists(src):
            missing.append(r)
            continue
        item = r["item_id"].replace("#", "_")
        base = f"{item}__{safe(r['word'])}" if r["word"] else item
        seen[base] += 1
        if seen[base] > 1:                      # 같은 ID가 두 번 나오면 구분
            base = f"{base}_{seen[base]}"
        name = base + ".png"
        shutil.copyfile(src, f"{DST}/{name}")
        out.append(dict(item_id=r["item_id"], sheet=r["sheet"], book=r["book"],
                        chapter=r["chapter"], word=r["word"],
                        asset=r["filename"], item_file=name,
                        matched_by=r["how"], legacy=r["legacy"]))

    with open(f"{HERE}/image_map.csv", "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=["item_id", "sheet", "book", "chapter", "word",
                                           "asset", "item_file", "matched_by", "legacy"])
        wr.writeheader()
        wr.writerows(out)

    per_asset = collections.Counter(o["asset"] for o in out)
    reused = sum(1 for v in per_asset.values() if v > 1)
    print(f"by_item/ 에 {len(out)}개 생성 (원본 자산 {len(per_asset)}장, 재사용 {reused}장)")
    if missing:
        print(f"원본 파일 없음 {len(missing)}건")
    print(f"매핑표: {HERE}/image_map.csv")


if __name__ == "__main__":
    main()
