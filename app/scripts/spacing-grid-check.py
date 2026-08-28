#!/usr/bin/env python3
"""간격이 4의 배수 눈금 위에 있는지 본다.

왜 있나 — 2026-08-28 에 기획자가 "간격은 웬만하면 4의 배수" 로 정했고
(`DESIGN.md` 의 「정해야 할 물음」 5-b), 그날 166곳을 스냅했다. **글로만 두면
다음 사람이 다시 7px 을 적는다** — 이 저장소는 그 방식으로 여러 번 낡았다.
그래서 축을 센다.

무엇을 세나 — 게임 밖 CSS 의 `gap` · `padding` · `margin` 의 px 값.
4의 배수가 아니면 걸린다.

면제 — 리듬이 아니라 **광학 보정**인 자리:
  · 1px · 2px : 아이콘 정렬 · 머리카락 선. 4로 올리면 눈에 띈다
  · 파형 막대 간격 : 막대 사이 간격이 곧 그림이다(.wave · .record-wave · .jamo-tabs)

게임은 범위 밖이다 — `DESIGN.md` §0 이 왜인지 적었다.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STYLES = ROOT / "src" / "styles"
SKIP_FILES = {"game.css", "vocashot.css"}
# 셀렉터에 이 조각이 있으면 넘어간다. 이유는 위 독스트링에 있다.
EXEMPT_SEL = ("record-wave", ".wave", "jamo-tabs")
# 이 값 이하는 광학 보정으로 본다
OPTICAL_MAX = 2


def main() -> int:
    bad: list[str] = []
    checked = 0
    for css in sorted(STYLES.glob("*.css")):
        if css.name in SKIP_FILES:
            continue
        text = css.read_text()
        for rule in re.finditer(r"([^{}]+)\{([^}]*)\}", text):
            sel, body = " ".join(rule.group(1).split()), rule.group(2)
            if any(e in sel for e in EXEMPT_SEL):
                continue
            for pm in re.finditer(
                r"(?<![-a-z])(gap|padding|margin)(-[a-z]+)?:\s*([^;}\n]+)", body
            ):
                prop = pm.group(1) + (pm.group(2) or "")
                for tok in re.findall(r"(\d+)px", pm.group(3)):
                    n = int(tok)
                    checked += 1
                    if n % 4 == 0 or n <= OPTICAL_MAX:
                        continue
                    bad.append(f"{css.name}  {prop}: {n}px  —  {sel[:64]}")

    print(f"간격 값 {checked}개를 봤다 (게임 제외)")
    for line in bad:
        print(f"  [눈금 밖] {line}")
    if bad:
        print(
            f"\n실패 — {len(bad)}곳이 4의 배수가 아니다.\n"
            "     가장 가까운 4의 배수로 옮겨라(같은 거리면 내림 — 375px 틀이라\n"
            "     넓히는 쪽이 위험하다). 광학 보정이라 그대로 둬야 하면\n"
            "     scripts/spacing-grid-check.py 의 EXEMPT_SEL 에 이유를 적어라."
        )
        return 1
    print("전부 4의 배수 눈금 위에 있다")
    return 0


if __name__ == "__main__":
    sys.exit(main())
