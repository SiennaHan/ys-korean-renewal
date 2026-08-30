#!/usr/bin/env python3
"""문항이 지문 없이 풀리는지 — 기계로 잡히는 자리만 센다.

왜 있나 — 2026-08-30 에 기획자가 「글쓴이는 다문화 가정을 사회의 한 일원으로
받아들이는 태도가 필요하다고 보았다」 O/X 를 보고 말했다: **설마 안 받아들이는
게 답이겠나.** 무조건 좋은 말을 고르면 맞는 문제였다.

그 잣대로 표본 8개를 **지문 없이** 풀어 보니 7개를 맞혔다(무작위면 2개).
원인은 오답 쪽이었다 — 부정문이거나 배타 표지가 붙어 지문을 안 보고도 지워졌다.

무엇을 세나 — 셋이다. **다 잡지는 못한다**(아래 「못 잡는 것」).
  ① 오답이 전부 부정문이고 정답만 긍정문      → 긍정문 하나 고르면 맞는다
  ② 배타 표지(~만 · ~해야만)가 오답에만 있다   → 표지가 곧 오답 표시다
  ③ O/X 의 완화어(-기도 하다)가 **전부 O 로 쏠렸는지** — 낱개는 안 틀렸다.
     쏠린 것이 문제다. 2026-08-30 실측에서 읽기 일곱 개가 전부 O 였다

**못 잡는 것 — 이게 대부분이다.** 「의미적으로 그럴듯한 것 고르기」는 규칙으로
안 잡힌다. 그건 사람이 **지문을 가리고 풀어 보는 수밖에 없다** —
`docs/G1_content_gate_v1.html` 의 저작 절차 절에 그 방법을 적어 두었다.

오탐 두 자리를 조심한다 — 실제로 두 번 걸렸다:
  · 「칠**만** 원」 · 「십**만** 원」  → 수를 세는 만
  · 「비싸지**만** 좋다」            → 연결어미 -지만
"""

import json
import re
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "src" / "shared" / "data"
SETS = [("읽기", "n5_read_answer_questions.json"), ("듣기", "n3_listen_repeat.json")]

# 「아닌 것 · 다른 것」을 고르는 문두는 **오답이 지문 인용**이다. 지문에 「필요한
# 만큼만 산다」가 있으면 오답에도 그대로 나온다 — 배타 표지가 오답 표시가 아니다.
NEGATIVE_STEM = re.compile(r"아닌 것|다른 것|알 수 없는")

# 낱개로 봐준다. 이유를 적는다 — 이유 없는 면제는 검사를 조용히 갉는다.
ALLOW = {
    ("듣기", 414): "정답이 「자르고+염색」이고 오답이 「커트만」·「염색만」이다. "
                   "배타 표지가 오답 표시가 아니라 **부분과 전체를 가르는 장치**다 — "
                   "대본을 들어야 둘 다인지 하나인지 안다",
    ("읽기", 36): "1급 조합형 — 맛있다/맛없다 × 맵다/안 맵다 네 조합을 다 두는 설계다. "
                  "부정문이 오답 표시가 아니라 두 정보를 각각 확인하게 하는 장치다",
}

NEG = re.compile(r"않|없|못|아니|안 [가-힣]")
# 배타 표지 「~만」. 정규식 하나로는 못 가른다 — 아래 세 가지가 섞여 있다:
#   ① 배타     「매표소에서만」 「한국어를 잘해야만」   ← 잡을 것
#   ② 수사      「칠만 원」 「이만 원」                ← 오탐. 만(萬)이다
#   ③ 연결어미  「비싸지만 좋다」 「갔지만 못 만나서」   ← 오탐. -지만이다
# ②③ 을 실제로 두 번 밟았다(2026-08-30). 그래서 함수로 가른다.
_NUM = "일이삼사오육칠팔구십백천"
_MAN = re.compile(r"(\S*?)만(?=[ .?!]|$|을|이|으로|에)")


def exclusive(text: str) -> str | None:
    """배타 표지가 있으면 그 조각을, 없으면 None."""
    for m in _MAN.finditer(text or ""):
        head = m.group(1)
        if not head:
            continue
        if head.endswith("지"):          # -지만
            continue
        if head[-1] in _NUM or head[-1].isdigit():   # 칠만 · 2만
            continue
        if head.endswith("오랜"):        # 오랜만에 — 한 낱말이다
            continue
        return m.group(0)
    for w in ("해야만", "에게만", "으로만", "에서만", "만큼만"):
        if w in (text or ""):
            return w
    return None
HEDGE = re.compile(r"기도 하|기도 한|수도 있|경우도 있")


def statement(q):
    m = re.search(r"'([^']+)'", q.get("question") or "")
    return m.group(1) if m else (q.get("question") or "")


def main() -> int:
    bad = []
    hedged: dict[str, list] = {}
    seen = 0
    for label, fname in SETS:
        rows = json.loads((DATA / fname).read_text())
        for q in rows:
            sels = [q.get(f"selection{i}") or "" for i in range(1, 5)]
            sels = [s for s in sels if s]
            a = q.get("answer_index")
            if a is None or a >= len(sels):
                continue
            seen += 1
            wrong = [s for i, s in enumerate(sels) if i != a]
            if (label, q["id"]) in ALLOW:
                continue
            stem_neg = bool(NEGATIVE_STEM.search(q.get("question") or ""))
            if q.get("type") == "choice" and len(wrong) >= 2 and not stem_neg:
                if all(NEG.search(s) for s in wrong) and not NEG.search(sels[a]):
                    bad.append(f"[오답만 부정문] {label} id={q['id']} — 긍정문 하나를 고르면 맞는다\n"
                               f"      정답: {sels[a][:52]}")
                hit = [s for s in wrong if exclusive(s)]
                if hit and not exclusive(sels[a]):
                    bad.append(f"[배타 표지가 오답에만] {label} id={q['id']} — 「~만」이 곧 오답 표시다\n"
                               f"      {hit[0][:60]}")
            if q.get("type") == "ox" and HEDGE.search(statement(q)):
                hedged.setdefault(label, []).append((q["id"], a))

    # ③ 완화어 O/X 는 **쏠림**으로 본다 — 낱개는 안 틀렸다
    for label, items in hedged.items():
        if len(items) < 4:
            continue
        o = sum(1 for _, a in items if a == 1)
        if o == len(items):
            bad.append(
                f"[완화어가 전부 O] {label} — 「-기도 하다」가 붙은 O/X {len(items)}개가 **모두 O** 다\n"
                f"      id={[i for i, _ in items]}\n"
                f"      완화어를 보면 O 를 찍으면 된다는 규칙이 생겼다. 일부는 지문이 더 강하게\n"
                f"      말하거나 아예 다른 말을 해서 **X 가 되게** 섞어라"
            )

    print(f"문항 {seen}개를 봤다 (읽기 · 듣기)")
    for line in bad:
        print(f"  {line}")
    if bad:
        print(
            f"\n실패 — {len(bad)}곳이 지문 없이 풀린다.\n"
            "     오답을 **긍정문**으로 두고 **지문의 구체 사실과 어긋나게** 바꿔라 —\n"
            "     교통편 · 순서 · 값 · 시각 · 인물 역할처럼 읽어야만 아는 것.\n"
            "     오답이 「나쁜 말」이라 틀리면 안 된다. 지문이 다른 말을 해서 틀려야 한다.\n"
            "     **이 검사가 통과해도 안심하지 마라** — 「그럴듯한 것 고르기」는 못 잡는다.\n"
            "     표본 열 개를 지문 가리고 풀어 봐라(G1_content_gate_v1 의 저작 절차 절)."
        )
        return 1
    print("기계로 잡히는 새는 자리 없다 — 「그럴듯한 것 고르기」는 사람이 봐야 한다")
    return 0


if __name__ == "__main__":
    sys.exit(main())
