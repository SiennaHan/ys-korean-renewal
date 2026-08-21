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
    "한 칸 진행막대": "칸이 하나뿐이면 늘 꽉 찬 줄이라 어디쯤인지를 말해 주지 못한다."
    " 그려도 자리만 먹으므로 뺐다 (wordPreview · write3 · write3_canvas)",
    "레이더 viewBox": "목업은 220 폭. 축 이름을 번역하면 좌우로 넘쳐 잘려서"
    " -30 0 280 210 으로 넓혔다. 그려지는 크기는 max-width 를 같이 키워 그대로다",
    'aria-label 닫기': "목업이 스스로 갈렸다 — shell() 은 닫기, gapAppbar() 는 나가기."
    " 눈에 보이지 않는 글자라 i18n 이 정한 player.exit(나가기) 하나로 모았다",
    "탭 바": "nav 화면의 목업 캡처에는 탭 바가 들어 있는데, 그 화면의 컴포넌트는"
    " 탭 바를 그리지 않는다 — 레이아웃(routes/main.tsx)이 그린다. 그래서 뺀다",
    "nav 과 제목": "교재학습 목업의 과 제목은 표본이다(\"가족\" · 실제 1급 6과는 다른 제목)."
    " 목록 개수는 2026-08-21 에 목업을 실제 데이터에 맞췄다 — 급 탭 9 · 1급 과 12 ·"
    " 자모 1과의 묶음 3. 상태는 서버가 주는 것이라 목업이 정한 것을 쓴다",
}
# 위 aria-label 만 봐준다. 다른 aria-label 이 다르면 그대로 드러난다
EXIT_LABELS = {"닫기", "나가기"}

# 목업 마크업이 SVG·인라인 style 에 직접 적어 둔 원색 이름 → 앱의 semantic 토큰.
# CSS 이관은 스타일시트만 옮기므로 이 이름들은 앱에 없다. 값은 같다.
COLOR_ALIAS = {
    "var(--blue-500)": ("var(--color-fill-primary)", "#0180FF"),
    "var(--blue-gray-100)": ("var(--color-line-normal)", "#E5E8EC"),
    "var(--blue-gray-600)": ("var(--color-text-sub)", "#7F848D"),
    # 홈 목업은 게이지 svg 에 원색을 hex 로 직접 적었다. 값은 위 두 줄과 같다
    "#E5E8EC": ("var(--color-line-normal)", "#E5E8EC"),
    "#0180FF": ("var(--color-fill-primary)", "#0180FF"),
}
DROP_ATTRS = {"type", "disabled", "aria-hidden", "role"}
VOID = {"img", "input", "br", "hr", "rect", "path", "circle", "line", "polygon", "use"}


class Flat(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows, self.d = [], 0

    def handle_starttag(self, tag, attrs):
        a = {k: (v or "") for k, v in attrs if k not in DROP_ATTRS}
        if a.get("viewBox" if "viewBox" in a else "viewbox", "") == "-30 0 280 210":
            a["viewbox"] = "0 0 220 210"
            a["style"] = a.get("style", "").replace("max-width:280px", "max-width:220px")
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


def drop_tabbar(rows):
    """<nav class="tabbar"> 블록을 통째로 지운다 — 컴포넌트가 그리지 않는 부분이다"""
    out, i = [], 0
    while i < len(rows):
        line = rows[i]
        if line.strip().startswith('<nav class="tabbar"'):
            indent = len(line) - len(line.lstrip())
            j = i + 1
            while j < len(rows) and (len(rows[j]) - len(rows[j].lstrip())) > indent:
                j += 1
            i = j
            continue
        out.append(line)
        i += 1
    return out


def drop_single_progress(rows):
    """칸이 하나뿐인 진행막대 블록을 통째로 지운다"""
    out, i = [], 0
    while i < len(rows):
        line = rows[i]
        if line.strip().startswith('<div class="progress-wrap'):
            block = [line]
            j = i + 1
            indent = len(line) - len(line.lstrip())
            while j < len(rows) and (len(rows[j]) - len(rows[j].lstrip())) > indent:
                block.append(rows[j])
                j += 1
            if sum(1 for b in block if b.strip().startswith("<i")) <= 1:
                i = j
                continue
        out.append(line)
        i += 1
    return out


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
    # 이름이 곧 캡처 이름인 것(nav__*)과 activity__ 가 붙는 것 둘 다 받는다
    ref = os.path.join(mock, f"{name}.html")
    if not os.path.exists(ref):
        ref = os.path.join(mock, f"activity__{name}.html")
    if not os.path.exists(ref):
        print(f"✗ {name}: 목업 캡처가 없다")
        bad += 1
        continue

    def prep(html):
        return drop_single_progress(drop_tabbar(flat(html)))

    a = prep(open(ref, encoding="utf-8").read())
    b = prep(open(f, encoding="utf-8").read())
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
