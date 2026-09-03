#!/usr/bin/env python3
"""캡처 `.html` 55개 → `screens.ts`. **손으로 맞추던 두 벌을 하나로 만든다.**

    python3 scripts/screens-ref-build.py            # 다시 만든다
    python3 scripts/screens-ref-build.py --check    # 안 쓰고 다른지만 본다

## 왜 있나

`app/src/screens_ref/` 에 같은 내용이 **두 벌** 있었다.

    *.html      55개 — `pnpm parity:activity` 가 이것과 대조한다
    screens.ts  48개 — Storybook 이 이것을 읽는다

그리고 `screens.ts` 머리는 **「자동 생성. 손으로 고치지 않는다」** 고 적어 두고
`생성: scripts/capture-mockups.md 참조` 를 가리켰는데 — **그 파일은 저장소에 한
번도 없었다**(`BLOCKERS.md` §5-c). 생성기가 없으니 손으로 고칠 수밖에 없었고,
`masterplan_v3` §19 가 「둘을 같이 고쳐야 한다」고 시켰다.

**그 지시가 일곱 번 안 지켜졌다.** 2026-09-03 실측 —

    html 에만 있는 7개
      activity__wordQuiz_image
      clip__empty · clip__noresult · clip__playing · clip__results
      vocashot__play_type · vocashot__result_best

표현클립 넷은 2026-08-28 에 대조에 들어왔는데(e886deb) **html 만 들어왔다.**
그래서 **Storybook 이 55화면 중 7을 못 보여 주고 있었다** — 조용히.
clip 은 `MockupGroup` 타입에도 없었으니 넣을 수도 없었다.

## 왜 `screens.ts` 를 지우지 않고 생성하나

Storybook 이 `.html` 을 직접 읽게 하는 쪽이 더 깨끗하지만, 이 저장소의 Storybook
빌더는 **rsbuild**(`storybook-react-rsbuild`)라 Vite 의 `import.meta.glob` 이 없고
원시 import 선례도 없다. 빌더 설정을 새로 얹는 것보다 **이 저장소가 이미 아는
패턴**(원장 → `n*.json`, 생성 + `--check`)을 쓰는 쪽이 낫다.

**그래서 `screens.ts` 는 이제 진짜 산출물이다** — 그 파일 머리가 처음부터 주장했던 것.
손으로 고치지 마라. 고칠 것은 캡처 `.html` 이고, 그것을 고치는 정본은
`docs/screens_SOT.html`(프로토타입)이다.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / "src" / "screens_ref"
OUT = REF / "screens.ts"
# 사람이 보는 뷰어. 이 파일 안의 `<script id="screens">` 한 블록만 이 생성기가 쥔다 —
# 껍데기(디자인 시스템 CSS · 절 버튼 · 기기틀 · 라벨표)는 손으로 고치는 자리로 남는다.
VIEW = ROOT.parent / "docs" / "screens_SOT.html"
VIEW_OPEN = '<script id="screens" type="application/json">'
VIEW_CLOSE = "</script>"
# 캡처를 그리는 CSS. **앱이 진짜로 빌드하는 그 CSS 여야 한다.**
# 전에는 목업이 손으로 들고 있는 스냅숏(202KB)이었는데, CSS 를 `.activity-frame` 처럼
# 프레임으로 스코프한 개편 **이전** 것이라 그 클래스가 0회였다. 그래서 미션대화 말풍선이
# 통째로 안 나왔다 — 2026-08-25 부터 목업에서 그 화면이 깨져 있었고 아무도 안 잡았다.
CSS_OPEN = '<script id="appcss" type="text/plain">'
CSS_DIR = ROOT / "dist" / "static" / "css"

# 캡처를 감쌀 클래스. 앱 CSS 가 이걸로 스코프하므로 **없으면 규칙이 하나도 안 먹는다.**
# Storybook 의 Frame 도 같은 표를 쓴다(mockup-parity.stories.tsx) — 그게 이 조리법의 선례다.

# 그룹 → 프레임 클래스. **캡처 데이터가 아니라 설정이라 여기 둔다** — 생성물에
# 손으로 적으면 다시 두 벌이 된다.
#
# `clip` 은 빈 문자열이다. 다른 넷은 CSS 가 `.activity-frame` 처럼 스코프를 두는데
# (activity.css §8 — `.tag`·`.line` 같은 흔한 이름 때문에), 표현클립 캡처는 전역
# Tailwind 만 쓰므로 감쌀 클래스가 없다.
FRAME_CLASS = {
    "activity": "activity-frame",
    "nav": "nav-frame",
    "vocashot": "vocashot-frame",
    "game": "game-frame",
    "clip": "",
}


def split_name(stem: str) -> tuple[str, str]:
    """`nav__home__resume` → (`nav`, `home__resume`). 첫 `__` 만 자른다."""
    group, sep, name = stem.partition("__")
    if not sep:
        sys.exit(f"파일 이름에 그룹이 없다: {stem}.html — `<그룹>__<화면>.html` 이어야 한다")
    if group not in FRAME_CLASS:
        sys.exit(f"모르는 그룹 '{group}' ({stem}.html)\n"
                 f"    아는 것: {', '.join(FRAME_CLASS)}\n"
                 f"    새 그룹이면 이 스크립트의 FRAME_CLASS 에 프레임 클래스를 정해 넣어라.")
    return group, name


def build() -> str:
    files = sorted(REF.glob("*.html"))
    if not files:
        sys.exit(f"캡처가 없다: {REF}/*.html")
    rows = []
    for p in files:
        group, name = split_name(p.stem)
        # 캡처는 한 줄짜리 마크업이다. 백틱·`${`·역슬래시만 막으면 템플릿 문자열에 그대로 들어간다
        html = p.read_text(encoding="utf-8").strip()
        html = html.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
        rows.append((group, name, html))

    groups = sorted({g for g, _, _ in rows})
    L = [
        "/**",
        " * 확정 목업에서 캡처한 마크업 — **자동 생성. 손으로 고치지 마라.**",
        " *",
        " * 만드는 것: `python3 scripts/screens-ref-build.py`",
        " * 원본: 같은 폴더의 `*.html` (그것의 정본은 `docs/screens_SOT.html` 프로토타입)",
        " * `pnpm parity:activity` 가 `--check` 로 낡았는지 본다.",
        " *",
        " * 목업의 빌더 함수를 직접 호출해 렌더된 결과를 그대로 받은 것이다.",
        " * 클래스 이름만 기억해 다시 쓰면 화면이 달라진다 — 그렇게 만든 VocaShot",
        " * 시작 화면에서 뜻 언어·입력 방식 선택이 통째로 빠져 있었다(2026-08-19).",
        " *",
        " * 게임 화면은 polishFrame() 이 클래스를 주입한 뒤의 상태다.",
        " * 그 주입 결과가 곧 앱 JSX 에 심어야 할 것이다.",
        " *",
        " * 스토리만 이 파일을 쓴다. 앱 코드는 쓰지 않는다 — 컴포넌트화의 기준점이다.",
        " *",
        " * **전에는 이 파일을 손으로 맞췄다.** 그래서 캡처 55개 중 48개만 들어와",
        " * Storybook 이 일곱을 못 보여 주고 있었다(표현클립 넷 포함). 생성기를 만들며",
        " * 고쳤다(2026-09-03).",
        " */",
        "",
        f"export type MockupGroup = {' | '.join(f'"{g}"' for g in groups)};",
        "",
        "export interface MockupScreen {",
        "\tgroup: MockupGroup;",
        "\t/** 목업 안에서의 화면 이름 */",
        "\tname: string;",
        "\thtml: string;",
        "}",
        "",
        "export const MOCKUP_SCREENS: MockupScreen[] = [",
    ]
    for group, name, html in rows:
        L += ["\t{", f'\t\tgroup: "{group}",', f'\t\tname: "{name}",',
              f"\t\thtml: `{html}`,", "\t},"]
    L += ["];", "",
          "/** 그룹별 CSS 스코프. 표현클립은 전역 Tailwind 만 써서 감쌀 클래스가 없다 */",
          "export const FRAME_CLASS: Record<MockupGroup, string> = {"]
    for g in groups:
        L.append(f'\t{g}: "{FRAME_CLASS[g]}",')
    L += ["};", ""]
    return "\n".join(L)


def built_css() -> str | None:
    """앱이 방금 빌드한 CSS. 없으면 None — 부르는 쪽이 어떻게 할지 정한다."""
    if not CSS_DIR.is_dir():
        return None
    hits = sorted(CSS_DIR.glob("index.*.css"))
    return hits[-1].read_text(encoding="utf-8") if hits else None


def sync_css(check: bool) -> int:
    """뷰어의 앱 CSS 블록을 빌드 산출물과 맞춘다.

    **`--check` 에서는 빌드가 없으면 넘어간다.** 이 검사는 `pnpm parity:activity`
    사슬 안이라, 빌드 안 한 작업 트리에서 게이트가 죽으면 안 된다."""
    css = built_css()
    src = VIEW.read_text(encoding="utf-8")
    i = src.find(CSS_OPEN)
    if i < 0:
        sys.exit(f"{VIEW.name} 에 `{CSS_OPEN}` 블록이 없다.")
    a, b = i + len(CSS_OPEN), src.find(VIEW_CLOSE, i + len(CSS_OPEN))
    if css is None:
        if check:
            print("앱 CSS    빌드가 없어 건너뛴다 — `pnpm build` 뒤에 다시 돌려라")
            return 0
        sys.exit("빌드된 CSS 가 없다 — `pnpm build` 를 먼저 돌려라.\n"
                 f"   찾은 곳: {CSS_DIR}/index.*.css")
    if src[a:b] == css:
        print(f"앱 CSS    {len(css):,}자 · 빌드와 같다")
        return 0
    if check:
        print(f"❌ docs/{VIEW.name} 의 앱 CSS 가 빌드와 다르다({len(src[a:b]):,} → {len(css):,}자).\n"
              f"   `cd app && pnpm build && python3 scripts/screens-ref-build.py` 뒤 커밋해라.")
        return 1
    VIEW.write_text(src[:a] + css + src[b:], encoding="utf-8")
    print(f"앱 CSS    {len(css):,}자 → docs/{VIEW.name} 을 다시 썼다")
    return 0


def view_block(files: list[Path]) -> str:
    r"""뷰어에 박을 JSON 한 줄. **`</script>` 로 블록을 탈출하지 못하게 막는다** —
    JSON 은 `\/` 를 허용하므로 `</` 를 그렇게 escape 하면 내용은 그대로다."""
    data = {p.stem: p.read_text(encoding="utf-8").strip() for p in files}
    return json.dumps(data, ensure_ascii=False, sort_keys=True).replace("</", "<\\/")


def sync_view(files: list[Path], check: bool) -> int:
    """뷰어의 JSON 블록을 캡처와 맞춘다. 바이트 왕복이라 눈대중이 안 낀다."""
    if not VIEW.exists():
        sys.exit(f"뷰어가 없다: {VIEW}")
    src = VIEW.read_text(encoding="utf-8")
    i = src.find(VIEW_OPEN)
    if i < 0:
        sys.exit(f"{VIEW.name} 에 `{VIEW_OPEN}` 블록이 없다 — 뷰어 껍데기가 바뀌었나 본다.")
    a = i + len(VIEW_OPEN)
    b = src.find(VIEW_CLOSE, a)
    want = view_block(files)
    rel = "docs/" + VIEW.name
    if src[a:b] == want:
        print(f"뷰어 블록  {len(files)}화면 · {rel} 는 캡처와 같다")
        return 0
    if check:
        print(f"❌ {rel} 의 `id=\"screens\"` 블록이 낡았다 — 캡처 {len(files)}화면과 다르다.\n"
              f"   `cd app && python3 scripts/screens-ref-build.py` 를 돌리고 커밋해라.")
        return 1
    VIEW.write_text(src[:a] + want + src[b:], encoding="utf-8")
    print(f"뷰어 블록  {len(files)}화면 → {rel} 을 다시 썼다")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="쓰지 않고 다른지만 본다")
    args = ap.parse_args()

    rc = sync_view(sorted(REF.glob("*.html")), args.check)
    rc = sync_css(args.check) or rc
    want = build()
    have = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
    n = want.count("\t\tgroup:")
    rel = OUT.relative_to(ROOT)

    if want == have:
        print(f"목업 캡처  {n}화면 · {rel} 는 캡처와 같다")
        return rc
    if args.check:
        print(f"❌ {rel} 가 낡았다 — 캡처 {n}화면과 다르다.\n"
              f"   `python3 scripts/screens-ref-build.py` 를 돌리고 변경을 커밋해라.")
        return 1
    # **다 만든 뒤 마지막에 연다.** `open(p, "w")` 는 쓰기 전에 이미 비우므로,
    # 쓸 내용을 만들다 죽으면 파일이 0바이트로 남는다(2026-08-30 에 실제로 겪었다).
    OUT.write_text(want, encoding="utf-8")
    print(f"목업 캡처  {n}화면 → {rel} 를 다시 썼다")
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
