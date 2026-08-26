#!/usr/bin/env python3
"""문서끼리의 참조가 실제로 닿는지 검사한다.

문서를 합치거나 옮기거나 절 번호를 바꿀 때 쓴다. 사람이 "다 고쳤다" 고 믿는 대신
이것을 돌려서 확인한다 — 이 저장소는 문서를 이름과 절 번호로 인용하기 때문에
한 곳을 옮기면 조용히 끊어지는 곳이 생긴다.

  python3 phase1/check_docs.py

검사하는 것 — 라벨로 보면 이렇다. 개수를 여기 적지 않는다.
검사를 늘릴 때 이 목록만 고치고 숫자는 실행할 때 세어 찍는다
(전에 이 문서 문자열이 "일곱" 인데 구현은 여덟이었다).

  [절 인용]      "문서이름 §N" 인데 그 문서에 N 절이 없는 경우
  [하위절]       "§N.M" 인데 그 번호의 h3 이 없는 경우
  [하위절 중복]  한 문서에 같은 N.M 이 둘 이상 — 합치면 생긴다
  [자기 절]      자기 문서의 없는 절을 부르는 경우
  [옛 경로]      _superseded/ 로 옮겼는데 옛 이름으로 부르는 곳
  [죽은 링크]    href 가 가리키는 파일이 없는 경우
  [앵커]         href="다른문서.html#N" 의 앵커가 그 문서에 없는 경우
  [id 중복]      한 문서에 같은 id — 앵커가 겹친다
  [id 라벨]      h2 의 id 와 보이는 절 번호가 다른 경우
  [고아]         아무 문서도, 문(README·BLOCKERS·CLAUDE)도 가리키지 않는 문서
  [숫자 주장]    문서가 적어 놓은 수를 실제로 세어 보고 다른 경우
  [색인]         정본이 phase1/INDEX.md 에 빠졌거나 한 문서가 두 줄인 경우
  [원장 버전]    문서가 원장 정본 버전을 못박았는데 지금 것과 다른 경우
  [데이터 정본]  문서가 말하는 데이터 출처와 코드의 import 가 다른 경우
  [사실 중복]    기계가 세는 수를 주인 문서 밖에서 또 적은 경우 — claims() 의 OWNER
  [목업 쌍둥이]  phase1/captured/ 와 app/src/mockups/ 가 갈라진 경우

[옛 경로] 는 인계 메모(*.txt)까지 본다.

[숫자 주장] 과 [하위절] 이 값어치가 크다. 참조가 끊어졌는지만 보면
작업이 진행되며 문서의 수와 절 번호가 조용히 낡는 것을 못 잡는다 —
목업 대조 화면 수가 22·24·27 로 갈렸고, 문서를 합치며 h2 만 다시 매기고
h3 을 두어서 §N.M 인용 59곳이 닿지 않았다. 둘 다 "통과" 뒤에 있었다.

**통과는 "문서가 정확하다" 가 아니다.** "지금 세는 축에서 어긋난 게 없다" 다.
새 축은 사람이 찾아야 한다 — 회차마다 하나씩 나왔다.

끝에 0 을 내면 통과다. 하나라도 걸리면 1 을 낸다.
"""
from __future__ import annotations

import re
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
# 저장소의 문. CLAUDE.md 는 세션마다 자동으로 읽히므로 여기 적힌 수가
# 틀리면 피해가 가장 크다 — 그래서 검사 대상에 넣는다.
DOORS = [ROOT / "CLAUDE.md", ROOT / "README.md", ROOT / "BLOCKERS.md"]

# 문서 이름에 붙는 확장자 없는 형태도 인용에 쓰인다
NAME_RE = r"[A-Za-z0-9_.가-힣-]+"


def strip_tags(s: str) -> str:
    s = re.sub(r"<(script|style)\b.*?</\1>", " ", s, flags=re.S | re.I)
    return re.sub(r"<[^>]*>", " ", s)


def load() -> tuple[dict[str, str], dict[str, str], dict[str, Path]]:
    """정본·폐기본의 본문(태그 제거)과 경로를 모은다.

    코퍼스에 세 종류가 들어간다. 이름의 접두로 갈라 놓아야 검사마다
    대상을 골라 쓸 수 있다.
      (접두 없음)  phase1/*.html — 정본. 인용의 대상이 되는 것
      "(문) "      README.md · BLOCKERS.md — 저장소의 문
      "(메모) "    phase1/*.txt — 인계 메모. 인용 대상은 아니지만
                   폐기본을 부르고 있으면 사람을 잘못 보낸다
    """
    live = {p.stem: p for p in sorted(HERE.glob("*.html"))}
    dead = {p.stem: p for p in sorted((HERE / "_superseded").glob("*.html"))}
    text = {n: strip_tags(p.read_text(encoding="utf-8", errors="replace")) for n, p in live.items()}
    raw = {n: p.read_text(encoding="utf-8", errors="replace") for n, p in live.items()}
    for m in DOORS:
        if m.exists():
            text["(문) " + m.name] = m.read_text(encoding="utf-8")
            raw["(문) " + m.name] = text["(문) " + m.name]
    idx = HERE / "INDEX.md"
    if idx.exists():
        text["(문) " + idx.name] = idx.read_text(encoding="utf-8")
        raw["(문) " + idx.name] = text["(문) " + idx.name]
    for t in sorted(HERE.glob("*.txt")):
        body = t.read_text(encoding="utf-8", errors="replace")
        text["(메모) " + t.name] = body
        raw["(메모) " + t.name] = body
    return text, raw, {**live, **{n: dead[n] for n in dead}}


# "옛이름.html → _superseded/" 꼴의 줄. 문서 맨 위에 이걸 적어 두면
# 그 이름은 그 문서 안에서 봐준다 — 어디로 갔는지 이미 밝혔다는 뜻이다.
# 시점 기록(인계 메모)처럼 본문을 고쳐 쓰면 안 되는 문서를 위한 장치다.
REDIRECT_RE = re.compile(r"([A-Za-z0-9_.가-힣-]+)\.html\s*→\s*_superseded/", re.M)


def redirected(body: str) -> set[str]:
    """이 문서가 '어디로 갔는지' 이미 적어 둔 옛 이름들."""
    return {m.group(1) for m in REDIRECT_RE.finditer(body)}


def sections(body: str) -> set[str]:
    """그 문서가 가진 절 번호. §N · <h2>N제목 · "N. 제목" 을 모두 받는다."""
    out: set[str] = set()
    # h2 안의 선행 숫자 (예: "01문서 지도", "1판정 기준", "0. 공통 규칙", "4-b…")
    for h in re.findall(r"<h2[^>]*>(.*?)</h2>", body, re.S):
        t = re.sub(r"<[^>]*>", "", h).strip()
        m = re.match(r"(\d+)", t)
        if m:
            out.add(str(int(m.group(1))))
    return out


# ─────────────────────────────────────────────────────────────────────
# 세어서 알 수 있는 것
# ─────────────────────────────────────────────────────────────────────

APP = ROOT / "app"
HANGUL_NUM = {"하나": 1, "둘": 2, "셋": 3, "넷": 4, "다섯": 5, "여섯": 6,
              "일곱": 7, "여덟": 8, "아홉": 9, "열": 10}


def parity_screens() -> dict[str, int]:
    """목업 대조가 그리는 화면 수를 스크립트에서 센다 — 갈래별로.

    돌려 보지 않고 세는 것이 중요하다. .parity-out/ 은 .gitignore 밖이라
    받는 사람의 저장소에는 없다.

    갈래를 접두사로 가른다. 전에는 `SCREENS.x =` 꼴을 전부 "내비" 로 셌는데,
    그 꼴을 쓰는 것이 내비뿐이었을 때만 맞는 말이었다. 지금은 VocaShot 과
    게임 넷도 같은 꼴로 들어와서, 46화면을 "활동 22 + 내비 24" 라고 찍고
    있었다 — 내비는 다섯뿐이다.
    """
    out = {"활동": 0, "내비": 0, "VocaShot": 0, "게임": 0}
    f = APP / "scripts" / "activity-parity.tsx"
    if not f.exists():
        return out
    lines = f.read_text(encoding="utf-8", errors="replace").splitlines()
    inside = False
    for ln in lines:
        if re.match(r"const SCREENS\b", ln):
            inside = True
            continue
        if inside:
            if ln.startswith("};"):
                inside = False
            elif re.match(r"\t[A-Za-z_][A-Za-z0-9_]*:", ln):
                out["활동"] += 1
        m = re.match(r"^SCREENS\.([A-Za-z0-9_]+) =", ln)
        if m:
            name = m.group(1)
            if name.startswith("nav__"):
                out["내비"] += 1
            elif name.startswith("vocashot__"):
                out["VocaShot"] += 1
            elif name.startswith("game__"):
                out["게임"] += 1
            else:
                # 접두사가 없는 것은 활동으로 본다 — 옛 꼴이 그랬다
                out["활동"] += 1
    return out


def mockup_captures() -> int:
    """app/src/mockups/*.html — 목업에서 뜬 캡처 파일 수.

    문서가 "캡처 N개" 라고 자주 적는데 세는 축이 없어서 낡아도 몰랐다.
    2026-08-24 검증에서 이 표현이 다섯 곳에 손으로 적혀 있는 것을 찾았다.
    """
    d = APP / "src" / "mockups"
    return len(list(d.glob("*.html"))) if d.is_dir() else 0


def token_counts() -> dict[str, int]:
    """tokens.css 의 토큰을 층별로 센다.

    문서가 "primitive 51 + semantic 30 + 타이포 23" 이라고 적어 두는데,
    토큰은 작업하다 하나씩 는다. 실제로 `line-control` 이 늘어난 뒤에도
    문서는 둘 다 옛 수로 남아 있었고 — 세는 검사가 없어서 조용히 통과했다.

    타이포는 눈금 하나가 `--text-x` · `--text-x--line-height` ·
    `--text-x--font-weight` 셋으로 적히므로 접미가 없는 것만 센다.
    """
    f = ROOT / "app" / "src" / "styles" / "tokens.css"
    if not f.exists():
        return {}
    s = f.read_text(encoding="utf-8")
    cut = s.find("semantic — 어디에 쓰나")
    if cut < 0:
        return {}
    color = r"^\t--color-[a-z0-9-]+:"
    return {
        "primitive 색 토큰": len(re.findall(color, s[:cut], re.M)),
        "semantic 색 토큰": len(re.findall(color, s[cut:], re.M)),
        # `--text-x--line-height` 처럼 눈금 하나가 세 줄로 적히므로 이름에 `--` 가
        # 없는 것만 센다. 처음엔 줄 뒤를 보는 lookahead 로 걸렀는데 이름 쪽을
        # 안 봐서 69 가 나왔다 — 검사가 스스로를 잡아 줬다.
        "타이포 눈금": sum(
            1 for n in re.findall(r"^\t--text-([a-z0-9-]+):", s, re.M) if "--" not in n
        ),
    }


def data_counts() -> dict[str, int]:
    """앱 데이터에서 직접 세는 값.

    문서가 콘텐츠 수를 자주 인용하는데(문항·키·행) 원장이 갱신되면
    조용히 낡는다 — 실제로 i18n 287→300, VocaShot 원천 1149→1146 이
    그렇게 어긋나 있었다. 파일이 없으면 그 항목은 검사하지 않는다.
    """
    import json

    out: dict[str, int] = {}
    d = APP / "src" / "shared" / "data"
    for key, rel in [
        ("n4 빈칸 문항", "n4_blank_question.json"),
        ("n1 어휘퀴즈 문항", "n1_word_quiz.json"),
        ("읽기 지문", "n5_read_answer_text.json"),
    ]:
        f = d / rel
        if f.exists():
            try:
                out[key] = len(json.loads(f.read_text(encoding="utf-8")))
            except Exception:
                pass
    bank = d / "vocashot-bank.ts"
    if bank.exists():
        n = len(re.findall(r'"w"\s*:', bank.read_text(encoding="utf-8", errors="replace")))
        if n:
            out["VocaShot 문항 은행"] = n
    loc = APP / "src" / "i18n" / "locales"
    if loc.is_dir():
        out["i18n 로케일 수"] = len(list(loc.glob("*.ts")))
    return out


def claims(live: set[str], text: dict[str, str]) -> list[str]:
    """문서가 적어 놓은 수와 실제로 센 수를 맞춰 본다.

    문구는 좁게 잡는다. 이 저장소에는 비슷하지만 다른 지표가 셋 있고
    (이식 화면 25 · 활동 컴포넌트 22 · 목업 대조 27) 넓게 잡으면
    맞는 숫자를 틀렸다고 잡는다.
    """
    parity = parity_screens()
    memos = len(list(HERE.glob("*.txt")))
    sec_total = sum(t.count("§") for n, t in text.items() if n in live)

    # 사실마다 **주인 문서 하나**를 정해 둔다. 주인 밖에서 그 수를 말하면
    # [사실 중복] 이 잡는다. 왜 필요한가 — 2026-08-24 에 화면 수를 27 → 47 로
    # 늘렸을 때 같은 숫자가 **일곱 문서**에 적혀 있어서 다섯 곳이 한꺼번에 낡았다.
    # 문서 개수가 문제가 아니라 한 사실이 여러 곳에 적힌 것이 문제였다.
    #
    # 주인을 고르는 기준은 "그 수로 무언가를 판단하는 곳". 화면 수는 인계에서
    # "이것이 통과한다" 를 말하는 README, 문서·폐기본·메모 수는 목록을 쥔 INDEX 다.
    # 나머지 문서는 숫자를 적지 말고 질적으로 쓴다("목업 캡처 전부가 일치한다").
    # 시점 기록과 인용은 봐준다. "그때는 30화면이었다" 는 지금도 참이고,
    # 다른 문서의 옛 문장을 따옴표로 옮긴 것도 고치면 안 된다.
    # 정규식으로는 이 둘을 현재 주장과 가를 수 없어서, TWIN_ALLOW 처럼
    # **문구 조각과 이유를 손으로 적어** 봐준다. 새로 넣을 때는 그 문장이
    # 정말 "그때" 를 말하는지 보고 넣어라 — 현재 주장을 여기 넣으면 안 잡힌다.
    CLAIM_ALLOW = [
        ("대조가 30화면 (2026-08-24)", "VocaShot 셋을 넣던 시점의 기록. 지금 수가 아니다"),
        ("대조 밖에 캡처 20개가 서 있다", "masterplan_v3 §9 의 옛 문장을 그대로 인용한 것"),
    ]

    OWNER = {
        "목업 대조 화면 수": "(문) README.md",
        "목업 캡처 수": "(문) README.md",
        "phase1 정본 문서 수": "(문) INDEX.md",
        "_superseded 문서 수": "(문) INDEX.md",
        "인계 메모 수": "(문) INDEX.md",
        # 아래 셋은 지금 우연히 한 곳뿐이다. 우연을 규칙으로 굳혀 둔다 —
        # 나중에 누가 다른 문서에 또 적으면 그때 걸린다.
        "i18n 로케일 수": "(문) BLOCKERS.md",
        "VocaShot 문항 은행": "games_spec_v1",
        "n1_word_quiz 행": "games_spec_v1",
        # 토큰 수는 셋 다 shell_spec §3.5 가 쥔다. dev_spec 이 같은 줄을
        # 베껴 두었다가 둘 다 낡았다(2026-08-26).
        "primitive 색 토큰": "shell_spec_v1",
        "semantic 색 토큰": "shell_spec_v1",
        "타이포 눈금": "shell_spec_v1",
    }

    # (이름, 실제, 문서가 그 수를 말할 때 쓰는 문구들)
    specs: list[tuple[str, int, list[str]]] = [
        ("목업 대조 화면 수", sum(parity.values()), [
            r"(\d+)개\s*화면이\s*일치",
            r"parity:activity\s*#?\s*(\d+)개\s*화면\s*일치",
            r"parity:activity\s*가\s*(\d+)개\s*화면",
            r"목업\s*대조에?\s*들어갔다\s*—\s*(\d+)화면",
            r"구조를\s*비교하고,?\s*(\d+)개가\s*일치",
            # 아래 셋은 2026-08-24 에 빠져 있던 것을 채웠다. 그날 "31 → 47" 을
            # 검사가 다섯 곳만 잡았는데 games_spec 의 "parity:activity 31화면" 은
            # 문구가 없어서 통과했다 — 사람이 grep 해서 찾았다.
            # **패턴이 없으면 검사는 조용히 통과한다.** 문구를 새로 쓰면 여기 추가해라.
            r"parity:activity\s*(\d+)화면",
            r"(\d+)화면이\s*일치",
            r"목업\s*대조\s*(\d+)화면",
            # 2026-08-24 검증에서 또 찾은 꼴. 패턴 목록은 늘 부족하다고 보고,
            # 숫자를 새 문구로 쓰면 여기 같이 넣어라
            r"대조가\s*(\d+)화면",
            r"지금은\s*\*?\*?(\d+)\*?\*?\s*이다",
        ]),
        ("목업 캡처 수", mockup_captures(), [
            r"캡처\s*(\d+)개(?:는|가|를|만)",
            r"캡처\s*(\d+)개가\s*곧",
            r"목업\s*캡처\s*(\d+)",
        ]),
        ("phase1 정본 문서 수", len(live), [
            r"문서가\s*(\d+)개",
            r"목업\s*HTML\s*(\d+)개",
            r"정본\s*(\d+)개가\s*모두",
            r"정본\s*(\d+)개\s*·",
        ]),
        ("_superseded 문서 수", len(list((HERE / "_superseded").glob("*.html"))), [
            r"정본이\s*아닌\s*(\d+)개",
            r"`?_superseded/`?\s*(\d+)개",
            r"_superseded/?\s*로\s*옮겼다\s*\(\s*([가-힣\d]+)\s*개",
        ]),
        # 절 인용 총합은 여기 넣지 않는다 — 문서를 한 줄 고칠 때마다 바뀌어서
        # 정확히 맞추게 하면 신호가 아니라 잡일이 된다(한 세션에 네 번 갈렸다).
        # 대신 "400개가 넘는다" 류의 하한 주장만 아래 floors 에서 본다.
        ("인계 메모 수", memos, [
            r"인계\s*메모\s*([가-힣]+)\(",
            r"인계\s*메모\s*(\d+)개",
        ]),
    ]

    # 콘텐츠 실측 — 원장이 갱신되면 문서의 수가 낡는다
    dc = data_counts()
    if "i18n 로케일 수" in dc:
        specs.append(("i18n 로케일 수", dc["i18n 로케일 수"],
                      [r"i18n\s*은?\s*(\d+)개\s*로케일"]))
    if "VocaShot 문항 은행" in dc:
        specs.append(("VocaShot 문항 은행", dc["VocaShot 문항 은행"],
                      [r"문항\s*은행\s*(\d+)", r"은행은\s*(?:\*\*)?(\d+)"]))
    if "n1 어휘퀴즈 문항" in dc:
        specs.append(("n1_word_quiz 행", dc["n1 어휘퀴즈 문항"],
                      [r"n1_word_quiz\.json.{0,14}?(\d{3,5})\s*(?:행|문항|건)"]))

    tc = token_counts()
    if tc:
        specs += [
            ("primitive 색 토큰", tc["primitive 색 토큰"], [r"primitive\s*(\d+)"]),
            ("semantic 색 토큰", tc["semantic 색 토큰"], [r"semantic\s*(\d+)\s*\+"]),
            ("타이포 눈금", tc["타이포 눈금"], [r"타이포\s*(\d+)"]),
        ]

    out: list[str] = []

    # 하한 주장 — "N개가 넘는다" 는 N 이 실제보다 크면 거짓이다.
    # 정확한 수를 요구하지 않으므로 문서를 고쳐도 흔들리지 않는다.
    floors = [("절 인용 § 총합", sec_total, [r"절\s*인용이?\s*(?:\*\*)?(\d+)개[가를]?\s*넘"])]
    for label, real, pats in floors:
        for src, body in text.items():
            flat = re.sub(r"\s+", " ", body)
            for pat in pats:
                for m in re.finditer(pat, flat):
                    floor = int(m.group(1))
                    if real < floor:
                        out.append(
                            f"[숫자 주장] {src} → {label} 이 {floor} 을 넘는다고 적었는데 "
                            f"실제는 {real} 다"
                        )

    # [사실 중복] — 주인 밖에서 그 수를 말하는 곳. 값이 맞아도 걸린다
    for label, _real, pats in specs:
        keeper = OWNER.get(label)
        if not keeper:
            continue
        for src, body in text.items():
            if src == keeper or src.startswith("(메모) "):
                continue
            flat = re.sub(r"\s+", " ", body)
            # finditer 로 **모든** 자리를 본다. re.search 로 첫 자리만 보면,
            # 그 첫 자리가 CLAIM_ALLOW 에 걸릴 때 뒤의 진짜 위반을 놓친다 —
            # 2026-08-24 검증에서 실제로 BLOCKERS 의 두 곳을 그렇게 놓쳤다.
            hit = None
            for pat in pats:
                for m in re.finditer(pat, flat):
                    wide = flat[max(0, m.start() - 70):m.end() + 40]
                    if any(frag in wide for frag, _why in CLAIM_ALLOW):
                        continue
                    hit = flat[max(0, m.start() - 32):m.end() + 14].strip()
                    break
                if hit:
                    break
            if hit:
                out.append(
                    f"[사실 중복] {src} 가 {label} 을 적었다 — 그 수의 주인은 {keeper} 다\n"
                    f"           숫자를 빼고 질적으로 쓰거나 주인을 가리켜라 …{hit}…"
                )

    for label, real, pats in specs:
        if real == 0:
            continue
        for src, body in text.items():
            flat = re.sub(r"\s+", " ", body)
            for pat in pats:
                for m in re.finditer(pat, flat):
                    tok = m.group(1)
                    got = HANGUL_NUM.get(tok, None)
                    if got is None:
                        if not tok.isdigit():
                            continue
                        got = int(tok)
                    if got != real:
                        ctx = flat[max(0, m.start() - 45):m.end() + 35].strip()
                        if any(frag in ctx for frag, _why in CLAIM_ALLOW):
                            continue
                        out.append(
                            f"[숫자 주장] {src} → {label} 을 {tok} 이라 적었는데 실제는 {real}\n"
                            f"           …{ctx}…"
                        )
    return out


# captured/ 와 mockups/ 가 일부러 다른 곳. 이유를 적어야 넣을 수 있고,
# 눈감아 준 것은 실행할 때마다 같이 찍는다 — parity 스크립트와 같은 규칙이다.
TWIN_ALLOW = {
    "activity__report.html":
    "목업 v2.7 승격(2026-08-26). 탭을 <div> 에서 진짜 <button role=tablist·aria-selected>"
    " 로 바꾸고, 카드·평가 행의 인라인 style 을 .report-card·.report-rows 로 뺐다."
    " captured/ 는 v2.6 시점 기록이라 그대로 둔다",
    "activity__briefing.html":
    "목업 v2.7 승격(2026-08-26). 상황 이미지 자리 글자를 <span aria-hidden> 로 감쌌다 —"
    " 그림이 없을 때의 자리표라 보조기술이 읽을 것이 아니다."
    " captured/ 는 v2.6 시점 기록이라 그대로 둔다",
    "vocashot__play_type.html":
    "직접 입력 줄을 <div> 대신 <form> 으로 감쌌다 — Enter 로 제출된다."
    " 정본은 <div> 라 키보드만 쓰면 버튼까지 Tab 해야 했다."
    " captured/ 는 그때 뜬 날것이라 그대로 둔다",
    "nav__book__resume.html": "활동 이름을 기획자가 확정했다(2026-08-25, 66b0e94 '빈칸 표기를 통일한다') —"
    " '빈칸 채워 말하기' → '빈칸 채우기'. 앱이 쓰는 i18n(ko.ts 'fill-blank')과 mockups 를 같이 바꿨고,"
    " captured/ 는 그때 뜬 날것이라 그대로 둔다. 차이는 이 한 줄뿐이다",
    "nav__home__none.html": "캡처는 탭바가 위·홈 비활성. mockups 가 아래·활성으로 고친 판(08-20)",
    "nav__home__resume.html": "같음",
    "nav__home__review.html": "같음",
    "game__pc_result.html": "캡처는 🔊 가 맨 글자. mockups 는 aria-label 붙은 button 으로 감쌌다 — 접근성 개선(2026-08-24)",
    "game__sp_map.html": "장소 카드 10개가 캡처에는 div 였다 — 장소로 들어가는 유일한 경로인데"
    " 키보드로 닿지 않아 mockups 를 button 으로 고친 판(08-24). 지도 핀은 SVG <g> 라 초점을 못 받는다",
    "game__sp_entry.html": "위 sp_map 과 같은 사정 — .sp-loc-card 의 버튼 기본값 되돌림"
    "(text-align·font·color)이 공유 <style> 블록에 들어갔다",
    "game__sp_puzzle.html": "같음",
    "activity__write.html": "조합 문제의 머리를 고쳤다(08-24) — 작은 동그란 버튼 하나뿐이라"
    " 소리를 들어야 하는 문제인 줄 몰랐다. 다른 듣기 문제(AudioRow)처럼 큰 재생 버튼 +"
    " 파형으로 바꾸고 힌트 버튼을 더했다. 재생 버튼 라벨도 바꿨다 — 전에는"
    " \"가 발음 듣기\" 라 스크린리더에 정답이 그냥 읽혔다."
    " 그 뒤 한 번 더 고쳤다 — 흉내 내지 말고 다른 화면과 같은 AudioRow 컴포넌트를"
    " 쓰고, 풀어야 할 글자는 점선 박스(.combo-target)로 줄을 나눴다",
    "activity__write3.html": "같음",
    "nav__jamo__resume.html": "활동 이름을 기획자가 다시 정했다(08-24) —"
    " \"자음-모음 조합하고 쓰기\" → \"자음-모음 조합하기\". 앱이 쓰는 module.ts 와"
    " mockups 를 같이 바꿨고, captured/ 는 그때 뜬 날것이라 그대로 둔다",
}


def mockup_twins() -> tuple[list[str], list[str]]:
    """phase1/captured/ 와 app/src/mockups/ 가 갈라졌는지 본다.

    captured/ 는 목업에서 뜬 날것이고 app/src/mockups/ 가 정본이다
    (parity 가 읽는 것이 후자뿐이다). 둘은 47개 중 44개가 바이트까지
    같아서, 갈라지면 아무 경고 없이 통과한다 — 실제로 홈 셋이 그랬다.

    돌려주는 것은 (문제, 눈감아 준 것) 둘이다.
    """
    a, b = HERE / "captured", APP / "src" / "mockups"
    if not a.is_dir() or not b.is_dir():
        return ([], [])
    bad: list[str] = []
    ok: list[str] = []
    an = {p.name for p in a.glob("*.html")}
    bn = {p.name for p in b.glob("*.html")}
    for only, where in ((an - bn, "captured/ 에만"), (bn - an, "app/src/mockups/ 에만")):
        for n in sorted(only):
            bad.append(f"[목업 쌍둥이] {n} 이 {where} 있다")
    for n in sorted(an & bn):
        if (a / n).read_bytes() == (b / n).read_bytes():
            continue
        if n in TWIN_ALLOW:
            ok.append(f"{n} — {TWIN_ALLOW[n]}")
        else:
            bad.append(
                f"[목업 쌍둥이] {n} 의 내용이 갈렸다 — parity 는 app/src/mockups/ 만 본다.\n"
                f"           일부러라면 TWIN_ALLOW 에 이유를 적어라"
            )
    for n in sorted(TWIN_ALLOW):
        if n in an & bn and (a / n).read_bytes() == (b / n).read_bytes():
            bad.append(f"[목업 쌍둥이] {n} 은 이제 같다 — TWIN_ALLOW 에서 빼라")
    return (bad, ok)


def subsections(body: str) -> dict[str, str]:
    """그 문서가 가진 하위절 번호 → 제목.

    h2 는 병합할 때 다시 매기면서 h3 은 그대로 두는 일이 생긴다. 그러면
    "§14.1" 을 인용하는데 그 자리의 제목은 "3.1" 이라 사람이 못 찾는다 —
    실제로 shell_spec_v1 에서 62곳이 그랬다. 접미가 붙은 것(6.5-b)도 받는다.
    """
    out: dict[str, str] = {}
    for m in re.finditer(r"<h[34][^>]*>(.*?)</h[34]>", body, re.S):
        t = re.sub(r"\s+", " ", re.sub(r"<[^>]*>", "", m.group(1))).strip()
        mm = re.match(r"(\d+\.\d+(?:-[a-z])?)", t)
        if mm:
            out.setdefault(mm.group(1), t)
    return out


# 합치기 전 이름으로 계속 인용되는 것들. 흡수한 문서의 절 번호가 그대로
# 남아 있으면 여기 적어야 인용이 어디로 가는지 검사기가 안다.
#   G2      = 옛 G2_shell_and_state_spec_v1 → shell_spec_v1 §0~§10 (번호 그대로)
#   셸 명세 · 컴포넌트 명세 · 구현 사양 = shell_spec_v1 의 세 층
ALIAS = {
    "G2": "shell_spec_v1",
    "셸 명세": "shell_spec_v1",
    "컴포넌트 명세": "shell_spec_v1",
    "구현 사양": "shell_spec_v1",
    # 맨 이름의 "명세" 는 개발 명세다. "셸 명세" 와 겹치므로 아래 귀속은
    # 끝 위치가 같으면 긴 별칭을 먼저 쓴다 — 안 그러면 셸 명세가 여기로 끌려온다
    "명세": "dev_spec_v1",
}


def sub_cites(live: set[str], raw: dict[str, str], text: dict[str, str]) -> list[str]:
    """§N.M 인용이 실제 h3 에 닿는지 본다. 검사 2 는 정수만 봐서 못 잡는다."""
    subs = {n: subsections(raw[n]) for n in live}
    out: list[str] = []
    for src, body in text.items():
        flat = re.sub(r"\s+", " ", body)
        for m in re.finditer(r"§\s?(\d+\.\d+)", flat):
            sec = m.group(1)
            lead = flat[max(0, m.start() - 70):m.start()]
            owner, at = None, -1
            for cand in live:
                i = lead.rfind(cand)
                if i > at:
                    owner, at = cand, i
            best = None  # (끝 위치, 별칭 길이, 대상)
            for alias, tgt in ALIAS.items():
                i = lead.rfind(alias)
                if i < 0 or tgt not in live:
                    continue
                cand = (i + len(alias), len(alias), tgt)
                if best is None or cand[:2] > best[:2]:
                    best = cand
            if best and best[0] > at + 1:
                owner, at = best[2], best[0]
            # 이름도 별칭도 앞에 없으면 자기 문서를 말하는 것으로 본다
            if at < 0:
                owner = src if src in live else None
            if owner is None:
                continue
            have = subs[owner]
            if not have:
                # 번호 붙은 h3 이 아예 없는 문서다. 전에는 여기서 건너뛰어서
                # 12개 중 10개 문서로 들어오는 §N.M 인용을 한 번도 안 봤다.
                ctx = re.sub(r"\s+", " ", flat[max(0, m.start() - 45):m.end() + 20]).strip()
                out.append(
                    f"[하위절] {src} → {owner} §{sec} 인데 그 문서에는 번호 붙은 h3 이 없다\n"
                    f"           …{ctx}…"
                )
                continue
            if sec in have or any(k.startswith(sec + "-") for k in have):
                continue
            ctx = re.sub(r"\s+", " ", flat[max(0, m.start() - 45):m.end() + 20]).strip()
            out.append(
                f"[하위절] {src} → {owner} §{sec} 인데 그 문서에 그 번호의 h3 이 없다\n"
                f"           …{ctx}…"
            )
    return out


def dup_subsections(live: set[str], raw: dict[str, str]) -> list[str]:
    """한 문서 안에서 같은 하위절 번호가 둘 이상. 병합하면 생긴다."""
    out: list[str] = []
    for n in sorted(live):
        seen: dict[str, int] = {}
        for m in re.finditer(r"<h[34][^>]*>(.*?)</h[34]>", raw[n], re.S):
            t = re.sub(r"\s+", " ", re.sub(r"<[^>]*>", "", m.group(1))).strip()
            mm = re.match(r"(\d+\.\d+)(?![\d-])", t)
            if mm:
                seen[mm.group(1)] = seen.get(mm.group(1), 0) + 1
        for k, c in sorted(seen.items()):
            if c > 1:
                out.append(f"[하위절 중복] {n} 에 §{k} 이 {c}개 있다 — 병합 뒤 번호를 다시 매겨라")
    return out


def cross_anchors() -> list[str]:
    """href="다른문서.html#앵커" 의 앵커가 그 문서에 있나.

    같은 파일 안의 #sN 만 보면 이 축이 빈다 — shell_spec_v1 이
    screens_uiux.html#act 를 셋 걸어 두었는데 그 문서의 id 는 mk-act 였다.
    눌러도 문서 맨 위로 갈 뿐이라 사람이 조용히 길을 잃는다.
    """
    ids: dict[str, set[str]] = {}
    for f in HERE.glob("*.html"):
        ids[f.name] = set(re.findall(r'\bid="([^"]+)"',
                                     f.read_text(encoding="utf-8", errors="replace")))
    out: list[str] = []
    for f in sorted(HERE.glob("*.html")):
        body = f.read_text(encoding="utf-8", errors="replace")
        for m in re.finditer(r'href="([A-Za-z0-9_.\-]+\.html)#([^"]+)"', body):
            tgt, frag = m.group(1), m.group(2)
            if tgt not in ids:
                out.append(f"[앵커] {f.stem} → {tgt} 가 없다")
            elif frag not in ids[tgt]:
                near = ", ".join(sorted(x for x in ids[tgt] if frag in x)[:3])
                hint = f" (비슷한 id: {near})" if near else ""
                out.append(f"[앵커] {f.stem} → {tgt}#{frag} 앵커가 없다{hint}")
    return out


def ledger_claims(text: dict[str, str]) -> list[str]:
    """문서가 원장 정본 버전을 못박아 두면 잡는다.

    생성기(build-content.py)는 루트의 v*.xlsx 중 가장 높은 번호를 고른다.
    즉 정본은 기계가 아는 값인데, BLOCKERS 가 "원장 정본은 v28 이다" 라고
    산문에 적어 두었다가 v29·v30 이 나오며 그 문서만 낡았다.
    번호를 적으려면 지금 것과 같아야 한다.
    """
    best, name = -1, None
    for p in ROOT.glob("*.xlsx"):
        m = re.match(r"글로벌_교재기반_콘텐츠_v(\d+)\.xlsx$",
                     unicodedata.normalize("NFC", p.name))
        if m and int(m.group(1)) > best:
            best, name = int(m.group(1)), p.name
    if name is None:
        return []
    out: list[str] = []
    pat = re.compile(r"원장[^\n]{0,12}정본[^\n]{0,40}?v(\d+)|정본[^\n]{0,12}원장[^\n]{0,40}?v(\d+)")
    # 파일명으로 못박는 것도 잡는다 — README 가 표 머리에 `…_v30.xlsx` 라 적어 두고
    # 낡았는데 위 패턴은 "정본은 vN" 꼴만 봐서 놓쳤다(2026-08-25).
    # 다만 시점 기록은 옛 판을 정당하게 부른다("v24 가 400행을 날렸다") — 그래서
    # 같은 줄에서 40자 안에 '정본' 이 있을 때만 본다.
    fname = re.compile(
        r"글로벌_교재기반_콘텐츠_v(\d+)(?:_[^\s`]*)?\.xlsx[^\n]{0,40}?정본"
        r"|정본[^\n]{0,40}?글로벌_교재기반_콘텐츠_v(\d+)(?:_[^\s`]*)?\.xlsx"
    )
    for src, body in text.items():
        flat = re.sub(r"\s+", " ", body)
        for m in pat.finditer(flat):
            got = int(m.group(1) or m.group(2))
            if got != best:
                out.append(
                    f"[원장 버전] {src} 가 정본을 v{got} 이라 적었는데 지금은 v{best} 다\n"
                    f"           번호를 적지 말고 '가장 높은 번호' 라고 써라"
                )
        for m in fname.finditer(flat):
            got = int(m.group(1) or m.group(2))
            if got != best:
                out.append(
                    f"[원장 버전] {src} 가 정본을 파일명 v{got} 으로 못박았는데 지금은 v{best} 다\n"
                    f"           `글로벌_교재기반_콘텐츠_v*.xlsx` 로 적어라"
                )
    return out


def data_source_claims() -> list[str]:
    """문서가 "화면이 X 를 읽는다" 고 하면 실제 import 를 센다.

    8/24 에 자모 라우트만 원장으로 옮기고 "화면이 n8_jamo 를 읽는다" 고 적었는데
    화면 여섯은 그대로 problem.ts 를 읽고 있었다. 라우트까지만 보고 화면 안을
    안 열어 본 것이다. 그 축을 기계가 본다.
    """
    jamo = APP / "src" / "components" / "learn" / "jamo"
    if not jamo.is_dir():
        return []
    old = [f.name for f in jamo.glob("*.tsx")
           if 'from "@/shared/data/problem"' in f.read_text(encoding="utf-8", errors="replace")]
    if not old:
        return []
    return [
        "[데이터 정본] 자모 화면이 아직 problem.ts 를 읽는다 — "
        f"{', '.join(sorted(old))}\n"
        "           문서는 원장(n8_jamo)이 정본이라고 말한다. 둘 중 하나가 틀렸다"
    ]


def index_covers(live: set[str]) -> list[str]:
    """색인이 정본 전부를 담고 있는지 본다.

    이 저장소가 문서를 못 따라잡은 이유는 목록이 두 곳(README 표 ·
    handoff §01)에 있었던 것이다. 한쪽만 고쳐지니 25 와 26 으로 갈렸다.
    목록을 phase1/INDEX.md 하나로 줄이고, 그 하나가 비면 검사기가 잡는다.
    """
    idx = HERE / "INDEX.md"
    if not idx.exists():
        return ["[색인] phase1/INDEX.md 가 없다 — 문서 목록이 살 곳이 하나 있어야 한다"]
    body = idx.read_text(encoding="utf-8", errors="replace")
    out: list[str] = []
    for n in sorted(live):
        if n not in body:
            out.append(
                f"[색인] {n} 이 INDEX.md 에 없다 — 문서를 만들었으면 색인에 한 줄 넣어라"
            )
    # 색인이 없는 파일을 부르는 경우
    for m in re.finditer(r"`([A-Za-z0-9_.가-힣-]+)\.html`", body):
        if m.group(1) not in live:
            out.append(f"[색인] INDEX.md 가 없는 문서 {m.group(1)} 을 가리킨다")

    # 표의 같은 칸에 같은 문서가 두 줄. 문서를 합치면 두 줄이 남는다 —
    # "빠짐없이 있나" 만 보면 통과하므로 따로 본다.
    rows: dict[str, int] = {}
    for line in body.splitlines():
        m = re.match(r"\s*\|\s*`([A-Za-z0-9_.가-힣-]+)\.html`\s*\|", line)
        if m:
            rows[m.group(1)] = rows.get(m.group(1), 0) + 1
    for n, c in sorted(rows.items()):
        if c > 1:
            out.append(
                f"[색인] {n} 이 표에 {c}줄 있다 — 문서를 합쳤으면 줄도 합쳐라"
            )
    return out


def main() -> int:
    text, raw, paths = load()
    # 정본은 phase1/*.html 뿐이다 — 문과 메모는 인용의 대상이 아니다
    live = {
        n for n in text
        if not n.startswith("(문) ") and not n.startswith("(메모) ")
    }
    dead = {p.stem for p in (HERE / "_superseded").glob("*.html")}
    secs = {n: sections(raw[n]) for n in live}

    problems: list[str] = []

    # ── 1·4. 파일 참조와 옛 경로
    for src, body in text.items():
        skip = redirected(body)
        for name in sorted(dead):
            if name in skip:
                continue
            # _superseded/ 를 붙이지 않고 옛 이름만 부르는 곳
            for m in re.finditer(re.escape(name), body):
                lead = body[max(0, m.start() - 14):m.start()]
                if "_superseded/" in lead:
                    continue
                wide = body[max(0, m.start() - 140):m.end() + 140]
                snip = re.sub(r"\s+", " ", body[max(0, m.start() - 60):m.end() + 60]).strip()
                # 이동 자체를 서술하는 문장은 봐준다 — "옮겼다/옮긴/옮길" 을 어간으로 잡고,
                # 근처에 _superseded 가 있으면 그 대목을 설명하는 중이라고 본다
                if "_superseded" in wide:
                    continue
                if any(w in snip for w in ("대체", "옮", "폐기", "틀렸", "옛 경로", "정본처럼")):
                    continue
                problems.append(f"[옛 경로] {src} → {name} (앞에 _superseded/ 가 없다)\n           …{snip}…")

    # ── 2. 절 인용: §N 앞쪽에서 "가장 가까운" 문서 이름 하나에만 귀속시킨다.
    # 표의 칸끼리는 서로 가까워서, 범위 안의 모든 이름에 걸면 옆 칸의 § 를 잘못 붙인다.
    for src, body in text.items():
        for m in re.finditer(r"§\s?(\d+)", body):
            sec = str(int(m.group(1)))
            lead = body[max(0, m.start() - 60):m.start()]
            nearest, at = None, -1
            for tgt in live:
                i = lead.rfind(tgt)
                if i > at:
                    nearest, at = tgt, i
            if nearest is None or not secs.get(nearest):
                continue
            # 이름과 § 사이에 다른 문서 이름이 끼면 귀속이 불확실하니 건너뛴다
            between = lead[at + len(nearest):]
            if any(o in between for o in live if o != nearest):
                continue
            if sec not in secs[nearest]:
                have = ",".join(sorted(secs[nearest], key=int)) or "(없음)"
                ctx = re.sub(r"\s+", " ", body[max(0, m.start() - 50):m.end() + 20]).strip()
                problems.append(
                    f"[절 인용] {src} → {nearest} §{m.group(1)} 인데 그 문서의 절은 {have}\n"
                    f"           …{ctx}…"
                )

    # ── 2b. 자기 절 인용: 이름 없이 그냥 §N 이라 쓴 것은 자기 문서의 절이다.
    # 2 번은 "문서이름 §N" 만 본다. 그래서 문서를 합치면서 절 번호를 다시 붙일 때
    # 정작 그 문서 안의 §N 이 옛 번호로 남는 것을 못 잡았다 — 실제로 asis_v1 에
    # 12곳이 그렇게 남아 있었고 사람이 눈으로 찾았다. 그걸 여기서 잡는다.
    #
    # 본문은 남의 문서를 사람 말로도 부른다("구현 사양 §8" · "G2 §5-1"). 그런 것은
    # 자기 절이 아니므로 건너뛴다. 별칭 목록이 이 검사의 정확도를 정한다.
    ALIAS_OTHER = [
        "BLOCKERS", "README", "CLAUDE", "INDEX", "G1", "G2", "저작 사양",
        "구현 사양", "컴포넌트 명세", "셸 명세", "개발 명세", "설계 문서", "원장",
    ]
    ALIAS_SELF = ["이 문서", "같은 문서", "본 문서"]
    for src, body in text.items():
        own = secs.get(src)
        if not own:
            continue
        for m in re.finditer(r"§\s?(\d+)", body):
            lead = re.sub(r"<[^>]*>", " ", body[max(0, m.start() - 110):m.start()])
            # "§4·§7" 처럼 이어지면 앞의 사슬을 걷어내고 그 앞을 본다
            while True:
                t = re.sub(r"§\s*\d+[\w.\-]*\s*[)）]?\s*[·,]\s*$", "", lead)
                if t == lead:
                    break
                lead = t
            tail = lead[-70:]
            best, at = "self", -1
            for tgt in live | dead:
                if tgt == src:
                    continue
                i = tail.rfind(tgt)
                if i > at:
                    best, at = "other", i
            for a in ALIAS_OTHER:
                i = tail.rfind(a)
                if i > at and len(tail) - i <= 40:
                    best, at = "other", i
            for a in ALIAS_SELF:
                i = tail.rfind(a)
                if i > at:
                    best, at = "self", i
            if best != "self":
                continue
            sec = str(int(m.group(1)))
            if sec not in own:
                have = ",".join(sorted(own, key=int)) or "(없음)"
                ctx = re.sub(r"\s+", " ", re.sub(r"<[^>]*>", " ", body[max(0, m.start() - 56):m.end() + 18])).strip()
                problems.append(
                    f"[자기 절] {src} 가 자기 §{m.group(1)} 을 부르는데 이 문서의 절은 {have}\n"
                    f"           …{ctx}…"
                )

    # ── 2c. id 중복과 라벨 불일치. 절 번호를 다시 붙일 때 눈에 보이는 번호만 고치고
    # id 는 원본 그대로 남기기 쉽다 — asis_v1 · G1 이 그랬고 앵커가 겹쳐 있었다.
    from collections import Counter
    for f in sorted(HERE.glob("*.html")):
        # 이름을 raw 로 두면 main 의 문서 사전(raw)을 덮어써서 뒤의 검사가 죽는다
        src_html = f.read_text(encoding="utf-8", errors="replace")
        nos = re.sub(r"<script[^>]*>.*?</script>", "", src_html, flags=re.S)
        ids = re.findall(r'\bid="([^"]+)"', nos)
        for k, v in Counter(ids).items():
            if v > 1:
                problems.append(f'[id 중복] {f.stem} 에 id="{k}" 가 {v}곳 있다 — 앵커가 겹친다')
        for mh in re.finditer(r"<h2([^>]*)>(.*?)</h2>", nos, re.S):
            head, inner = mh.group(1), mh.group(2)
            mid = re.search(r'id="(s[0-9a-z]+)"', head)
            sp = re.match(r'\s*<span class="no?">\s*(\d+)\s*-?\s*([a-z]?)\s*</span>', inner)
            if not (mid and sp):
                continue
            want = "s" + sp.group(1) + sp.group(2)
            if mid.group(1) != want:
                problems.append(
                    f'[id 라벨] {f.stem} 의 h2 "{strip_tags(inner)[:24]}" 는 '
                    f'id="{mid.group(1)}" 인데 라벨은 {want[1:]} 다'
                )

    # ── 2d. 링크 대상이 실제로 있나.
    # 이 검사기는 본문을 태그 제거해서 읽는다 — 그래서 href 안의 파일 이름을
    # 한 번도 본 적이 없었다. 실제로 shell_spec_v1 이 옮겨간 문서를 두 곳
    # 링크하고 있었고 검사 여덟 개가 다 통과했다. 링크는 사람이 바로 부딪히는 곳이다.
    for f in sorted(HERE.glob("*.html")):
        # <style>·<script> 안의 문자열은 링크가 아니다 (CSS 선택자 a[href=…] ·
        # JS 템플릿 src="${…}"). 먼저 떼어낸다.
        raw_html = re.sub(r"<(script|style)\b.*?</\1>", " ",
                          f.read_text(encoding="utf-8", errors="replace"), flags=re.S | re.I)
        for attr in ("href", "src"):
            for m in re.finditer(rf'{attr}="([^"]+)"', raw_html):
                t = m.group(1).strip()
                if "${" in t or t.startswith("/"):
                    continue
                if not t or t.startswith(("http://", "https://", "#", "mailto:", "data:", "//", "javascript:")):
                    continue
                target = t.split("#")[0].split("?")[0]
                if not target:
                    continue
                if not (f.parent / target).exists():
                    ctx = re.sub(r"\s+", " ", strip_tags(raw_html[max(0, m.start() - 70):m.end() + 30])).strip()
                    problems.append(
                        f"[죽은 링크] {f.stem} 의 {attr}=\"{t}\" — 그 파일이 없다\n           …{ctx}…"
                    )

    # ── 3. 고아
    # 메모는 문이 아니다 — 메모만 가리키는 문서는 여전히 고아로 본다
    for n in sorted(live):
        cited = any(
            n in body
            for src, body in text.items()
            if src != n and not src.startswith("(메모) ")
        )
        if not cited:
            problems.append(f"[고아] {n} — 아무 문서도, README·BLOCKERS 도 가리키지 않는다")

    # ── 5. 숫자 주장
    problems += claims(live, text)

    # ── 원장 버전 · 데이터 정본
    problems += ledger_claims(text)
    problems += data_source_claims()

    # ── 7. 색인 정합성
    problems += index_covers(live)

    # ── 파일 간 앵커
    problems += cross_anchors()

    # ── 8. 하위절 인용 · 9. 하위절 번호 중복
    problems += sub_cites(live, raw, text)
    problems += dup_subsections(live, raw)

    # ── 6. 목업 쌍둥이
    twin_bad, twin_ok = mockup_twins()
    problems += twin_bad

    # ── 결과
    parity = parity_screens()
    memos = len(list(HERE.glob("*.txt")))
    kinds = len(set(re.findall(r"^  \[([^\]]+)\]", __doc__ or "", re.M)))
    print(
        f"정본 {len(live)}개 · 폐기본 {len(dead)}개 · "
        f"문 {len(DOORS)}개 + 색인 1 · 메모 {memos}개 · 검사 {kinds}종"
    )
    print(
        f"센 것: 목업 대조 {sum(parity.values())}화면("
        + " + ".join(f"{k} {v}" for k, v in parity.items() if v)
        + ") · "
        f"절 인용 {sum(t.count('§') for n, t in text.items() if n in live)}개"
    )
    for line in twin_ok:
        print(f"눈감아 준 목업 차이: {line}")
    if not problems:
        print("통과 — 끊어진 참조 없음")
        return 0
    print(f"\n걸린 것 {len(problems)}개\n")
    for p in problems:
        print("  " + p)
    return 1


if __name__ == "__main__":
    sys.exit(main())
