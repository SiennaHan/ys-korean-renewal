#!/usr/bin/env python3
"""정해진 디자인 값이 CSS 에서 실제로 그 값인지 본다.

왜 있나 — 2026-08-28 에 기획자가 일곱을 정했다(`DESIGN.md` 의 「정해야 할 물음」).
그 표는 각 줄에 "정하면 굳힐 방법: CSS 값 검사" 라고 적어 두고 있었는데
**그 검사가 없었다.** 값이 CSS 에 들어 있을 뿐이라, 누가 `.auth-primary` 를 다시
52px 로 되돌려도 게이트가 전부 통과했다. 결정이 조용히 풀리는 자리다.

무엇을 세나 — 아래 RULES 의 (파일 · 셀렉터 · 속성 · 정한 값)을 하나씩 찾아 견준다.
값이 `var(--d-btn-h, 56px)` 꼴이면 **폴백을 풀어서** 본다 — 그 폴백이 곧 정한 값이고,
변수는 개발 패널이 잠깐 덮어쓰는 통로일 뿐이다(`components/dev/design-decisions.tsx`).

**셀렉터를 못 찾으면 실패한다.** 이름이 바뀌었는데 검사만 조용히 통과하는 것이
이런 검사의 가장 흔한 고장이다 — 그러면 지키는 것이 없으면서 지킨다고 말하게 된다.

게임은 범위 밖이다 — `DESIGN.md` §0 이 왜인지 적었다.
"""

import re
import sys
from pathlib import Path

STYLES = Path(__file__).resolve().parent.parent / "src" / "styles"

# (파일, 셀렉터 정규식, 속성, 정한 값, 무엇인지)
# 셀렉터는 규칙 전체를 찾는 데 쓴다. `\b` 로 접미사가 붙은 이름(.chip3 .lk)에
# 걸리지 않게 한다.
RULES: list[tuple[str, str, str, str, str]] = [
	# 1 · 주 버튼 높이 56
	("activity.css", r"\.activity-frame \.primary\b", "height", "56px", "주 버튼 높이"),
	("auth.css", r"\.auth-primary,\s*\.auth-secondary", "min-height", "56px", "주 버튼 높이"),
	("nav.css", r"\.nav-frame \.paywall-cta\b(?!:)", "height", "56px", "주 버튼 높이"),
	# 2 · 버튼 · 선택지 · 입력칸 radius 12
	("activity.css", r"\.activity-frame \.primary\b", "border-radius", "12px", "주 버튼 radius"),
	("activity.css", r"\.activity-frame \.choice\b(?!-)", "border-radius", "12px", "선택지 radius"),
	("auth.css", r"\.auth-primary,\s*\.auth-secondary", "border-radius", "12px", "주 버튼 radius"),
	("auth.css", r"\.auth-input\b(?![-\w])", "border-radius", "12px", "입력칸 radius"),
	("nav.css", r"\.nav-frame \.paywall-cta\b(?!:)", "border-radius", "12px", "주 버튼 radius"),
	# 6 · 카드 radius 16
	("activity.css", r"\.activity-frame \.problem-card\b", "border-radius", "16px", "카드 radius"),
	("nav.css", r"\.nav-frame\b(?![-\w])", "--radius-card", "16px", "카드 radius(변수)"),
	# 7 · 칩 radius 8
	("activity.css", r"\.activity-frame \.chip-opt\b", "border-radius", "8px", "칩 radius"),
	("nav.css", r"\.nav-frame \.chip3\b(?![\s.])", "border-radius", "8px", "칩 radius"),
	# 8 · 앱바 높이 58
	("activity.css", r"\.activity-frame \.appbar\b", "flex", "58px", "앱바 높이"),
	("auth.css", r"\.auth-topbar\b(?!-)", "min-height", "58px", "앱바 높이"),
	# 2 · 컨트롤 radius 12 (내비가 변수로 쥔다)
	("nav.css", r"\.nav-frame\b(?![-\w])", "--radius-control", "12px", "컨트롤 radius(변수)"),
]

# 3 · 비활성은 **색 교체**다. 흐림(opacity)으로 되돌아가면 걸린다.
NO_OPACITY = [
	("auth.css", r"\.auth-primary:disabled", "인증 주 버튼"),
	("nav.css", r"\.nav-frame \.paywall-cta:disabled", "내비 페이월 CTA"),
]


def unwrap(value: str) -> str:
	"""`var(--x, 값)` 에서 폴백을 꺼낸다. 중첩도 푼다."""
	value = value.strip()
	while value.startswith("var("):
		inner = value[4 : value.rindex(")")]
		if "," not in inner:
			return value
		value = inner.split(",", 1)[1].strip()
	return value


def find_rule(text: str, sel_re: str) -> str | None:
	"""셀렉터가 든 규칙의 몸통. 못 찾으면 None"""
	for m in re.finditer(r"([^{}]+)\{([^}]*)\}", text):
		sel = " ".join(m.group(1).split())
		if re.search(sel_re, sel):
			return m.group(2)
	return None


def main() -> int:
	bad: list[str] = []
	missing: list[str] = []
	checked = 0

	for fname, sel_re, prop, want, what in RULES:
		text = (STYLES / fname).read_text()
		body = find_rule(text, sel_re)
		if body is None:
			missing.append(f"{fname}  {sel_re}  — 셀렉터를 못 찾았다")
			continue
		pm = re.search(re.escape(prop) + r"\s*:\s*([^;}]+)", body)
		if not pm:
			missing.append(f"{fname}  {sel_re}  — `{prop}` 선언이 없다")
			continue
		checked += 1
		# `flex:0 0 var(--d-appbar-h,58px)` 처럼 앞에 다른 값이 붙는다.
		# **먼저 var() 를 통째로 떼어 내야 한다** — 공백으로 자르면
		# `var(--d-btn-h, 56px)` 처럼 쉼표 뒤에 빈칸이 있는 꼴이 `56px)` 로 잘린다.
		raw = pm.group(1).strip()
		vm = re.search(r"var\((?:[^()]|\([^()]*\))*\)", raw)
		got = unwrap(vm.group(0) if vm else raw.split()[-1])
		if got != want:
			bad.append(f"{fname}  {what}: {prop} 이 `{got}` 다 — 정한 값은 `{want}`")

	for fname, sel_re, what in NO_OPACITY:
		text = (STYLES / fname).read_text()
		body = find_rule(text, sel_re)
		if body is None:
			missing.append(f"{fname}  {sel_re}  — 셀렉터를 못 찾았다")
			continue
		checked += 1
		om = re.search(r"opacity\s*:\s*([^;}]+)", body)
		if om and om.group(1).strip() not in ("1", "1.0"):
			bad.append(
				f"{fname}  {what} 비활성이 흐림(`opacity:{om.group(1).strip()}`)이다 "
				"— 정한 것은 색 교체다"
			)

	print(f"정해진 값 {checked}자리를 봤다 (게임 제외)")
	for line in missing:
		print(f"  [자리를 잃었다] {line}")
	for line in bad:
		print(f"  [값이 다르다] {line}")

	if missing:
		print(
			"\n실패 — 셀렉터가 바뀌었다. **검사만 조용히 통과하는 것이 가장 나쁜 고장이라**\n"
			"     못 찾으면 실패로 둔다. 이름을 바꿨으면 이 파일의 RULES 도 같이 고쳐라."
		)
	if bad:
		print(
			"\n실패 — 정한 값과 다르다. DESIGN.md 의 「정해야 할 물음」 표가 기준이다.\n"
			"     값을 바꾸려면 거기서 먼저 정하고, 앱과 목업을 같이 옮겨라\n"
			"     (목업 대조는 CSS 값을 안 본다 — screen_promotions.md 참고)."
		)
	if missing or bad:
		return 1
	print("정한 값이 전부 지켜지고 있다")
	return 0


if __name__ == "__main__":
	sys.exit(main())
