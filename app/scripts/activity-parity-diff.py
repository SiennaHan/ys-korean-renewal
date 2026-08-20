"""컴포넌트가 그린 HTML 과 목업 캡처를 구조로 비교한다.

없는 요소·다른 클래스·다른 글자를 줄 단위로 짚어 준다.
아래 IGNORED 는 눈에 보이지 않지만 앱에 필요한 속성이다 — 무엇을 봐주는지
숨기지 않으려고 여기 적어 두고 실행할 때마다 같이 출력한다.
"""
import sys, glob, os, difflib
from html.parser import HTMLParser

IGNORED = {
    'type="button"': "React 에서 버튼 기본값이 submit 이라 넣어야 한다",
    "disabled": "꺼진 버튼에 붙였다 — 목업은 data-action 을 빼는 것으로 같은 뜻을 냈다",
    'aria-hidden="true"': "장식 svg 를 읽지 않게 한다",
    'role="img"': "라벨 붙은 svg 를 그림으로 읽게 한다",
    'aria-label 닫기': "목업이 스스로 갈렸다 — shell() 은 닫기, gapAppbar() 는 나가기."
    " 눈에 보이지 않는 글자라 i18n 이 정한 player.exit(나가기) 하나로 모았다",
}
# 위 aria-label 만 봐준다. 다른 aria-label 이 다르면 그대로 드러난다
EXIT_LABELS = {"닫기", "나가기"}

# 목업 마크업이 SVG·인라인 style 에 직접 적어 둔 원색 이름 → 앱의 semantic 토큰.
# CSS 이관은 스타일시트만 옮기므로 이 이름들은 앱에 없다. 값은 같다.
COLOR_ALIAS = {
    "var(--blue-500)": ("var(--color-fill-primary)", "#0180FF"),
    "var(--blue-gray-100)": ("var(--color-line-normal)", "#E5E8EC"),
    "var(--blue-gray-600)": ("var(--color-text-sub)", "#7F848D"),
}
DROP_ATTRS = {"type", "disabled", "aria-hidden", "role"}
VOID = {"img", "input", "br", "hr", "rect", "path", "circle", "line", "polygon", "use"}


class Flat(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows, self.d = [], 0

    def handle_starttag(self, tag, attrs):
        a = {k: (v or "") for k, v in attrs if k not in DROP_ATTRS}
        if a.get("aria-label") in EXIT_LABELS:
            a["aria-label"] = "(나가기)"
        for k, v in list(a.items()):
            for old, (new, _) in COLOR_ALIAS.items():
                if old in v:
                    a[k] = v.replace(old, new)
                    v = a[k]
        if "class" in a:
            a["class"] = " ".join(a["class"].split())
            if not a["class"]:
                del a["class"]
        bits = " ".join(f'{k}="{a[k]}"' for k in sorted(a))
        self.rows.append("  " * self.d + f"<{tag}{' ' + bits if bits else ''}>")
        if tag not in VOID:
            self.d += 1

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.d -= 1

    def handle_endtag(self, tag):
        if tag not in VOID:
            self.d = max(0, self.d - 1)

    def handle_data(self, data):
        t = " ".join(data.split())
        if t:
            self.rows.append("  " * self.d + repr(t))


def flat(html):
    p = Flat()
    p.feed(html)
    return p.rows


here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, "..", ".parity-out")
mock = os.path.join(here, "..", "src", "mockups")

print("봐주는 차이 —")
for k, why in IGNORED.items():
    print(f"  {k:22} {why}")
for old, (new, hexv) in COLOR_ALIAS.items():
    print(f"  {old:22} → {new} (둘 다 {hexv})")
print()

bad = 0
for f in sorted(glob.glob(os.path.join(out, "*.html"))):
    name = os.path.basename(f)[:-5]
    ref = os.path.join(mock, f"activity__{name}.html")
    if not os.path.exists(ref):
        print(f"✗ {name}: 목업 캡처가 없다")
        bad += 1
        continue
    a = flat(open(ref, encoding="utf-8").read())
    b = flat(open(f, encoding="utf-8").read())
    if a == b:
        print(f"✓ {name}")
        continue
    bad += 1
    print(f"✗ {name}")
    for line in difflib.unified_diff(a, b, "목업", "컴포넌트", lineterm="", n=1):
        if line.startswith(("---", "+++", "@@")):
            continue
        print(f"    {line}")
print()
print("모두 같다" if not bad else f"{bad}개 화면이 다르다")
sys.exit(1 if bad else 0)
