# -*- coding: utf-8 -*-
"""과별 누적 허용 문법 — 교재 '● 문법' 목록을 출처로 한다.

왜 새로 만드는가. 프롬프트의 제약 블록은 급 단위로 손으로 쓴 일반론이어서
**그 과의 목표 문법을 스스로 금지하는** 충돌이 있었다:
  - 1급 [허용 표현]에 1-13 '-고 싶다', 1-15 '에게', 1-14 '과/와' 가 없다
  - 2급 [금지 문법]이 '-을 수 있다'(2-14 목표)를 제한, '-으니까'(2-13 목표)를 자제
  - 2급 [금지 어휘]가 '뵙다'를 금지하는데 2-1 어휘이고 듣기가 '처음 뵙겠습니다'로 연다
규칙 6이 "레벨 제약과 충돌하는 문법은 사용하지 않습니다" 이므로, AI는 그 과의
목표 문법을 쓰지 말라는 지시를 받고 있었다.

출처는 `grammar_syllabus.json` — 구판 본교재의 과 첫 쪽 '● 문법' 을 뽑은 것이다.
신판과 1~8급 전량 대조해 **문법 항목은 두 판이 동일함**을 확인했다(신판 PDF는
CID가 깨져 직접 읽기 어렵고, 구판이 같은 내용을 깨끗하게 준다).
`문법목록` 시트는 쓰지 않는다 — 이형태를 병합해 두었고 1-13 '-고 싶다' 가 빠졌다.
"""
import json, os, re

_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "grammar_syllabus.json")


def _items(raw):
    """교재 표기 한 줄을 개별 문법으로 쪼갠다."""
    out = []
    for part in str(raw).split(","):
        part = part.strip()
        if not part:
            continue
        # '-을까요? -으십시오' 처럼 한 칸 띄고 둘이 붙은 것만 쪼갠다.
        # '에 있다', '에서 ~까지' 는 뒤가 '-' 로 시작하지 않으므로 안 쪼개진다.
        for x in re.split(r"\s+(?=-)", part):
            x = re.sub(r"^-\s+", "-", x.strip())          # '- 을 수 있다' → '-을 수 있다'
            x = re.sub(r"(?<=[가-힣?\)])\d$", "", x)      # '-어요1' → '-어요' (용법 번호)
            if x and re.search(r"[가-힣ㄱ-ㅎ]", x):
                out.append(x)
    return out


def load():
    """{(권, 과): [문법, ...]} 을 돌려준다."""
    raw = json.load(open(_PATH, encoding="utf-8"))
    per = {}
    for bk, chs in raw.items():
        for ch, lines in chs.items():
            got = []
            for ln in lines:
                for x in _items(ln):
                    if x not in got: got.append(x)
            per[(int(bk), int(ch))] = got
    return per


def cumulative(per, book, chapter):
    """이 과까지 배운 문법(앞선 권 전체 + 이 권의 이 과까지)."""
    out = []
    for (b, c), items in sorted(per.items()):
        if b < book or (b == book and c <= chapter):
            for x in items:
                if x not in out: out.append(x)
    return out


def upcoming(per, book, chapter, n=5):
    """바로 다음에 배울 문법 — '아직 배우지 않은 것' 예시로 쓴다.

    ⚠️ 이미 배운 것은 뺀다. 같은 표기가 앞 과에도 나오는 경우가 있어서
    (3-2 '-는데' 가 3-14·3-15에 다시 나오는 등) 그대로 두면 허용 목록에 있는 문법을
    '쓰지 마세요' 로 함께 내보내는 자기모순이 생긴다.
    """
    known = set(cumulative(per, book, chapter))
    out = []
    for (b, c), items in sorted(per.items()):
        if (b == book and c > chapter) or b > book:
            for x in items:
                if x not in known and x not in out: out.append(x)
            if len(out) >= n: break
    return out[:n]


if __name__ == "__main__":
    per = load()
    for b, c in [(1, 4), (1, 13), (1, 15), (2, 1), (2, 6), (2, 13), (2, 14), (2, 15)]:
        cu = cumulative(per, b, c)
        print(f"{b}-{c:02d} 누적 {len(cu)}개: {', '.join(cu)}")
        print(f"        다음: {', '.join(upcoming(per, b, c))}")
