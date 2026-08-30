#!/usr/bin/env python3
"""Storybook 스토리를 정해진 폭으로 떠서 PNG · outerHTML 로 남긴다.

**감사 도구다.** 제품 코드·CSS·목업 정본은 건드리지 않는다.

왜 이렇게 도나 —
  · 이 기기의 Chrome 헤드리스는 `--window-size` 를 무시하고 레이아웃을 늘
    500x693 으로 잡는다. 그래서 폭은 `harness.html` 이 iframe 에 직접 주고,
    찍은 그림을 PIL 로 잘라 낸다.
  · 스토리는 값이 고정된 정적 구성이라 **애니메이션 중간이 찍힐 일이 없다.**
    (그래도 `--virtual-time-budget` 으로 시간을 흘려 놓는다)

쓰기:  python3 capture.py <캡처ID> <스토리ID> [--w 360] [--h 693]
"""

import argparse
import pathlib
import subprocess
import sys
import urllib.parse

HERE = pathlib.Path(__file__).resolve().parent
# 실제 라우트에서 뜬 것은 표시 컴포넌트와 갈라서 둔다 — 섞으면 무엇이 제품
# 화면인지 다시 헷갈린다
OUT = HERE / "activity"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
# 헤드리스가 실제로 잡는 레이아웃 크기 — 이 안에 iframe 을 앉히고 잘라 낸다
# 이 기기의 헤드리스가 실제로 찍는 그림 크기. `--window-size` 는 무시된다(확인함).
SHOT_H = 469
DEFAULT_H = 693


# 오답 표시는 2초(`WRONG_VISIBLE_MS`) 뒤 스스로 거둬진다. 기본 6초로 찍으면
# **이미 사라진 뒤**가 담긴다 — 처음에 그렇게 찍어서 오답이 안 보였다.
# 그래서 상태에 따라 시간을 달리 준다.
def shoot(url: str, png: pathlib.Path, budget: int = 6000) -> None:
    subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
         f"--virtual-time-budget={budget}", f"--screenshot={png}", url],
        check=True, capture_output=True, timeout=90,
    )


def dump_dom(url: str, budget: int = 6000) -> str:
    r = subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu",
         f"--virtual-time-budget={budget}", "--dump-dom", url],
        check=True, capture_output=True, timeout=90, text=True,
    )
    return r.stdout


def shoot_tall(story_id: str, w: int, h: int, out: pathlib.Path,
               budget: int = 6000, lang: str = "", app: str = "",
               snap: str = "") -> tuple[int, int]:
    """한 번에 안 담기는 높이를 여러 번 찍어 이어 붙인다."""
    from PIL import Image

    canvas = Image.new("RGB", (w, h), "white")
    off = 0
    while off < h:
        args = {"w": w, "h": h, "off": off}
        args["snap" if snap else ("app" if app else "id")] = snap or app or story_id
        if lang:
            args["globals"] = f"locale:{lang}"
        q = urllib.parse.urlencode(args)
        part = out.with_suffix(f".part{off}.png")
        shoot(f"http://127.0.0.1:8741/docs/state_audit/harness.html?{q}", part, budget)
        im = Image.open(part).convert("RGB")
        take = min(SHOT_H, h - off, im.height)
        canvas.paste(im.crop((0, 0, min(w, im.width), take)), (0, off))
        part.unlink()
        off += SHOT_H
    canvas.save(out)
    return canvas.size


def crop(png: pathlib.Path, w: int, h: int) -> tuple[int, int]:
    from PIL import Image

    im = Image.open(png)
    # 헤드리스가 요청 크기를 무시할 수 있어 실제 크기 안에서만 자른다
    box = (0, 0, min(w, im.width), min(h, im.height))
    im.crop(box).save(png)
    return box[2], box[3]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("cap_id")
    ap.add_argument("story_id", help="스토리 id, 또는 --app 이면 무시된다")
    ap.add_argument("--app", default="", help="실제 제품 라우트 경로(/learn/... )")
    ap.add_argument("--snap", default="", help="activity/ 안의 DOM 스냅숏 파일명")
    ap.add_argument("--w", type=int, default=360)
    ap.add_argument("--h", type=int, default=DEFAULT_H)
    ap.add_argument("--budget", type=int, default=6000,
                    help="가상 시간(ms). 오답 표시를 담으려면 2000 밑으로")
    ap.add_argument("--lang", default="", help="Storybook locale 전역값(en 등)")
    a = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    png = OUT / f"{a.cap_id}.png"
    got = shoot_tall(a.story_id, a.w, a.h, png, a.budget, a.lang, a.app, a.snap)

    # outerHTML 은 스토리 iframe 을 직접 떠서 **활동 뿌리**만 남긴다
    if a.snap:                       # 스냅숏은 이미 HTML 이 있다 — 다시 안 뜬다
        (OUT / f"{a.cap_id}.html").write_text(
            (OUT / a.snap).read_text(encoding="utf-8"), encoding="utf-8")
        print(f"  ✓ {a.cap_id}  png {got[0]}x{got[1]}  (스냅숏 재현)")
        return 0
    story = (f"http://127.0.0.1:3000{a.app}" if a.app else
             f"http://127.0.0.1:6006/iframe.html?"
             f"id={urllib.parse.quote(a.story_id)}&viewMode=story"
             + (f"&globals=locale:{a.lang}" if a.lang else ""))
    dom = dump_dom(story, a.budget)
    # 활동 뿌리를 찾는다. 실제 라우트는 프레임이 없을 수 있어 앱 루트로 물러선다.
    for probe in ('<div class="activity-frame', '<div id="storybook-root">',
                  '<div id="root"', '<body'):
        i = dom.find(probe)
        if i >= 0:
            break
    j = dom.rfind("</body>")
    (OUT / f"{a.cap_id}.html").write_text(dom[i:j].strip(), encoding="utf-8")

    print(f"  ✓ {a.cap_id}  png {got[0]}x{got[1]}  html {len(dom[i:j])}자")
    return 0


if __name__ == "__main__":
    sys.exit(main())
