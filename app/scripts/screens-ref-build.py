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
import re
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
    union = " | ".join('"%s"' % g for g in groups)
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
        # **중첩 f-string 을 쓰지 마라.** 전에 여기가
        #     f"… {' | '.join(f'\"{g}\"' for g in groups)};"
        # 였는데, 바깥 f-string 이 `"` 로 닫히는데 안쪽에 `"` 가 또 나온다. 그건
        # **3.12 전용 문법**(PEP 701)이라 Python 3.10·3.11 에서는 SyntaxError 로 죽는다.
        # CI 는 3.12 로 고정돼 있어서(`gates.yml`) 통과했고, 3.10 을 쓰는 사람 앞에서만
        # 이 게이트가 조용히 사라졌다. 저장소의 다른 파이썬 20여 개엔 이런 자리가 없다.
        f"export type MockupGroup = {union};",
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
    """앱이 방금 빌드한 CSS. 없으면 None — 부르는 쪽이 어떻게 할지 정한다.

    **`index.*.css` 하나만 보지 않는다.** 컴포넌트가 직접 `import "*.css"` 하면
    번들러가 그 컴포넌트를 실어 나르는 코드 분할(`async/`) 청크에 CSS 를 함께
    쪼개 넣는다 — `src/styles/` 밖에 있는 CSS 는 전부 그렇다. 봄소풍
    (`components/main/game/spring-picnic.css`)이 그래서 `index.*.css` 에 없고
    `async/2199.*.css` 에만 있었다(2026-09-03). `rglob` 로 그 아래 전부를 문다."""
    if not CSS_DIR.is_dir():
        return None
    hits = sorted(CSS_DIR.rglob("*.css"))
    return "\n".join(p.read_text(encoding="utf-8") for p in hits) if hits else None


# 캡처는 이 클래스 안에서만 제 모양이 난다. **개수까지 본다** — 낡은 빌드를 가리키면
# 바이트 비교는 통과하면서(그 낡은 것과 같으니) 화면만 깨진다. 2026-08-25~09-03 에
# 실제로 그랬다: 스냅숏에 `.activity-frame` 이 0회라 미션대화 말풍선이 안 나왔다.
SCOPE_MIN = {"activity-frame": 400, "nav-frame": 50, "game-frame": 300,
             "vocashot-frame": 50, "mission-bubble": 5}


def scope_note(css: str) -> str:
    bad = [f"{k} {css.count('.' + k if k.endswith('frame') else k)}<{v}"
           for k, v in SCOPE_MIN.items()
           if css.count("." + k if k.endswith("frame") else k) < v]
    if not bad:
        return " · 스코프 클래스 다 있다"
    sys.exit("❌ 이 CSS 에 캡처를 감쌀 스코프 클래스가 모자라다 — 낡은 빌드를 가리키고 있다.\n"
             "   " + " · ".join(bad) + "\n"
             "   `pnpm build` 를 다시 돌려라. 이게 모자라면 화면이 조용히 깨진다.")


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
            # **건너뛴다고 크게 찍는다.** 조용히 넘어가면 「검사가 돌았다」로 읽힌다 —
            # 이번 고장(말풍선이 9일)이 안 잡힌 구조가 정확히 그것이다.
            print("⚠ 앱 CSS    **검사하지 않았다** — 빌드가 없다.\n"
                  "            목업이 낡은 CSS 를 들고 있어도 여기서 안 잡힌다.\n"
                  "            `cd app && pnpm build && python3 scripts/screens-ref-build.py`")
            return 0
        sys.exit("빌드된 CSS 가 없다 — `pnpm build` 를 먼저 돌려라.\n"
                 f"   찾은 곳: {CSS_DIR}/**/*.css")
    if src[a:b] == css:
        print(f"앱 CSS    {len(css):,}자 · 빌드와 같다{scope_note(css)}")
        return 0
    if check:
        print(f"❌ docs/{VIEW.name} 의 앱 CSS 가 빌드와 다르다({len(src[a:b]):,} → {len(css):,}자).\n"
              f"   `cd app && pnpm build && python3 scripts/screens-ref-build.py` 뒤 커밋해라.")
        return 1
    VIEW.write_text(src[:a] + css + src[b:], encoding="utf-8")
    print(f"앱 CSS    {len(css):,}자 → docs/{VIEW.name} 을 다시 썼다{scope_note(css)}")
    return 0


# 캡처가 다는데 appcss 에 규칙이 없어도 되는 이름. **스타일이 아니라 동작 표식**이다 —
# 시각 규칙은 옆에 같이 붙은 다른 클래스(괄호 안)가 이미 진다. 지우기 전에
# 이유를 다시 확인해라 — 안 그러면 다음 사람이 이걸 고장으로 보고 CSS 를 새로 쓴다.
UNSTYLED_MARKERS = {
    "ux-answer": "봄소풍 선택지 — 스타일은 옆의 `.ch` 가 진다",
    "ux-exit": "봄소풍 나가기 — 스타일은 옆의 `.g-exit` 가 진다",
    "ux-level": "봄소풍 급 버튼 — 스타일은 옆의 `.sel-lvbtn`·`.back-btn` 이 진다. "
                "조사 스나이퍼의 `.ux-level-card`(규칙 있음)와 다른 이름이니 혼동 말 것",
    "ux-replay": "봄소풍 오답 다시듣기 — 스타일은 옆의 `.pc-wrong-play` 가 진다",
    "ps-blank-value": "조사 스나이퍼 빈칸 값 — 부모 `.ps-blank` 가 스타일을 지고 이건 글자만 감싼다",
    "idle": "녹음 버튼의 기본 상태 — `.record-button` 기본 규칙이 이미 이 모양이라 "
            "`.idle` 전용 규칙이 없다(activity.css). `recording`·`done` 처럼 "
            "기본과 **달라지는** 상태만 따로 규칙이 있다",
    "review": "교재 활동 행의 '복습' 상태 — `module-list.tsx`(`ActRow`)는 `doing`·`off` 만 "
              "행 전체를 다르게 칠하고, `done`·`review` 는 안의 `.bdg`·`.rv` 배지가 "
              "구분을 진다. 행 자체는 기본 `.act` 그대로라 `.review` 전용 규칙이 없다",
}


def html_classes(html: str) -> set[str]:
    return {c for m in re.finditer(r'class="([^"]*)"', html) for c in m.group(1).split()}


def css_classes_in(css: str) -> set[str]:
    """CSS 글에서 클래스 이름을 뽑는다. `css-class-check.py` 의 `classes_in` 과 같은 규칙 —
    Tailwind 이스케이프(`.bg-\\[\\#fff\\]`)를 안 풀면 무관한 것 수십 개가 섞인다."""
    css = re.sub(r"/\*.*?\*/", " ", css, flags=re.S)
    return {
        re.sub(r"\\(.)", r"\1", m)
        for m in re.findall(r"\.(-?(?:[_a-zA-Z]|\\.)(?:[-\w]|\\.)*)", css)
    }


def check_coverage(css: str, files: list[Path]) -> int:
    """캡처가 쓰는 클래스 중 appcss 에도 캡처 자기 `<style>` 에도 규칙이 없는 것을 찾는다.

    목업 견주기(`parity:activity`)는 마크업 구조만 보고 CSS 가 실제로 먹는지는
    안 본다 — 봄소풍이 9일 동안 그렇게 깨져 있었다. 이건 그 틈을 메운다."""
    styled = css_classes_in(css)
    fails = 0
    for p in files:
        html = p.read_text(encoding="utf-8")
        own = css_classes_in("".join(re.findall(r"<style[^>]*>(.*?)</style>", html, re.S)))
        for name in sorted(html_classes(html)):
            if name in styled or name in own or name.startswith("lucide"):
                continue
            if name in UNSTYLED_MARKERS:
                continue
            print(f"❌ {p.name} `.{name}` — appcss 에도 캡처 자기 <style> 에도 규칙이 없다.\n"
                  f"   이름을 잘못 적었거나, 새 표식이면 이 스크립트의 UNSTYLED_MARKERS 에 이유를 적어라.")
            fails += 1
    if not fails:
        print(f"클래스 커버리지  캡처 {len(files)}개 · 규칙 없는 이름 없다"
              f"({len(UNSTYLED_MARKERS)}개는 표식으로 면제)")
    return fails


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
    css = built_css()
    if css is not None:
        rc = (1 if check_coverage(css, sorted(REF.glob("*.html"))) else 0) or rc
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
