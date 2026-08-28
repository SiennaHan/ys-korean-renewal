#!/usr/bin/env python3
"""토큰 값을 리터럴로 다시 적어 둔 자리를 찾는다.

왜 있나 — `tokens.css` 는 스스로 이렇게 정해 두었다:
"화면 코드는 semantic 만 쓴다. primitive 를 화면에서 직접 쓰는 것은 예외 취급한다."
**그런데 안 지켜지고 있었다.** 2026-08-28 기준 토큰화된 CSS 셋에 hex 63개가 있었고
그중 **28개가 primitive 토큰 값의 정확한 복제**였다(`#a2d1ff` = blue-100 꼴).

복제가 왜 나쁜가 — 브랜드 파랑을 바꾸면 `tokens.css` 한 줄만 고치면 된다는 것이
2단 구조의 값어치인데, **복제된 자리는 안 따라온다.** 조용히 두 색이 된다.

무엇을 세나 — 게임 밖 CSS 에서 `#hex` 를 찾아 `tokens.css` 의 primitive 값과
견준다. 같으면 걸린다 — `var(--color-…)` 로 가리키라는 뜻이다.

**토큰 밖 색은 안 센다.** 그것은 다른 물음이다(팔레트에 없는 색을 쓸지) —
`DESIGN.md` 의 「정해야 할 물음」에 따로 있다.

게임은 범위 밖이다 — `DESIGN.md` §0 이 왜인지 적었다.
"""

import re
import sys
from pathlib import Path

STYLES = Path(__file__).resolve().parent.parent / "src" / "styles"
SKIP_FILES = {"game.css", "vocashot.css", "tokens.css"}


def primitives() -> dict[str, str]:
	"""hex → primitive 변수 이름"""
	text = (STYLES / "tokens.css").read_text()
	out: dict[str, str] = {}
	for m in re.finditer(r"(--color-primitive-[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8});", text):
		out[m.group(2).lower()] = m.group(1)
	return out


def norm(hex_str: str) -> str:
	"""`#fff` 을 `#ffffff` 로. 안 맞추면 같은 색을 다른 값으로 센다."""
	h = hex_str.lower()
	return "#" + "".join(c * 2 for c in h[1:]) if len(h) == 4 else h


def main() -> int:
	prim = primitives()
	if not prim:
		print("★ tokens.css 에서 primitive 를 하나도 못 읽었다 — 검사가 무의미하다")
		return 1

	bad: list[str] = []
	total = 0
	for css in sorted(STYLES.glob("*.css")):
		if css.name in SKIP_FILES:
			continue
		# 주석은 뺀다 — 사고 기록에 옛 hex 가 적혀 있는 것은 사실 기록이다
		clean = re.sub(r"/\*.*?\*/", "", css.read_text(), flags=re.S)
		for lineno, line in enumerate(clean.split("\n"), 1):
			for h in re.findall(r"#[0-9a-fA-F]{3,8}\b", line):
				total += 1
				n = norm(h)
				if n in prim:
					bad.append(
						f"{css.name}:{lineno}  `{h}` 는 {prim[n]} 와 같다 — "
						f"`var({prim[n]})` 나 그것을 가리키는 semantic 을 써라\n"
						f"      {line.strip()[:76]}"
					)

	print(f"토큰화된 CSS 의 hex {total}개를 봤다 (게임·tokens.css 제외)")
	for line in bad:
		print(f"  [토큰 복제] {line}")
	if bad:
		print(
			f"\n실패 — {len(bad)}곳이 토큰 값을 리터럴로 다시 적었다.\n"
			"     tokens.css 가 정한 규칙이다 — 화면 코드는 semantic 만 쓴다.\n"
			"     쓸 semantic 이 없으면 tokens.css 에 이름을 붙여라\n"
			"     (2026-08-28 에 --color-background-subtle 이 그렇게 생겼다)."
		)
		return 1
	print("토큰 값을 리터럴로 적은 자리 없다")
	return 0


if __name__ == "__main__":
	sys.exit(main())
