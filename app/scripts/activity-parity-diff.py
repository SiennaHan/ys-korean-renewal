"""컴포넌트가 그린 HTML 과 목업 캡처를 구조로 비교한다.

없는 요소·다른 클래스·다른 글자를 줄 단위로 짚어 준다.
아래 IGNORED 는 눈에 보이지 않지만 앱에 필요한 속성이다 — 무엇을 봐주는지
숨기지 않으려고 여기 적어 두고 실행할 때마다 같이 출력한다.
"""
import sys, glob, os, difflib, re
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
    "목업 데모 속성": "목업 자체를 돌리기 위한 갈고리다 — data-lv · data-lang ·"
    " data-mode · data-pick · id=\"go\" 처럼 목업의 스크립트가 눌린 버튼을 찾는 데 쓴다."
    " 앱은 React 이벤트로 하므로 필요 없다 (vocashot__*)",
    "운석 낙하 시간": "animation-duration 을 앱은 인라인으로 준다 — 점수에 따라"
    " 짧아지는 값이라 CSS 에 못 박을 수 없다. 목업은 캡처한 뒤 스크립트가 넣으므로"
    " 마크업에 없다. 값은 같은 규칙(fallSec)에서 나온다 (vocashot__play)",
    "nav 과 제목": "교재학습 목업의 과 제목은 표본이다(\"가족\" · 실제 1급 6과는 다른 제목)."
    " 목록 개수는 2026-08-21 에 목업을 실제 데이터에 맞췄다 — 급 탭 9 · 1급 과 12 ·"
    " 자모 1과의 묶음 3. 상태는 서버가 주는 것이라 목업이 정한 것을 쓴다",
    "data-correct": "목업이 정답 선택지에 박아 둔 디자인 시점 힌트다(game__ps_play)."
    " 앱은 정답을 DOM 에 노출하지 않는다 — 채점은 이벤트 핸들러 안에서 한다",
    "채움 막대 진행률": "위 '운석 낙하 시간' 과 같은 사정이다 — <i style=\"width:NN%\">"
    " 는 남은 시간·점수 같은 실시간 값이라 CSS 에 못 박고 앱이 인라인으로 준다."
    " 목업은 캡처 뒤 스크립트가 넣으므로 마크업엔 없다 (game__ps_play, 나중엔 cs_play도)",
    "cs-stat-row 인라인 style": "어휘 카드 마스터 결과(game__cs_result)의 다섯 스탯 행 중"
    " '맞힌 카드' 한 행만 목업 캡처에 인라인 style 이 빠져 있다. 그런데 그 인라인 style"
    " (display:flex · justify-content:space-between · align-items:center)은"
    " game.css 226행의 .cs-stat-row 규칙이 이미 똑같이 세 줄 다 주는 값이다 —"
    " 즉 인라인이 있든 없든 다섯 행은 똑같이 그려진다. 어느 쪽이 목업의 뜻이냐를 가릴 게"
    " 아니라 아무 차이가 없는 자리다. 앱은 다섯 행을 같은 배열 map 으로 그리므로"
    " 다섯 행 전부 인라인 style 비교만 건너뛴다(클래스·글자는 그대로 대조한다)",
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
# 색을 한 꼴로 모은다. 목업 캡처는 브라우저가 계산한 rgba(74, 222, 128, 0.25) 이고
# 앱은 소스에 적은 #4ade8040 이다 — 같은 색인데 글자가 달라 대조가 걸린다.
# 알파는 소수 둘로 끊는다(브라우저가 0.063 · 0.25 처럼 자리를 다르게 쓴다).
_HEX = re.compile(r"#([0-9a-fA-F]{3,8})\b")
_RGB = re.compile(r"rgba?\(([^)]*)\)")


def _canon(r, g, b, a=1.0):
    # a 는 부동소수 오차로 .5 경계에서 아래로 굴러떨어질 수 있다
    # (예: 리터럴 "0.145" 는 실제로 0.144999…996 이라 그냥 :.2f 하면 0.14 가 된다).
    # hex alpha(예: 0x25/255=0.145098…)로 들어온 값은 이 오차가 없어 0.15 로 반듯이 나오므로,
    # 같은 뜻의 두 표현이 다르게 보인다 — 아주 작은 보정으로 경계를 밀어서 없앤다.
    return f"rgba({r}, {g}, {b}, {a + 1e-9:.2f})"


def norm_colors(v):
    def hex_sub(m):
        h = m.group(1)
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        if len(h) == 4:
            h = "".join(c * 2 for c in h)
        if len(h) == 6:
            return _canon(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
        if len(h) == 8:
            return _canon(
                int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), int(h[6:8], 16) / 255
            )
        return m.group(0)

    def rgb_sub(m):
        parts = [x.strip() for x in m.group(1).replace("/", ",").split(",")]
        try:
            nums = [float(x) for x in parts[:3]]
            a = float(parts[3]) if len(parts) > 3 else 1.0
        except ValueError:
            return m.group(0)
        return _canon(int(nums[0]), int(nums[1]), int(nums[2]), a)

    return _RGB.sub(rgb_sub, _HEX.sub(hex_sub, v))


# 인라인 style 을 한 꼴로 모은다. 목업 캡처는 브라우저가 직렬화한 것이고
# ("width: 32px; …;" · border 를 네 개 longhand 로 펼친다) 앱은 React 가 쓴 것이다
# ("width:32px;…" · 세미콜론 없음). 뜻이 같으면 같게 본다.
_BORDER_NONE = {
    "border-width": "medium",
    "border-style": "none",
    "border-color": "currentcolor",
    "border-image": "initial",
}


_LEADING_ZERO = re.compile(r"(?<![\d.])0(\.\d)")


def _tokenize(v):
    """공백으로 토큰을 가르되 괄호 안(rgba(…) 같은) 공백은 건너뛴다."""
    toks, buf, depth = [], "", 0
    for ch in v:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == " " and depth == 0:
            if buf:
                toks.append(buf)
                buf = ""
        else:
            buf += ch
    if buf:
        toks.append(buf)
    return toks


# font-family 인용 — 브라우저는 여러 단어(예: "Exo 2")는 겹따옴표로 감싸고
# 한 단어(예: Pretendard·sans-serif)는 인용을 뗀다. 앱은 소스에 적은 그대로
# ('Exo 2' 홑따옴표, 'Pretendard' 는 안 떼고) 나오므로 브라우저 규칙으로 맞춘다.
_FONT_TOKEN = re.compile(r"^[A-Za-z][A-Za-z0-9-]*$")


def norm_font_family(v):
    out = []
    for name in v.split(","):
        n = name.strip().strip("'\"")
        out.append(n if _FONT_TOKEN.match(n) else f'"{n}"')
    return ", ".join(out)


# animation 셔러핸드 — 브라우저는 이름 순서를 맨 뒤로 옮기고 생략된 하위값
# (delay·iteration-count·direction·fill-mode·play-state)을 초기값으로 채워
# 늘 8개짜리 꼴로 직렬화한다. 앱은 소스에 적은 대로("이름 시간 이징") 짧게
# 나오므로 같은 규칙으로 펼친다.
_TIMING_FN = {"ease", "ease-in", "ease-out", "ease-in-out", "linear", "step-start", "step-end"}
_DIRECTION = {"normal", "reverse", "alternate", "alternate-reverse"}
_FILL_MODE = {"none", "forwards", "backwards", "both"}
_PLAY_STATE = {"running", "paused"}
_TIME_TOKEN = re.compile(r"^-?[\d.]+s$")


def norm_animation(v):
    duration = timing = delay = iteration = direction = fill = play = name = None
    for t in _tokenize(v):
        if t == "auto" or _TIME_TOKEN.match(t):
            if duration is None:
                duration = t
            elif delay is None:
                delay = t
        elif t in _TIMING_FN or t.startswith("cubic-bezier(") or t.startswith("steps("):
            timing = t
        elif t == "infinite" or re.match(r"^[\d.]+$", t):
            iteration = t
        elif t in _DIRECTION:
            direction = t
        elif t in _FILL_MODE and fill is None:
            fill = t
        elif t in _PLAY_STATE:
            play = t
        else:
            name = t
    parts = [
        duration or "auto", timing or "ease", delay or "0s", iteration or "1",
        direction or "normal", fill or "none", play or "running", name or "none",
    ]
    return " ".join(parts)


def norm_style(v):
    decls = {}
    for part in v.split(";"):
        if ":" not in part:
            continue
        k, _, val = part.partition(":")
        k = k.strip().lower()
        val = " ".join(val.split())
        # 브라우저는 0.18 을 .18 로 줄여 쓴다(예: opacity) — 값은 같다
        val = _LEADING_ZERO.sub(r"\1", val)
        if k == "font-family":
            val = norm_font_family(val)
        elif k == "animation":
            val = norm_animation(val)
        decls[k] = val
    # 브라우저가 펼친 border: none 을 되접는다
    if all(decls.get(k) == want for k, want in _BORDER_NONE.items()):
        for k in _BORDER_NONE:
            del decls[k]
        decls["border"] = "none"
    # background-clip(-webkit- 포함)은 background 셔러핸드의 일부라 브라우저가
    # "background:<값> text" 처럼 뒤에 붙여 직렬화한다. 앱은 두 선언으로 따로 쓴다.
    for clip_key in ("-webkit-background-clip", "background-clip"):
        if clip_key in decls and "background" in decls:
            decls["background"] = f"{decls['background']} {decls.pop(clip_key)}"
    return ";".join(f"{k}:{decls[k]}" for k in sorted(decls))


DROP_ATTRS = {"type", "disabled", "aria-hidden", "role",
              # 위 "목업 데모 속성" 참조 — 목업 스크립트 전용 갈고리
              "data-lv", "data-lang", "data-mode", "data-pick", "id",
              # 목업이 정답 선택지에 박아 둔 디자인 시점 힌트다(game__ps_play).
              # 앱은 정답을 DOM 에 노출하지 않는다 — 채점은 handleAnswer 안에서 한다
              "data-correct"}
VOID = {"img", "input", "br", "hr", "rect", "path", "circle", "line", "polygon", "use"}


class Flat(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows, self.d = [], 0
        self._stat_row_child_depth = None

    def handle_starttag(self, tag, attrs):
        a = {k: (v or "") for k, v in attrs if k not in DROP_ATTRS}
        # 위 IGNORED "cs-stat-row 인라인 style" 참조
        if tag == "div" and a.get("class") == "cs-stat-row":
            a.pop("style", None)
            self._stat_row_child_depth = self.d + 1
        elif tag == "span" and self.d == self._stat_row_child_depth:
            a.pop("style", None)
        if a.get("viewBox" if "viewBox" in a else "viewbox", "") == "-30 0 280 210":
            a["viewbox"] = "0 0 220 210"
            a["style"] = a.get("style", "").replace("max-width:280px", "max-width:220px")
        if a.get("aria-label") in EXIT_LABELS:
            a["aria-label"] = "(나가기)"
        # 위 IGNORED "운석 낙하 시간" 참조 — 앱만 인라인으로 준다
        if "animation-duration" in a.get("style", ""):
            a["style"] = re.sub(r"animation-duration:[^;]*;?", "", a["style"]).strip()
            if not a["style"]:
                del a["style"]
        # 위 IGNORED "채움 막대 진행률" 참조 — <i> 의 인라인 width:NN% 도 같은 사정이다
        if tag == "i" and re.fullmatch(r"width:\s*[\d.]+%\s*;?", a.get("style", "")):
            del a["style"]
        if "style" in a:
            a["style"] = norm_style(norm_colors(a["style"]))
            if not a["style"]:
                del a["style"]
        for k, v in list(a.items()):
            for old, (new, _) in COLOR_ALIAS.items():
                if old in v:
                    a[k] = v.replace(old, new)
                    v = a[k]
        if "class" in a:
            # 순서는 CSS 에서 뜻이 없다. 목업은 ps-result-retry ux-control,
            # 앱은 ux-control ps-result-retry 처럼 적어서 정렬해 맞춘다
            a["class"] = " ".join(sorted(a["class"].split()))
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


# 게임 캡처만 끼고 있는 껍데기 — 구 배포판의 라우트 레이아웃이다.
# 목업의 빌더를 불러 뜬 것이라(커밋 d1a7cfb) 그 앱의 페이지 전환 층이 그대로 들어왔다.
# opacity 는 framer-motion 이 페이드 중간에 얼려 둔 값이라 재현 대상이 아니다.
GAME_WRAPPER_CLASSES = (
    "h-[100dvh] overflow-y-auto",
    "bg-white h-full",
    "flex flex-col h-full",
    "flex-1 h-full overflow-y-auto scrollbar-hide w-full",
)


# 게임 캡처는 화면마다 껍데기 사슬이 다르다 — 목업이 화면별로 다른 무대에서 그렸다.
# 사슬을 열거하는 대신 **화면의 뿌리 클래스**를 적어 두고 그 위를 다 벗긴다.
# 뿌리 클래스는 앱 컴포넌트가 그 화면에 붙이는 것과 같은 것이라, 둘이 같은 데서 시작한다.
SCREEN_ROOT = {
    "game__ps_level": "ps-level-shell",
    "game__ps_lesson": "ps-lesson-shell",
    "game__ps_play": "ps-game-shell",
    "game__cs_level": "cs-level-shell",
    "game__cs_intro": "cs-intro-shell",
    "game__cs_play": "cs-play-shell",
    "game__cs_result": "cs-result-shell",
    # 봄소풍 title·select·game 은 .spg 안에서 그린다(다크 스테이지가 아니라
    # drop_game_wrapper 의 ux-dark-stage 종료 마커가 안 걸린다). 목업의
    # --app-width:100% 차이는 스크린 루트를 .spg 안쪽의 실제 화면(.scr)으로 잡아
    # 비교 대상 밖으로 뺀다 — spring-picnic.tsx 691행 주석 참고.
    # 클래스 인용부호까지 넣는 이유 — "scr" 만 쓰면 그 앞 껍데기의
    # "scrollbar-hide" 에도 부분일치해서 더 위에서 멈춘다.
    "game__pc_title": 'class="s-title',
    "game__pc_select": 'class="scr"',
    "game__pc_game": 'class="scr"',
    # 결과(pc_result)는 목업에 .spg 자체가 없다 — ps_result·cs_result 처럼
    # 껍데기 없이 바로 그려서 SCREEN_ROOT 가 필요 없다
    # 서울 퍼즐 map·entry·puzzle 은 셋 다 같은 "ux-seoul" 무대 위에서 그린다
    # (헤더도 공유한다) — 그 반 클래스 하나로 목업의 tailwind 껍데기를 벗긴다.
    "game__sp_map": 'class="ux-seoul"',
    "game__sp_entry": 'class="ux-seoul"',
    "game__sp_puzzle": 'class="ux-seoul"',
    # 게임 목록은 목업이 ux-list-scroll(라우트 레이아웃이 그리는 스크롤 껍데기)
    # 안에 ux-list-shell 을 두고 머리·목록을 그 직계 자식으로 둔다. 탭 바는
    # ux-list-shell 의 형제라 뿌리 하위 나무만 남기면 저절로 빠진다 — 내비
    # 화면에서 탭 바를 봐준 것과 같은 사정이고 여기서는 봐줄 것도 없다.
    "game__list": "ux-list-shell",
    # complete 는 그 셋과 달리 헤더가 없는 독립 화면이다(ps_result·cs_result 와
    # 같은 모양) — 목업(game__sp_complete)도 껍데기 없이 바로 "result-screen
    # sp-complete" 로 시작해서 SCREEN_ROOT 가 필요 없다.
}


def drop_above_root(rows, cls):
    """뿌리 클래스가 나오는 행부터 **그 하위 나무만** 남기고 당긴다.

    위쪽 껍데기만 벗기면 화면 뒤에 붙은 형제까지 남는다 — 목업 하네스가 화면
    바깥에 둔 콤보 토스트 자리와 <audio> 가 그것이다. 앱은 그것을 그리지 않는다.
    """
    for i, r in enumerate(rows):
        if cls in r:
            indent = len(r) - len(r.lstrip())
            out = [r.lstrip()]
            for x in rows[i + 1 :]:
                if len(x) - len(x.lstrip()) <= indent:
                    break
                out.append(x[indent:] if x.startswith(" " * indent) else x.lstrip())
            return out
    return rows


def drop_game_wrapper(rows):
    """게임 캡처의 껍데기 다섯 겹을 벗기고 나머지를 그만큼 당긴다.

    #app → h-[100dvh] → bg-white(opacity) → flex flex-col → scrollbar-hide →
    ux-dark-stage 까지가 껍데기다. 마지막 ux-dark-stage 는 앱의
    .game-frame 에 대응하고, 렌더 쪽에서도 같이 벗긴다(activity-frame 과 같은 처리).
    """
    n = 0
    for r in rows:
        t = r.strip()
        if n == 0 and t == "<div>":
            n += 1
            continue
        if n and any(f'class="{c}"' in t for c in GAME_WRAPPER_CLASSES):
            n += 1
            continue
        if n and 'class="ux-dark-stage"' in t:
            n += 1
            break
        if n:
            break
    if n < 2:
        return rows
    out = []
    for r in rows[n:]:
        out.append(r[2 * n :] if r.startswith(" " * (2 * n)) else r.lstrip())
    return out


def strip_app_wrapper(html):
    """게임 캡처의 <div id="app"> 껍데기를 파싱 전에 벗긴다.

    게임 목업은 화면을 iframe 안에서 그리고 그 body 를 통째로 떴다 — 그래서
    맨 바깥에 <div id="app" style="height:100%"> 이 한 겹 붙는다. 활동 캡처의
    activity-frame 을 렌더 쪽에서 벗기는 것과 같은 처리다.

    파싱 뒤에 하면 안 된다 — DROP_ATTRS 가 id 를 지워서 껍데기를 못 알아본다.
    """
    m = re.match(r'\s*<div id="app"[^>]*>', html)
    if not m:
        return html
    body = html[m.end():]
    return body[: body.rindex("</div>")]


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

    root = SCREEN_ROOT.get(name)

    def prep(html):
        rows = flat(strip_app_wrapper(html))
        rows = drop_above_root(rows, root) if root else drop_game_wrapper(rows)
        return drop_single_progress(drop_tabbar(rows))

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
