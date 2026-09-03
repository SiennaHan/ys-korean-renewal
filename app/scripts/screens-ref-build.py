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
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / "src" / "screens_ref"
OUT = REF / "screens.ts"

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


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="쓰지 않고 다른지만 본다")
    args = ap.parse_args()

    want = build()
    have = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
    n = want.count("\t\tgroup:")
    rel = OUT.relative_to(ROOT)

    if want == have:
        print(f"목업 캡처  {n}화면 · {rel} 는 캡처와 같다")
        return 0
    if args.check:
        print(f"❌ {rel} 가 낡았다 — 캡처 {n}화면과 다르다.\n"
              f"   `python3 scripts/screens-ref-build.py` 를 돌리고 변경을 커밋해라.")
        return 1
    # **다 만든 뒤 마지막에 연다.** `open(p, "w")` 는 쓰기 전에 이미 비우므로,
    # 쓸 내용을 만들다 죽으면 파일이 0바이트로 남는다(2026-08-30 에 실제로 겪었다).
    OUT.write_text(want, encoding="utf-8")
    print(f"목업 캡처  {n}화면 → {rel} 를 다시 썼다")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
