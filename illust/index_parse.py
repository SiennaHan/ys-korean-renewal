#!/usr/bin/env python3
"""신판 부록 <어휘 색인>을 읽어 '단어 → 과' 표를 만든다.

색인은 교재가 스스로 밝힌 어휘 배정이라 우리 원장과 맞대 볼 정본이 된다.
과 첫 쪽 목록이 갱신 누락으로 못 믿을 물건이었던 것과 달리, 색인은 책 전체를
훑어 만든 것이라 훨씬 낫다.

형식이 급별로 다르다.
  1~5급  가게14과새어휘      (새어휘/주제어휘/과제어휘/문법어휘)
  6~8급  가능하다8과과제3     (어휘/대화/문법/과제1~3)

공백이 없어 '단어'와 '분류'가 붙어 나오므로, 'N과' 를 기준점으로 잡고
그 뒤에 오는 분류를 알려진 목록으로 떼어 낸 나머지를 다음 단어로 본다.

산출: verify/index_vocab.csv
"""
import os, re, csv, collections, unicodedata
from global_text import GlobalPdf, _is_broken

HERE = os.path.dirname(os.path.abspath(__file__))
APX = "/Users/soohyeon/Documents/2608-yonsei_renewal/book"

# 긴 것부터 — '과제어휘'가 '과제'로 잘리면 안 된다.
# 7급은 '과제 어휘'처럼 사이가 떠 있어 공백을 허용해야 한다.
CATS = ["주제 ?어휘", "과제 ?어휘", "문법 ?어휘", "새 ?어휘",
        "과제 ?[123]", "과제", "어휘", "대화", "문법", "읽기", "듣기"]
CAT_RE = "|".join(CATS)
ENTRY = re.compile(rf"(\d{{1,2}})과\s*({CAT_RE})")


def head(t):
    return next((l.strip() for l in t.split("\n") if l.strip()), "")


def index_text(gp):
    """<어휘 색인> 구간의 글자만 이어 붙인다. 문법색인 앞에서 끊는다."""
    buf = []
    for p in range(1, len(gp) + 1):
        t = gp.text(p)
        if head(t) != "색인":
            continue
        # 쪽 머리·판권·자모 표제는 버린다
        for line in t.split("\n"):
            s = line.strip()
            if not s or s == "색인" or re.fullmatch(r"[\d\s.]*", s):
                continue
            if re.fullmatch(r"[ㄱ-ㅎ]", s) or "indb" in s or "연세" in s or "부록" in s:
                continue
            # 쪽 하단 판권 날짜. 안 거르면 다음 쪽 첫 낱말에 들러붙는다
            if re.match(r"\d{4}-\d{2}-\d{2}", s) or re.fullmatch(r"[|·\s]+", s):
                continue
            buf.append(s)
    whole = "".join(buf)
    a = whole.find("어휘색인")
    if a < 0:
        a = whole.find("어휘 색인")
    b = whole.find("문법색인")
    if b < 0:
        b = whole.find("문법 색인")
    whole = whole[a:] if a >= 0 else whole
    if b > a >= 0:
        whole = whole[: b - a]
    return re.sub(r"^<?어휘\s*색인>?", "", whole).strip()


def parse(txt):
    """[(단어, 과, 분류)] — 'N과분류' 사이의 글자가 다음 단어."""
    out, dropped = [], 0
    prev_end = 0
    for m in ENTRY.finditer(txt):
        word = txt[prev_end:m.start()]
        word = re.sub(r"[\s·]+", " ", word).strip().strip("<>,|")
        prev_end = m.end()
        if not word:
            continue
        # 복원 못 한 글자가 남은 낱말은 대조에 쓸 수 없다
        if any(_is_broken(ch) for ch in word):
            dropped += 1
            continue
        out.append((word, int(m.group(1)), m.group(2)))
    return out, prev_end, len(txt), dropped


def main():
    rows = []
    print(f"{'':4s}{'항목':>6s}{'낱말':>6s}  {'소진율':>7s}  분류")
    for b in range(1, 9):
        gp = GlobalPdf(f"{APX}/(최종본)연세글로벌한국어_{b}급_부록-최종(26.8.10).pdf")
        txt = index_text(gp)
        ent, used, total, dropped = parse(txt)
        loose = len(re.findall(r'\d{1,2}과', txt)) - len(ent) - dropped
        cats = collections.Counter(re.sub(r"\s+", "", c) for _, _, c in ent)
        for w, ch, c in ent:
            rows.append(dict(book=b, word=w, chapter=ch,
                             cat=re.sub(r"\s+", "", c)))
        print(f"{b}급 {len(ent):6d}{len({w for w,_,_ in ent}):6d}  "
              f"{used/max(total,1):6.1%}  깨짐제외 {dropped:3d}  분류밖 {loose:3d}")

    with open(f"{HERE}/verify/index_vocab.csv", "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=["book", "word", "chapter", "cat"])
        wr.writeheader()
        wr.writerows(rows)
    print(f"\n-> verify/index_vocab.csv ({len(rows)}건)")


if __name__ == "__main__":
    main()
