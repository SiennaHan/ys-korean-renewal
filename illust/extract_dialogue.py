#!/usr/bin/env python3
"""대조에서 걸린 과의 신판 본문·과제1 대화를 화자·턴 단위로 뽑는다.

신판 지면 구조: 화자 이름이 왼쪽 열에 따로 놓이고 발화가 오른쪽에 온다.
그래서 화자 이름 줄과 발화 줄을 y로 짝지어 턴을 만든다.

n3 듣기 대본이 없으므로 듣기 연동 문항은 여기서 다루지 않는다.

사용법: python extract_dialogue.py
산출:  verify/new_dialogue.csv  (급, 과, 쪽, 순번, 화자, 발화)
"""
import os, csv, re, json, collections
from global_text import GlobalPdf

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = "/Users/soohyeon/Documents/2606-yonsei3week_parse"
OUT = f"{HERE}/verify"

# 2~8급 전 과. 처음에는 '잔재가 잡힌 과'만 봤는데, 그러면 대화가 통째로
# 바뀌었는데도 턴이 다른 쪽에서 우연히 발견돼 '유지'로 분류된 과(4급 10과)를
# 놓친다. 검사 대상을 좁히는 것 자체가 거짓 음성의 원인이었다.
TARGETS = [(b, ch) for b in range(2, 9) for ch in range(1, 16)]

SPEAKER = re.compile(r"^(영주|은주|유리|마이클|슈테판|샤오밍|나오코|치에|왕밍|유카|"
                     r"마크|링링|제임스|민수|지나|친구|직원|가|나|남자|여자|"
                     r"[가-힣]{2,4}\s*(씨|부장|과장|선생님|사장))$")
# 6급 PDF는 인쇄 관리 푸터의 글자가 두 번씩 찍혀 'indb'가 'iinnddbb'로 나온다.
# 그래서 각 글자가 한 번 또는 두 번 나올 수 있게 써 둔다.
NOISE = re.compile(r"MP3|ii?nn?dd?bb?|^\d+$|^2{1,2}0{1,2}\d|"
                   r"연세\s*글로벌|^제\s*\d+\s*과|과제\s*\d|^어휘$")


COL_GAP = 34    # 이만큼 벌어지면 다른 단(어휘 글로스 열)으로 본다


def line_items(gp, pno, tol=4):
    """(y, x0, 텍스트) 조각 목록.

    어휘 글로스는 본문 오른쪽에 별도 단으로 놓이고, 본문 줄과 같은 y에 걸린다.
    x 고정 임계로 자르면 본문 줄 끝까지 같이 잘려 나가므로(8급 1과 t1에서
    '회사 눈치'가 사라졌다), 줄 안에서 x가 크게 벌어지는 지점으로 단을 나눈다.
    """
    rows = {}
    for ch, r in gp.chars(pno):
        if ch.isspace():
            continue
        rows.setdefault(round((r.y0 + r.y1) / 2 / tol), []).append((r, ch))

    out = []
    for key in sorted(rows):
        chars = sorted(rows[key], key=lambda t: t[0].x0)
        seg, prev = [], None
        for r, ch in chars:
            if prev is not None and r.x0 - prev.x1 > COL_GAP:
                out.append(_join(seg))
                seg = []
            seg.append((r, ch))
            prev = r
        if seg:
            out.append(_join(seg))
    return out


def _join(seg):
    """조각의 (y, x0, 텍스트). 어절 간격에서 공백을 넣는다."""
    txt, prev = "", None
    for r, ch in seg:
        if prev is not None and r.x0 - prev.x1 > max(r.width, prev.width) * 0.15:
            txt += " "
        txt += ch
        prev = r
    y = (seg[0][0].y0 + seg[0][0].y1) / 2
    return (y, seg[0][0].x0, txt)


def dialogue_on(gp, pno):
    """[(화자, 발화)] — 들여쓰기로 턴을 가른다.

    턴 첫 줄은 왼쪽 끝(x≈125)에서 시작하고 '화자 발화…' 형태이며,
    이어지는 줄은 한 칸 더 들여쓴다(x≈164). 어휘 글로스 열은 본문과 같은
    y에 놓여 섞이므로 x로 먼저 잘라낸다.
    """
    lines = [(y, x, t.strip()) for y, x, t in line_items(gp, pno)
             if t.strip() and not NOISE.search(t.strip()) and x < 400]
    lines.sort()
    if not lines:
        return []
    # 기준 x를 '가장 왼쪽'으로 잡으면 인쇄 관리 푸터 같은 잡동사니에 끌려간다
    # (6급은 푸터 글자가 두 번씩 찍혀 'iinnddbb'가 되어 필터를 빠져나갔다).
    # 화자 이름으로 시작하는 줄들의 최빈 x를 쓴다.
    cand = collections.Counter(
        round(x) for _, x, t in lines
        if len(t.split(" ", 1)) == 2 and SPEAKER.fullmatch(t.split(" ", 1)[0]))
    if not cand:
        return []
    start_x = cand.most_common(1)[0][0]
    turns, cur_sp, buf = [], None, []
    for y, x, t in lines:
        if abs(x - start_x) <= 4:                 # 턴 첫 줄
            parts = t.split(" ", 1)
            if len(parts) == 2 and SPEAKER.fullmatch(parts[0]):
                if cur_sp and buf:
                    turns.append((cur_sp, " ".join(buf)))
                cur_sp, buf = parts[0], [parts[1]]
                continue
        if cur_sp:
            buf.append(t)
    if cur_sp and buf:
        turns.append((cur_sp, " ".join(buf)))
    return turns


def gloss_on(gp, pno):
    """어휘 글로스 열(x>420)의 낱말 목록 — 신판 그 과의 실제 학습 어휘."""
    out = []
    for _, x, t in line_items(gp, pno):
        t = t.strip()
        if x >= 400 and t and not NOISE.search(t) and re.search(r"[가-힣]", t):
            out.append(t)
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    rows = []
    for b, ch in TARGETS:
        gp = GlobalPdf(f"{BASE}/(최종본)연세글로벌한국어_{b}급_본교재-최종(26.8.10).pdf")
        toc = json.load(open(f"{BASE}/work/book{b}/toc.json"))
        a, z = toc["ranges"][str(ch)]
        seq = 0
        for pno in range(a, min(z, len(gp)) + 1):
            for sp, ko in dialogue_on(gp, pno):
                if len(ko) < 6:
                    continue
                seq += 1
                rows.append(dict(book=b, chapter=ch, pdf_page=pno, seq=seq,
                                 speaker=sp, ko=ko, kind="대화"))
            for g in gloss_on(gp, pno):
                rows.append(dict(book=b, chapter=ch, pdf_page=pno, seq="",
                                 speaker="", ko=g, kind="글로스어휘"))
    with open(f"{OUT}/new_dialogue.csv", "w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=["book", "chapter", "pdf_page",
                                           "seq", "speaker", "ko", "kind"])
        wr.writeheader()
        wr.writerows(rows)
    d = [r for r in rows if r["kind"] == "대화"]
    print(f"신판 대화 {len(d)}턴 + 글로스어휘 {len(rows)-len(d)}개 -> {OUT}/new_dialogue.csv")
    per = {}
    for r in d:
        per[(r["book"], r["chapter"])] = per.get((r["book"], r["chapter"]), 0) + 1
    for k in sorted(per):
        print(f"  {k[0]}급 {k[1]:>2}과: {per[k]}턴")


if __name__ == "__main__":
    main()
