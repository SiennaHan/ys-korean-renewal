#!/usr/bin/env python3
"""changed_vocab 후보를 '추가할 어휘'와 '어휘 아닌 것'으로 분류한다.

후보는 '그림 아래 인쇄된 낱말'이라 대부분 실제 학습 어휘지만, 어휘 박스가
아닌 자리의 라벨도 섞인다. 실제로 섞여 있던 것들:
  - 문항 보기 라벨   : "'가' 식당", '여름 구두', '시험이 끝난 토요일'
  - 가격표          : '커피 4,000원', '반지 150,000원'
  - 등장인물 이름    : 슈테판, 마이클, 유카, 왕밍
  - 문법·발음 용어   : 피동, 사동, 자음동화
  - 잘린 문장 조각   : '물이 끓으면 떡', '나라마다 문'
분류 규칙을 코드에 남겨 두는 이유는, 나중에 2~8급 전수 대조 때 이 판단을
그대로 재검증할 수 있어야 하기 때문이다.

교재에 인쇄된 영어 뜻은 band_text에서 같이 뽑는다(직접 지어내지 않는다).

산출: vocab_review.csv
"""
import os, csv, re, collections

HERE = os.path.dirname(os.path.abspath(__file__))

# 교재 등장인물·실존 인물 (어휘 아님)
NAMES = {"슈테판", "마이클", "유카", "마크", "링링", "제임스", "치에", "왕밍",
         "유리", "영주", "샤오밍", "나오코", "제니", "루피", "태평", "범수",
         "스티븐 스필버그", "아인슈타인", "스티브잡스", "영수"}
# 문법·발음·시험 운영 용어 (어휘 시트 소관 아님)
TERMS = {"피동", "사동", "첨가", "자음동화", "듣기시험", "쓰기시험",
         "듣MP3", "영화 장르"}
# 관광지·지명 — 어휘로 넣을지는 기획 판단이라 '보류'로 뺀다
PLACES = {"인사동", "청계천", "명동", "N서울타워", "남대문 시장",
          "판문점, 공동경비구역", "한옥 마을", "술 박물관", "한옥 민박 집"}

PRICE = re.compile(r"[\d,]+\s*원")
QUOTED = re.compile(r"[‘’“”\"']")
# 조사·연결어미로 끝나면 문장 조각이다 (어휘는 기본형이나 명사로 끝난다)
FRAGMENT_END = re.compile(
    r"(은|는|이|가|을|를|에|에서|으로|로|와|과|하고|고|서|면|어서|여서|"
    r"부터|까지|보다|처럼|만|도|의|께|에게|한테|씨는|점수)$")
# 명사·기본형 어휘의 정상 종결
OK_END = re.compile(r"(다|기|음|것|중|용|형|성|화|물|실|장|점|원|관|소|"
                    r"방|집|차|표|증|券|법|식|체험|쓰기|만들기|배우기)$")


def classify(word):
    w = word.strip()
    if w in NAMES or any(n in w for n in NAMES):
        return "제외:인명"
    if w in TERMS:
        return "제외:문법·운영용어"
    if PRICE.search(w):
        return "제외:가격표"
    if QUOTED.search(w):
        return "제외:문항보기"
    if w in PLACES:
        return "보류:고유명사"
    if len(w) < 2 or "�" in w:
        return "제외:추출오류"
    # 잘려서 끝난 것: 조사로 끝나거나, 어절이 있는데 정상 종결이 아니다
    if FRAGMENT_END.search(w):
        return "제외:문장조각"
    if " " in w and not OK_END.search(w):
        return "제외:문장조각"
    return "추가후보"


EN = re.compile(r"[A-Za-z][A-Za-z'()\-/ ,.]*")


def english_gloss(band, word):
    """band_text에서 교재에 인쇄된 영어 뜻만 떼어낸다."""
    rest = band.replace(word, " ", 1)
    hits = [m.group(0).strip(" ,.") for m in EN.finditer(rest)]
    hits = [h for h in hits if len(h) > 2 and h.lower() not in ("mp", "qr")]
    return max(hits, key=len) if hits else ""


def main():
    band = {}
    for b in range(1, 9):
        for m in csv.DictReader(open(f"{HERE}/manifest_b{b}.csv")):
            band[m["filename"]] = m["band_text"]

    rows = [r for r in csv.DictReader(open(f"{HERE}/changed_vocab.csv"))
            if r["status"] == "엑셀에 없음"]
    out = []
    for r in rows:
        d = classify(r["book_word"])
        out.append(dict(book=r["book"], chapter=r["chapter"], ch_title=r["ch_title"],
                        word=r["book_word"], disposition=d,
                        en_in_book=english_gloss(band.get(r["asset"], ""), r["book_word"]),
                        pdf_page=r["pdf_page"], asset=r["asset"]))

    out.sort(key=lambda r: (r["disposition"] != "추가후보", int(r["book"]),
                            int(r["chapter"]), r["word"]))
    with open(f"{HERE}/vocab_review.csv", "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=["book", "chapter", "ch_title", "word",
                                           "disposition", "en_in_book",
                                           "pdf_page", "asset"])
        wr.writeheader()
        wr.writerows(out)

    c = collections.Counter(r["disposition"] for r in out)
    print(f"후보 {len(out)}건 분류:")
    for k, v in c.most_common():
        print(f"   {k:20s} {v}")
    add = [r for r in out if r["disposition"] == "추가후보"]
    withen = sum(1 for r in add if r["en_in_book"])
    print(f"\n추가후보 {len(add)}건 중 교재에 영어 뜻이 인쇄된 것 {withen}건")
    per = collections.Counter(int(r["book"]) for r in add)
    print("급별 추가후보:", dict(sorted(per.items())))
    print(f"-> {HERE}/vocab_review.csv")


if __name__ == "__main__":
    main()
