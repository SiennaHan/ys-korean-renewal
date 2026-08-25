#!/usr/bin/env python3
"""CSS 와 코드가 서로를 안 부르는 자리를 찾는다.

**왜 필요한가** — 이 앱의 CSS 는 정본 프로토타입(`phase1/screens_uiux.html`)과
목업에서 **통째로 이관해 왔고**, 컴포넌트는 그것을 보고 **손으로 다시 적었다.**
그러다 보니 이름이 어긋난 자리가 생긴다. 그러면 규칙은 있는데 아무것도 안 입고,
화면만 깨진다. 실제로 두 번 겪었다.

  · `.r-row` — 놓친 단어 줄. 컴포넌트가 `r-miss` · `<b>` 로 그려서 단어와 뜻이
    붙어 나왔다(`녹차green tea다시 맞힘`). 쓸 규칙은 이미 다 있었다.
  · `.typed` — 직접 입력 칸. 이 이름의 규칙은 **어디에도 없다**. 정본은
    `typerow` 다.

**목업 대조로는 못 잡는다.** 대조는 컴포넌트가 그린 것을 목업 캡처와 견주는데,
캡처가 담지 못한 상태(놓친 단어가 있는 결과, 직접 입력 모드)는 견줄 것이 없다.

**두 방향을 본다.**

  ① CSS 에 있는데 코드가 안 쓴다 — 이관만 되고 안 그려진 것
  ② 코드가 쓰는데 **어떤 CSS 에도 없다** — 이름을 잘못 적은 것

②는 빌드 산출 CSS(`dist/static/css`)를 기준으로 본다. Tailwind 가 만들어 내는
클래스까지 **실제로 실려 나간 것 전부**가 거기 있으므로, 거기 없으면 그 이름은
브라우저에서 아무것도 입지 않는다. 빌드가 없으면 ②는 건너뛴다.

**못 보는 것** — 이름이 맞는지만 본다. **모양이 맞는지는 안 본다.**
그리고 클래스를 코드가 조립해 만들면(`is-${result}`) ①이 못 본다. 그런 자리는
`ALLOW` 에 이유와 함께 적는다.
"""

import json
import re
import sys
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
STYLES = APP / "src" / "styles"
DIST = APP / "dist" / "static" / "css"
MOCKUPS = APP / "src" / "mockups"
CAPTURED = APP.parent / "phase1" / "captured"

# ─── 봐 주는 자리 ─────────────────────────────────────────────────────
#
# 이유 없이는 넣지 않는다. 크게 셋이다 —
#   · 오탐(런타임에 붙거나 코드가 조립한다)
#   · 목업 껍데기(앱에는 대응이 없는 것이 맞다)
#   · **아직 안 그린 것** — 이건 봐 주는 게 아니라 **할 일**이다

UNUSED_ALLOW = {
	# 오탐 — 코드가 그 이름을 통째로 적지 않는다
	"lucide": "lucide-react 아이콘이 런타임에 붙인다 — 코드에는 그 글자가 없다",
	"is-hit": "코드가 조립한다 — particle-sniper-view 의 `is-${shotResult}`",
	"is-miss": "코드가 조립한다 — particle-sniper-view 의 `is-${shotResult}`",
	# 목업 바깥 껍데기 — 앱은 레이아웃이 그 일을 한다
	"ps-width-shell": "목업 캡처의 바깥 폭 껍데기 — 앱은 app-layout 이 폭을 잡는다",
	"ux-list-tabbar": "목업 게임 목록의 아래 탭바 — 앱은 자체 내비를 쓴다",
	# 정본 문서 자신의 도구 UI — 앱 화면이 아니다
	"focus-note": "정본 문서(screens_uiux.html)가 화면마다 초점 설명을 붙이는 칸",
	"overview": "정본 문서의 '전체 화면 검토' 판 — 앱에 없는 것이 맞다",
	"modal-canvas": "정본 문서의 손글씨 모달 — 앱은 HangulCanvas 를 쓴다",
	# 죽은 규칙
	"mobile-fixed-height": "쓰는 곳이 없다 — 남은 유틸리티",
	"role-footer": "`.chat-footer` 와 한 규칙에 묶여 있을 뿐 쓰는 곳이 없다",
}

USED_ALLOW: dict[str, str] = {}


def classes_in(css: str) -> set[str]:
	"""CSS 글에서 클래스 이름을 뽑는다. `@import`·`url()` 은 뺀다(`.css` 가 딸려 온다)."""
	css = re.sub(r"/\*.*?\*/", " ", css, flags=re.S)
	css = re.sub(r"@import[^;]*;", " ", css)
	css = re.sub(r"url\([^)]*\)", " ", css)
	# 첫 글자를 글자·밑줄·붙임표로 조인다. `\w` 로 열어 두면
	# `letter-spacing:.02em` 같은 **값**을 클래스로 읽는다.
	# Tailwind 는 `.text-\[17px\]` 처럼 이스케이프해서 내보낸다.
	return {
		re.sub(r"\\(.)", r"\1", m)
		for m in re.findall(r"\.(-?(?:[_a-zA-Z]|\\.)(?:[-\w]|\\.)*)", css)
	}


def strip_comments(src: str) -> str:
	src = re.sub(r"/\*.*?\*/", " ", src, flags=re.S)
	return re.sub(r"(?<![:\w])//[^\n]*", " ", src)  # http:// 는 남긴다


def marker_names() -> set[str]:
	"""목업·캡처가 달고 있는 클래스. **규칙이 없어도 있어야 하는 이름**이다 —
	목업 대조가 클래스 이름을 견주므로 표식만 하는 클래스가 정상적으로 있다."""
	out: set[str] = set()
	for d in (MOCKUPS, CAPTURED):
		for p in d.glob("*.html"):
			for m in re.finditer(r'class="([^"]*)"', p.read_text(encoding="utf-8")):
				out |= {c for c in m.group(1).split() if re.fullmatch(r"-?[_a-zA-Z][\w-]*", c)}
	return out


def inline_style_classes(code: str) -> set[str]:
	"""컴포넌트가 `<style>` 로 직접 박아 넣은 규칙. 번들 CSS 에는 안 나온다."""
	out: set[str] = set()
	for m in re.finditer(r"<style[^>]*>(.*?)</style>", code, re.S):
		out |= classes_in(m.group(1))
	return out


def code_files():
	for p in (APP / "src").rglob("*"):
		if p.suffix in (".ts", ".tsx") and "mockups" not in p.parts:
			yield p


def used_names(code: str) -> set[str]:
	"""`className` 에 **글자 그대로 적힌** 이름들. 조립한 조각은 못 본다."""
	out: set[str] = set()
	for m in re.finditer(r'class(?:Name)?\s*=\s*(?:"([^"]*)"|\{`([^`]*)`\})', code):
		text = m.group(1) or m.group(2) or ""
		# `${...}` 안은 자바스크립트다 — 통째로 지운다. 남기면 변수 이름을
		# 클래스로 잘못 읽는다(`${shotResult}` 를 `.shotResult` 로 봤었다).
		text = re.sub(r"\$\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", " ", text)
		for chunk in text.split():
			if re.fullmatch(r"-?[_a-zA-Z][\w-]*", chunk):
				out.add(chunk)
	return out


def main() -> int:
	code = "\n".join(strip_comments(p.read_text(encoding="utf-8")) for p in code_files())
	fails = 0

	# ① CSS 에 있는데 코드가 안 쓴다 ────────────────────────────────
	# 코드가 그 이름을 **어디서든** 적었으면 쓰는 것으로 본다. 조립·변수도
	# 대개 그 글자가 어딘가 남기 때문이다. 놓치는 쪽보다 봐 주는 쪽으로 기운다.
	edge = r'[\s"\'`{=(,\[]', r'[\s"\'`}\]),:;$]'
	print("① CSS 에 있는데 코드가 안 쓰는 이름")
	for f in sorted(STYLES.glob("*.css")):
		for name in sorted(classes_in(f.read_text(encoding="utf-8"))):
			if re.search(edge[0] + re.escape(name) + edge[1], code):
				continue
			why = UNUSED_ALLOW.get(name)
			if why:
				mark = "TODO" if why.startswith("TODO") else "면제"
				print(f"  · {f.name} `.{name}` {mark} — {why.removeprefix('TODO: ')}")
			else:
				print(f"★ {f.name} `.{name}` — 규칙은 있는데 아무도 안 쓴다")
				fails += 1

	# ② 코드가 쓰는데 실려 나간 CSS 어디에도 없다 ───────────────────
	print("\n② 코드가 쓰는데 실려 나간 CSS 에 없는 이름")
	shipped = set()
	for p in DIST.rglob("*.css"):
		shipped |= classes_in(p.read_text(encoding="utf-8"))
	if not shipped:
		print(f"  (건너뜀 — {DIST} 가 비었다. `pnpm build` 를 먼저 돌려라)")
	else:
		print(f"  (실려 나간 클래스 {len(shipped)}개를 기준으로 본다)")
		styled = shipped | inline_style_classes(code)
		markers = marker_names()
		for p in sorted(code_files()):
			for name in sorted(used_names(strip_comments(p.read_text(encoding="utf-8")))):
				if name in styled:
					continue
				rel = p.relative_to(APP)
				if name in markers:
					print(f"  · {rel} `.{name}` 표식 — 목업이 달고 있어 규칙 없이도 있어야 한다")
				elif name in USED_ALLOW:
					print(f"  · {rel} `.{name}` 면제 — {USED_ALLOW[name]}")
				else:
					print(f"★ {rel} `.{name}` — 이 이름의 규칙이 어디에도 없다")
					fails += 1

	print()
	if fails:
		print(f"{fails}건 — 이름이 어긋났거나, 봐 줄 이유를 아직 안 적었다")
		return 1
	print("어긋난 이름 없다")
	return 0


if __name__ == "__main__":
	sys.exit(main())
