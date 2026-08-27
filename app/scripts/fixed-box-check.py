#!/usr/bin/env python3
"""고정 px 폭인데 안에 변수가 들어가는 칸을 찾는다.

왜 있나 — 2026-08-27 에 봄소풍 결과의 오답 노트가 깨진 채로 나갔다. 숫자 알약이
`width:38px; flex:none` 인데 목업 캡처에 담긴 값이 `15` · `32` 두 글자뿐이었고,
**실제 문항의 num 은 `20,000원` · `102동 804호` · `35,000,000원` 까지 있었다.**
긴 값이 알약을 넘쳐 오른쪽 문장 위로 올라탔다.

기존 게이트가 왜 못 봤나 — `parity:activity` 는 마크업만 견주고,
`fixture-data-check.py` 는 값의 **모양**만 본다. 둘 다 **글자가 칸에 들어가는지는
세지 않는다.** typecheck·build 도 당연히 모른다. 그래서 이 축을 따로 센다.

무엇을 세나 — CSS 에서 `width:<숫자>px` 를 가지고 글꼴/정렬 속성도 같이 있는 규칙
(= 글자를 담는 고정폭 칸)의 클래스를 모으고, 그 클래스를 쓰는 JSX 의 자식이
보간(`{...}`)인 자리를 낸다. 그러면 "칸은 고정인데 내용은 변수" 인 자리만 남는다.

**이 검사는 넘치는지 계산하지 않는다** — 폰트 렌더링 없이는 못 센다. "여기는
사람이 한 번 봐야 한다" 고 가리키는 것까지가 이 검사의 일이다. 봤으면 아래
ALLOW 에 **무엇을 확인했는지** 적는다. 적지 않으면 실패한다.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 열어 보고 괜찮다고 판단한 자리. 값은 **왜 괜찮은지** — "괜찮음" 만 적지 마라.
# 들어오는 값이 바뀌면 이 이유도 낡는다.
ALLOW = {
	"src/components/main/activity/roleplay.tsx .who": "34×24 인데 들어오는 값은 "
	'"나" · "AI" 둘뿐이다(learn/ai-roleplay.tsx:546 이 그 두 개만 만든다). '
	"원장의 speaker(유리·슈테판·샤오밍…)는 이 칸에 오지 않는다 — TTS 로만 간다",
	"src/components/main/home/learning-status.tsx .n": "44×44 · 20px bold 에 "
	"하루 활동 수. 세 자리(100)까지 들어간다 — 하루 1000개는 없다",
	"src/components/main/home/learning-status.tsx .stat2": "칸이 아니라 flex 껍데기다 "
	"— 안의 .n 과 .l 이 각자 자기 폭을 쓴다",
	"src/components/main/activity/flashcard.tsx .badge": "40×40 · 14px 에 모르는 카드 "
	"수. 한 과의 카드가 수십 장이라 두 자리다",
	"src/components/main/activity/flashcard.tsx .back": "고정폭은 vocashot 의 뒤로가기 "
	"버튼(.g-head .back)이고, 여기 .flash-face.back 은 카드 면이라 폭 규칙이 없다 "
	"— 이름만 같다",
	"src/components/main/game/seoul-puzzle-view.tsx .sp-complete-check": "58×58 은 ✓ "
	"동그라미다. 장소 이름이 들어가는 곳은 그 아래 .sp-complete-title 이고 폭 규칙이 없다",
	"src/components/main/game/spring-picnic-view.tsx .sel-face": "이모지 한 자다",
	"src/components/main/game/spring-picnic-view.tsx .t-cb": "이모지 한 자다",
	"src/components/main/game/spring-picnic-view.tsx .g-illo": "이모지 한 자다",
	"src/components/main/game/spring-picnic-view.tsx .pc-result-friend": "이모지 한 자다",
	"src/components/main/game/particle-sniper-view.tsx .ps-result-grade": "S·A·B·C "
	"넉 자 중 하나다",
	"src/components/main/activity/choice.tsx .choice-mark": "✓ 또는 ✕ 한 자다",
	"src/components/main/activity/feedback.tsx .feedback-message": "✓ 또는 ✕ 한 자다",
	"src/components/main/activity/practice-browser.tsx .status-dot": "✓ 또는 빈 문자열이다",
	"src/components/main/home/weekly-attendance.tsx .c": "체크 아이콘 하나다",
	"src/components/dialog/dialog-scenario.tsx .scenario": "폭 규칙이 아니라 min-height "
	"다. 글은 줄바꿈한다",
	"src/components/main/textbook/paywall-panel.tsx .paywall-benefits": "<li> 목록의 "
	"껍데기다 — 줄마다 자기 폭을 쓴다",
	"src/components/main/home/continue-learning.tsx .task": "카드 껍데기다",
	"src/components/main/activity/roleplay.tsx .dock": "버튼을 받는 껍데기다",
	"src/components/main/activity/chat.tsx .thread": "말풍선을 받는 껍데기다",
	"src/components/main/activity/stimulus.tsx .mouth-video": "영상 칸이다 — 글자가 아니다",
	"src/components/main/activity/briefing-screen.tsx .kw-line": "폭 규칙이 없는 flex "
	"줄이다(.kw-line 은 display:flex 뿐)",
	"src/components/main/course-list/jamo.tsx .syls": "음절 칩을 받는 껍데기다 — 칩마다 "
	"자기 폭을 쓴다",
}


def fixed_width_classes() -> dict[str, set[str]]:
	"""글자를 담는 고정폭 칸의 클래스 이름."""
	out: dict[str, set[str]] = {}
	for css in sorted((ROOT / "src" / "styles").glob("*.css")):
		text = css.read_text()
		for rule in re.finditer(r"([^{}]+)\{([^{}]*)\}", text):
			sel, body = rule.group(1), rule.group(2)
			# min-width · max-width 는 자랄 수 있으니 센 것이 아니다
			if not re.search(r"(?<!min-)(?<!max-)\bwidth\s*:\s*\d+px", body):
				continue
			# 글꼴·정렬 속성이 같이 있으면 글자를 담는 칸으로 본다
			if not re.search(r"font-size|place-items|text-align|line-height", body):
				continue
			for cls in re.findall(r"\.([a-zA-Z][\w-]*)", sel):
				out.setdefault(cls, set()).add(css.name)
	return out


def main() -> int:
	fixed = fixed_width_classes()
	found: dict[str, tuple[int, str]] = {}
	for tsx in sorted((ROOT / "src").rglob("*.tsx")):
		lines = tsx.read_text().split("\n")
		rel = tsx.relative_to(ROOT).as_posix()
		for i, line in enumerate(lines):
			m = re.search(r'className=(?:\{`|")([^"`]*)', line)
			if not m:
				continue
			used = [c for c in m.group(1).split() if c in fixed]
			if not used:
				continue
			blob = "\n".join(lines[i : i + 3])
			child = re.search(r">\s*\{([^}]+)\}", blob)
			if not child:
				continue
			inner = child.group(1).strip()
			# t() 로 짠 문구는 로케일마다 사람이 보는 값이라 이 검사의 대상이 아니다
			if inner.startswith(("t(", "/*")):
				continue
			key = f"{rel} .{used[0]}"
			found.setdefault(key, (i + 1, inner[:60]))

	unknown = sorted(k for k in found if k not in ALLOW)
	stale = sorted(k for k in ALLOW if k not in found)

	print(f"고정폭 글자칸 클래스 {len(fixed)}개 · 변수가 들어가는 자리 {len(found)}곳")
	for key in unknown:
		lineno, inner = found[key]
		path, cls = key.rsplit(" ", 1)
		print(f"  [사람이 볼 것] {path}:{lineno} {cls} ← {{{inner}}}")
	for key in stale:
		print(f"  [낡은 허용] {key} — 이제 없다. ALLOW 에서 지워라")

	if unknown:
		print(
			"\n실패 — 위 자리를 열어 **가장 긴 실제 값**이 칸에 들어가는지 보고,\n"
			"     scripts/fixed-box-check.py 의 ALLOW 에 무엇을 확인했는지 적어라."
		)
		return 1
	if stale:
		print("\n실패 — 위 허용 항목이 코드에 없다.")
		return 1
	print("넘칠 만한 고정폭 칸 없다")
	return 0


if __name__ == "__main__":
	sys.exit(main())
