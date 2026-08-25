#!/usr/bin/env python3
"""각 과 첫 쪽의 '● 학습 목표 / ● 어휘 / ● 문법 / ● 과제' 목록을 뽑는다.

삽화 라벨보다 이게 훨씬 좋은 근거다. 교재가 그 과의 학습 어휘를 직접
목록으로 인쇄해 두었으므로, n1_word_list와 과 단위로 바로 맞대 볼 수 있다.

지면 구조: 라벨은 x≈226 열에, 내용은 x≈269 열에 있고, 내용이 여러 줄로
감기면 라벨 하나에 여러 줄이 붙는다. 그래서 내용 줄마다 '그 줄 위쪽에서
가장 가까운 라벨'을 찾아 붙인다.

사용법: python syllabus.py [급 ...]
산출:  syllabus.csv (급, 과, 항목, 값)
"""
import os, sys, csv, re, json
import fitz
from global_text import GlobalPdf

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "/Users/soohyeon/Documents/2606-yonsei3week_parse"
LABELS = ("학습 목표", "어휘", "문법", "과제")
LABEL_X = 265      # 이보다 왼쪽은 라벨 열, 오른쪽은 내용 열
LINE_TOL = 7


def global_pdf(b):
    return f"{BASE}/(최종본)연세글로벌한국어_{b}급_본교재-최종(26.8.10).pdf"


def lines_from(gp, pno, xmin=None, xmax=None):
    """(y, 텍스트) 줄 목록. 어절 간격으로 공백을 넣는다."""
    items = [(r, ch) for ch, r in gp.chars(pno) if not ch.isspace()
             and (xmin is None or r.x0 >= xmin) and (xmax is None or r.x1 <= xmax)]
    items.sort(key=lambda t: (round((t[0].y0 + t[0].y1) / 2 / LINE_TOL), t[0].x0))
    out, cur, cy, prev = [], "", None, None
    for r, ch in items:
        mid = (r.y0 + r.y1) / 2
        if cy is not None and abs(mid - cy) > LINE_TOL:
            out.append((cy, cur))
            cur, prev, cy = "", None, None          # 줄을 끊으면 기준 y도 새로
        if prev is not None and r.x0 - prev.x1 > max(r.width, prev.width) * 0.15:
            cur += " "
        cur += ch
        if cy is None:
            cy = mid
        prev = r
    if cur:
        out.append((cy, cur))
    return out


LABEL_HEAD = re.compile(r"^[●•\s]*(학습\s*목표|어휘|문법|과제)\s*")


def syllabus_for(gp, pno):
    """{항목: [줄, ...]}

    2~5급은 라벨과 내용이 같은 x에서 시작하고, 6~8급은 라벨 열과 내용 열이
    갈린다. 두 판형 모두 '라벨과 내용이 같은 줄'이라는 점은 같으므로,
    x로 나누지 않고 줄 앞머리의 라벨 이름을 떼어내는 방식으로 통일한다.
    """
    out, cur = {}, None
    for _, t in lines_from(gp, pno):
        t = t.strip()
        if not t or "MP3" in t or ".indb" in t or re.match(r"^\[?QR", t):
            continue
        m = LABEL_HEAD.match(t)
        if m:
            cur = re.sub(r"\s+", " ", m.group(1))
            cur = "학습 목표" if cur.startswith("학습") else cur
            out.setdefault(cur, [])
            rest = t[m.end():].strip()
            if rest:
                out[cur].append(rest)
        elif cur:
            out[cur].append(t)
    return out


SPLIT = re.compile(r"[,·]")


#  '수 관련 어휘', '동사', '형용사', '존대어' 등은 어휘가 아니라 묶음 이름이다
CATEGORY = re.compile(r"관련|어휘|표현|동사$|형용사$|존대어$|명사$|부사$|조사$")


def vocab_items(lines):
    """어휘 줄을 낱개 어휘로.

    어휘 줄이 감기면 그 아래 '● 문법' 줄까지 딸려 붙는다('음식, 2● 문법 -을까요?').
    줄 안에 ●가 나오면 그 앞까지만 어휘로 본다.
    """
    words, cats = [], []
    for ln in lines:
        ln = re.split(r"[●•]", ln)[0]
        for part in ln.split(" / "):
            part = part.strip()
            if not part:
                continue
            if CATEGORY.search(part) and len(SPLIT.split(part)) <= 4:
                cats.append(part)
                continue
            for w in SPLIT.split(part):
                w = re.sub(r"^\d+\s*|\s*\d+$", "", w).strip()
                if len(w) >= 2 and re.search(r"[가-힣]", w) and not CATEGORY.fullmatch(w):
                    words.append(w)
    return words, cats


def main(books):
    rows = []
    for b in books:
        gp = GlobalPdf(global_pdf(b))
        toc = json.load(open(f"{BASE}/work/book{b}/toc.json"))
        ranges = {int(k): v for k, v in toc["ranges"].items()}
        hangul = set(toc.get("hangul_chapters", []))
        got = 0
        for ch in sorted(ranges):
            if ch in hangul:
                continue
            first = ranges[ch][0]
            syl = {}
            for pno in (first, first + 1):      # 첫 쪽에 없으면 다음 쪽
                syl = syllabus_for(gp, pno)
                if syl.get("어휘"):
                    break
            if not syl.get("어휘"):
                rows.append(dict(book=b, chapter=ch, field="추출실패", value=""))
                continue
            got += 1
            words, cats = vocab_items(syl["어휘"])
            rows.append(dict(book=b, chapter=ch, field="어휘", value=", ".join(words)))
            if cats:
                rows.append(dict(book=b, chapter=ch, field="어휘분류", value=" / ".join(cats)))
            for f in ("학습 목표", "문법", "과제"):
                if syl.get(f):
                    rows.append(dict(book=b, chapter=ch, field=f,
                                     value=" / ".join(syl[f])))
        n = len([c for c in ranges if c not in hangul])
        print(f"{b}급: 본문 {n}과 중 {got}과에서 어휘 목록 추출")

    with open(f"{HERE}/syllabus.csv", "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=["book", "chapter", "field", "value"])
        wr.writeheader()
        wr.writerows(rows)
    print(f"-> {HERE}/syllabus.csv")


if __name__ == "__main__":
    main([int(x) for x in sys.argv[1:]] or list(range(1, 9)))
