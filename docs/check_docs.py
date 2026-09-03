#!/usr/bin/env python3
"""문서 구조와 기계 판독 계약을 검사한다.

문서를 합치거나 옮기거나 절 번호를 바꿀 때 쓴다. 사람이 "다 고쳤다" 고 믿는 대신
이것을 돌려서 확인한다 — 이 저장소는 문서를 이름과 절 번호로 인용하기 때문에
한 곳을 옮기면 조용히 끊어지는 곳이 생긴다.

  python3 docs/check_docs.py

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
  [색인]         정본이 docs/INDEX.md 에 빠졌거나 한 문서가 두 줄인 경우
  [원장 버전]    문서가 원장 정본 버전을 못박았는데 지금 것과 다른 경우
  [데이터 정본]  문서가 말하는 데이터 출처와 코드의 import 가 다른 경우
  [사실 중복]    기계가 세는 수를 주인 문서 밖에서 또 적은 경우 — claims() 의 OWNER
  [문구 지뢰]    한 번 거짓이라 밝혀진 표현이 남아 있거나 되살아난 경우 — STALE_PHRASES
  [잴 수 없었다]  세는 함수가 0 을 낸 경우 — 원본이 깨지면 그 검사가 조용히 사라진다
  [분량]         CLAUDE.md 가 상한을 넘은 경우 — 세션마다 읽히는 유일한 문서다
  [관찰 기준]    문서가 선언한 관찰 경로가 기준 커밋 이후 바뀐 경우 — <!-- 관찰: … @ 커밋 -->
  [관찰 확인]    기준 커밋만 옮기고 「확인」 줄은 안 쓰거나 그대로 둔 경우
  [화면 승격]    _snapshots/ 와 screens_ref/ 가 갈라졌는데 이력 문서에 없는 경우
  [상태 계약]    project_status.json 이 공통 상태 네 개·실제 CI·정책 계약과 다른 경우

[숫자 주장] 과 [하위절] 이 값어치가 크다. 참조가 끊어졌는지만 보면
작업이 진행되며 문서의 수와 절 번호가 조용히 낡는 것을 못 잡는다 —
목업 대조 화면 수가 22·24·27 로 갈렸고, 문서를 합치며 h2 만 다시 매기고
h3 을 두어서 §N.M 인용 59곳이 닿지 않았다. 둘 다 "통과" 뒤에 있었다.

**통과는 "문서가 정확하다" 가 아니다.** "지금 세는 축에서 어긋난 게 없다" 다.
새 축은 사람이 찾아야 한다 — 회차마다 하나씩 나왔다.

끝에 0 을 내면 통과다. 하나라도 걸리면 1 을 낸다.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

from project_contract import validate_contract

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
# 저장소의 문. CLAUDE.md 는 세션마다 자동으로 읽히므로 여기 적힌 수가
# 틀리면 피해가 가장 크다 — 그래서 검사 대상에 넣는다.
DOORS = [ROOT / "CLAUDE.md", ROOT / "README.md", ROOT / "BLOCKERS.md",
         ROOT / "DESIGN.md"]

# 문서 이름에 붙는 확장자 없는 형태도 인용에 쓰인다
NAME_RE = r"[A-Za-z0-9_.가-힣-]+"


def strip_tags(s: str) -> str:
    s = re.sub(r"<(script|style)\b.*?</\1>", " ", s, flags=re.S | re.I)
    return re.sub(r"<[^>]*>", " ", s)


def load() -> tuple[dict[str, str], dict[str, str], dict[str, Path]]:
    """정본·폐기본의 본문(태그 제거)과 경로를 모은다.

    코퍼스에 두 종류가 들어간다. 이름의 접두로 갈라 놓아야 검사마다
    대상을 골라 쓸 수 있다.
      (접두 없음)  docs/*.html — 정본. 인용의 대상이 되는 것
      "(문) "      README.md · BLOCKERS.md — 저장소의 문
    """
    live = {p.stem: p for p in sorted(HERE.glob("*.html"))}
    dead = {p.stem: p for p in sorted((HERE / "_superseded").glob("*.html"))}
    text = {n: strip_tags(p.read_text(encoding="utf-8", errors="replace")) for n, p in live.items()}
    raw = {n: p.read_text(encoding="utf-8", errors="replace") for n, p in live.items()}
    for m in DOORS:
        if m.exists():
            text["(문) " + m.name] = m.read_text(encoding="utf-8")
            raw["(문) " + m.name] = text["(문) " + m.name]
    # docs/*.md 도 코퍼스에 넣는다 — INDEX.md 만 넣던 자리다.
    #
    # **2026-09-01 에 이것 때문에 데였다.** `developer_tasks.md`(개발자에게 넘기는
    # 인계서)에 「번들의 구 앱 덤프는 이것뿐이다」가 거짓인 채로 남아 있었는데
    # **STALE_PHRASES 가 그 파일을 아예 안 보고 있었다** — 코퍼스가 docs/*.html 과
    # 루트의 문 넷뿐이었다. 지뢰를 심어도 인계서는 면제였다는 뜻이다.
    # 관찰 기준 검사는 `*.md` 까지 보는데(아래 sorted(HERE.glob("*.md"))) 여기만
    # 안 봤다 — **같은 폴더를 두 검사가 다르게 세고 있었다.**
    for m in [HERE / "INDEX.md"] + sorted(HERE.glob("*.md")):
        if not m.exists() or ("(문) " + m.name) in text:
            continue
        text["(문) " + m.name] = m.read_text(encoding="utf-8", errors="replace")
        raw["(문) " + m.name] = text["(문) " + m.name]
    return text, raw, {**live, **{n: dead[n] for n in dead}}


# "옛이름.html → _superseded/" 꼴의 줄. 문서 맨 위에 이걸 적어 두면
# 그 이름은 그 문서 안에서 봐준다 — 어디로 갔는지 이미 밝혔다는 뜻이다.
# 시점 기록에서 옛 파일이 어디로 갔는지 선언하기 위한 장치다.
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
    # 마크다운 `## N. 제목` · `## N-b. 제목`.
    # **2026-08-30 까지 이걸 안 읽었다.** docstring 은 "N. 제목 도 받는다" 고
    # 적어 두었는데 코드는 h2 태그만 봤다 — 그래서 `.md` 문서로 가는 §N 인용이
    # **한 번도 검사되지 않았다.** BLOCKERS.md 는 가장 많이 인용되는 .md 다.
    # 실제로 CLAUDE.md 가 두 곳에서 BLOCKERS §3-b 를 가리키고 있었는데
    # 그 절은 전혀 다른 이야기였고, 이 검사는 조용히 지나갔다.
    for t in re.findall(r"^#{2}\s+(.+)$", body, re.M):
        m = re.match(r"(\d+)", t.strip())
        if m:
            out.add(str(int(m.group(1))))
    return out


# ─────────────────────────────────────────────────────────────────────
# 세어서 알 수 있는 것
# ─────────────────────────────────────────────────────────────────────

APP = ROOT / "app"
# `CLAUDE.md` 분량 상한 — 기획 확정 2026-08-30. 왜 이 파일만인지는 claude_md_size()
#
# **글자다. 바이트가 아니다.** 처음에 `wc -c` 값(20,154)을 보고 22,000 으로 잡았는데
# 그건 바이트고 파이썬 `len()` 은 글자다 — 한글이 3바이트라 실제는 10,995자였다.
# 그래서 상한이 실제의 두 배가 되어 **검사가 있으나 마나였다**(하네스가 잡았다).
CLAUDE_MAX_LINES = 300
CLAUDE_MAX_CHARS = 12_000

HANGUL_NUM = {"하나": 1, "둘": 2, "셋": 3, "넷": 4, "다섯": 5, "여섯": 6,
              "일곱": 7, "여덟": 8, "아홉": 9, "열": 10}

# 숫자 자리에 쓸 조각. **`(\d+)` 만 쓰면 한글 수사를 놓친다** — 비교하는 쪽은
# 위 표로 「넷」을 4 로 읽을 줄 아는데, 2026-08-29 까지 **어느 패턴도 그것을
# 캡처하지 않았다.** 이 저장소 문서는 작은 수를 거의 한글로 쓰므로
# (「상태 넷」·「갈래 다섯」) 사실상 작은 수는 아무도 안 보고 있었다.
# 페이월 상태 수를 검사에 태우다가 발견했다 — 넷→다섯 을 넣어도 통과했다.
NUM = r"(\d+|하나|둘|셋|넷|다섯|여섯|일곱|여덟|아홉|열)"


def ported_screens() -> int | None:
    """masterplan §15 「화면 — 다 됐다」 표의 수 칸을 더한다.

    CLAUDE.md 가 "이식한 화면 25" 라고 적으면서 **그 표의 합계**라고 말한다.
    그런데 둘은 서로 다른 문서라 한쪽만 고쳐지면 조용히 갈린다 — 실제로 갈렸다
    (masterplan 이 `/learn/*` 를 7 로 옮겼는데 CLAUDE.md 는 6·24 로 남았다,
    2026-08-26). 그래서 표를 세어 CLAUDE.md 의 수와 견준다.

    수 칸이 아닌 행(— 을 넣어 주인을 가리킨 행)은 건너뛴다.
    """
    f = HERE / "masterplan_v3.html"
    if not f.exists():
        return None
    body = f.read_text(encoding="utf-8", errors="replace")
    i = body.find("화면 — 다 됐다")
    if i < 0:
        return None
    m = re.search(r"<table.*?</table>", body[i:], re.S)
    if not m:
        return None
    total = 0
    for row in re.findall(r"<tr>(.*?)</tr>", m.group(), re.S):
        cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.S)
        if len(cells) < 2:
            continue
        num = re.sub(r"<[^>]+>", "", cells[1]).strip()
        if num.isdigit():
            total += int(num)
    return total or None


def parity_screens() -> dict[str, int]:
    """목업 대조가 그리는 화면 수를 스크립트에서 센다 — 갈래별로.

    돌려 보지 않고 세는 것이 중요하다. .parity-out/ 은 .gitignore 밖이라
    받는 사람의 저장소에는 없다.

    갈래를 접두사로 가른다. 전에는 `SCREENS.x =` 꼴을 전부 "내비" 로 셌는데,
    그 꼴을 쓰는 것이 내비뿐이었을 때만 맞는 말이었다. 지금은 VocaShot 과
    게임 넷도 같은 꼴로 들어와서, 46화면을 "활동 22 + 내비 24" 라고 찍고
    있었다 — 내비는 다섯뿐이다.
    """
    out = {"활동": 0, "내비": 0, "VocaShot": 0, "게임": 0, "표현클립": 0}
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
            elif name.startswith("clip__"):
                out["표현클립"] += 1
            else:
                # 접두사가 없는 것은 활동으로 본다 — 옛 꼴이 그랬다
                out["활동"] += 1
    return out


def mockup_captures() -> int:
    """app/src/mockups/*.html — 목업에서 뜬 캡처 파일 수.

    문서가 "캡처 N개" 라고 자주 적는데 세는 축이 없어서 낡아도 몰랐다.
    2026-08-24 검증에서 이 표현이 다섯 곳에 손으로 적혀 있는 것을 찾았다.
    """
    d = APP / "src" / "screens_ref"
    return len(list(d.glob("*.html"))) if d.is_dir() else 0


def lesson_activities() -> int:
    """`catalog.act` 의 항목 수 — **한 과를 열면** 나오는 활동이 몇인가.

    **이 축은 2026-08-31 까지 검사되지 않았다.** 그래서 `README` 는 「활동 일곱 종」,
    `INDEX` 는 「활동 8종」이라 적고 있었고, 어느 쪽이 틀렸는지 아무도 몰랐다.
    세어 보니 **둘 다 참이고 세는 단위가 달랐다** — 화면 수 20/23/26 과 같은 함정이다.

      일곱 = 한 과를 열면 나오는 활동 (`catalog.act`)
      여덟 = 저작 **라인업** — 위 일곱 + 자모(JM). 자모는 1급 1~3과 한정이라
             「한 과를 열면」에는 안 들어간다. `G1_content_gate_v1` §354 가 정의처다

    그래서 **일곱만 센다.** 여덟은 일곱에서 파생된 값이라 따로 세면 두 축이 서로를
    베낀다. 대신 문서가 여덟을 말할 때 「라인업」이라는 말을 붙이게 했다 —
    아래 패턴이 그 말을 단서로 둘을 가른다.
    """
    f = APP / "src" / "i18n" / "locales" / "ko.ts"
    if not f.exists():
        return 0
    m = re.search(r"\n\t\tact: \{(.*?)\n\t\t\}", f.read_text(encoding="utf-8", errors="replace"), re.S)
    if not m:
        return 0
    return len(re.findall(r'^\t\t\t"?[\w-]+"?:', m.group(1), re.M))


def jamo_rows() -> int:
    """`n8_jamo.json` 의 행 수 — 자모 문항이 몇인가.

    **왜 세나.** 이 수가 2026-08-31 기준 **문서 여섯 곳**에 손으로 적혀 있었다
    (`CLAUDE.md` · `README.md` · `BLOCKERS.md` 셋 · `developer_tasks.md` ·
    `jamo_authoring_spec_v1.html`). 한 사건이 여섯 자리에 복사된 것이고,
    복사본은 저마다 따로 낡는다. 그날 넷을 걷고 이 검사를 붙였다.

    **주인을 두지 않는다.** `BLOCKERS.md` §2 는 검수 이력의 주인이고
    `jamo_authoring_spec_v1.html` 은 저작자가 그것만 보고 일하는 명세라,
    둘 다 제 몫으로 이 수를 말한다. 대신 **둘 다 검사받게** 한다 —
    「자모 활동 수」와 같은 처분이다.

    이 파일은 산출물이지만 **추적되므로 CI 에서도 셀 수 있다.**
    정작 「전부 `reviewed` 냐」는 원장 안에 있어 기계가 못 본다 — `BLOCKERS.md` §2-c.
    """
    f = APP / "src" / "shared" / "data" / "n8_jamo.json"
    if not f.exists():
        return 0
    try:
        d = json.loads(f.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return 0
    return len(d) if isinstance(d, list) else 0


def jamo_activities() -> int:
    """`catalog.jamoAct` 의 항목 수 — 한글 파트 활동이 몇인가.

    2026-08-29 에 masterplan §0 이 「다섯」으로 적고 있는 것을 찾았다. 실제는 여섯이고
    저장소의 다른 곳은 전부 여섯이다(§15 표 · CLAUDE.md). **자음-모음 조합하기가
    `write`·`write3` 두 단계인데 이름이 같아서** 사람이 세면 하나로 뭉친다 —
    목업도 그 둘을 한 버튼 안에서 상태로 넘긴다. 그러니 사람 말고 기계가 센다.
    """
    f = APP / "src" / "i18n" / "locales" / "ko.ts"
    if not f.exists():
        return 0
    m = re.search(r"jamoAct: \{(.*?)\n\t\t\}", f.read_text(encoding="utf-8", errors="replace"), re.S)
    if not m:
        return 0
    return len(re.findall(r'^\t\t\t(?:"[^"]+"|[A-Za-z0-9_-]+):', m.group(1), re.M))


def chapters_per_book() -> tuple[int, int]:
    """`chapter.ts` 에서 (급별 과 수, 전체 과 수)를 센다. 급마다 다르면 급별은 0 을 낸다.

    **여기가 과 구조의 유일한 정본이다.** 2026-08-29 에 masterplan §0 이
    「1급만 12과」로 적었다 — `n1_word_list.json` 에서 `book_id` 별로 `chapter` 를
    세었기 때문이다. **1급 1~3과는 한글 파트라 어휘 데이터가 없어서** 12로 나온다.
    문항 JSON 12개 중 11개가 1급을 12과로 보이게 한다.

    이 함정 자체는 `app/scripts/chapter-source-check.py` 가 매번 소리 내어 말한다.
    여기서는 **문서가 그 수를 적었을 때** 견준다.
    """
    f = APP / "src" / "shared" / "data" / "chapter.ts"
    if not f.exists():
        return (0, 0)
    t = f.read_text(encoding="utf-8", errors="replace")
    try:
        rows = json.loads(t[t.index("[") : t.rindex("]") + 1])
    except Exception:
        return (0, 0)
    per: dict[int, int] = {}
    for r in rows:
        per[r["book_id"]] = per.get(r["book_id"], 0) + 1
    uniform = len(set(per.values())) == 1
    return (next(iter(per.values())) if uniform else 0, len(rows))


def paywall_kinds() -> int:
    """`PaywallKind` 의 갈래 수 — 앱 코드에서 센다.

    2026-08-28 에 `schoolExpired` 가 붙어 넷이 다섯이 됐는데, 그때 **문서 셋이
    「넷」으로 남았다**(paywall_SOT · textbook_tab_spec · INDEX). 화면에 새 상태를
    더하는 것은 코드 한 줄인데 그 사실은 세 문서에 손으로 적혀 있었다.
    그래서 코드에서 세어 견준다.
    """
    f = APP / "src" / "components" / "main" / "textbook" / "paywall-panel.tsx"
    if not f.exists():
        return 0
    body = f.read_text(encoding="utf-8", errors="replace")
    m = re.search(r"export type PaywallKind\s*=(.*?);", body, re.S)
    if not m:
        return 0
    return len(re.findall(r'"([A-Za-z]+)"', m.group(1)))


def ko_tables() -> int:
    """`api/persistence/model.py` 의 `class Ko…` 수.

    README 가 "createAllTables() 가 표를 스스로 만든다(N개)" 라고 적는데,
    표는 기능이 늘 때마다 는다 — 2026-08-28 에 기관 코드로 셋이 늘어
    **30 이 33 이 됐다.** 그때 README 만 낡았다.
    """
    f = ROOT / "api" / "persistence" / "model.py"
    if not f.exists():
        return 0
    return len(re.findall(r"^class Ko", f.read_text(encoding="utf-8", errors="replace"), re.M))


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
    sec_total = sum(t.count("§") for n, t in text.items() if n in live)

    # 사실마다 **주인 문서 하나**를 정해 둔다. 주인 밖에서 그 수를 말하면
    # [사실 중복] 이 잡는다. 왜 필요한가 — 2026-08-24 에 화면 수를 27 → 47 로
    # 늘렸을 때 같은 숫자가 **일곱 문서**에 적혀 있어서 다섯 곳이 한꺼번에 낡았다.
    # 문서 개수가 문제가 아니라 한 사실이 여러 곳에 적힌 것이 문제였다.
    #
    # 주인을 고르는 기준은 "그 수로 무언가를 판단하는 곳". 화면 수는
    # "이것이 통과한다" 를 말하는 README, 문서·폐기본 수는 목록을 쥔 INDEX 다.
    # 나머지 문서는 숫자를 적지 말고 질적으로 쓴다("목업 캡처 전부가 일치한다").
    # 시점 기록과 인용은 봐준다. "그때는 30화면이었다" 는 지금도 참이고,
    # 다른 문서의 옛 문장을 따옴표로 옮긴 것도 고치면 안 된다.
    # 정규식으로는 이 둘을 현재 주장과 가를 수 없어서, TWIN_ALLOW 처럼
    # **문구 조각과 이유를 손으로 적어** 봐준다. 새로 넣을 때는 그 문장이
    # 정말 "그때" 를 말하는지 보고 넣어라 — 현재 주장을 여기 넣으면 안 잡힌다.
    CLAIM_ALLOW = [
        ("대조가 30화면 (2026-08-24)", "VocaShot 셋을 넣던 시점의 기록. 지금 수가 아니다"),
        ("대조 밖에 캡처 20개가 서 있다", "masterplan_v3 §9 의 옛 문장을 그대로 인용한 것"),
        # 2026-09-01. doc_review §6 이 **패턴이 왜 안 걸렸는지**를 설명하려고 그 문구를
        # 그대로 인용한다. 인용을 못 하게 하면 그 교훈을 적을 수가 없다.
        ("CLAUDE.md 의 「표 13개」를 보고 패턴을",
         "doc_review §6 이 스펙이 안 걸린 이유를 설명하며 옛 문구를 인용한 것"),
        ("「교재 문항 **13표**」로",
         "같은 문단. BLOCKERS 가 쓰던 말투를 보여 주려고 그대로 옮긴 것"),
    ]

    OWNER = {
        "목업 대조 화면 수": "(문) README.md",
        "목업 캡처 수": "(문) README.md",
        # 활동 갈래만 따로 세는 수. CLAUDE.md 의 "화면 수가 넷이다" 표가 주인이다 —
        # 그 표가 이 숫자로 무엇을 판단할지 가르쳐 준다
        "활동 컴포넌트 수": "(문) CLAUDE.md",
        "이식한 화면 수": "(문) CLAUDE.md",
        "정본 문서 수": "(문) INDEX.md",
        "_superseded 문서 수": "(문) INDEX.md",
        # 아래 셋은 지금 우연히 한 곳뿐이다. 우연을 규칙으로 굳혀 둔다 —
        # 나중에 누가 다른 문서에 또 적으면 그때 걸린다.
        # 2026-08-29 에 넣었다. 둘 다 **이번 회차에 실제로 낡은 것**이다 —
        # 페이월 상태는 코드에 하나 더하자 문서 셋이 「넷」으로 남았고,
        # 표 수는 기관 코드로 셋이 늘자 README 만 30 으로 남았다.
        "페이월 상태 수": "paywall_SOT",
        # 문서는 이 수를 적지 않는다 — 생성물이 job·스텝 목록을 쥔다
        "CI 검사 스텝 수": "docs/status.generated.md",
        "ko_* 표 수": "(문) README.md",
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
            # 2026-08-29 에 또 하나 찾았다 — INDEX.md 가 "전체 **50화면**을 확인한다" 로
            # 낡아 있었는데(참값 54) 패턴이 없어서 **조용히 통과했다.** 사람이 세어서 찾았다.
            # 그 문서는 지금 수를 빼고 README 를 가리키게 고쳤지만, 다시 쓰이면 잡히게 남긴다
            r"전체\s*\*?\*?(\d+)\*?\*?화면",
            r"대조\s*검사는?\s*전체\s*\*?\*?(\d+)",
            r"지금은\s*\*?\*?(\d+)\*?\*?\s*이다",
        ]),
        # 2026-08-26 에 활동 화면을 22 → 23 으로 늘렸는데 CLAUDE.md 와 masterplan 이
        # 22 로 남았고 **검사가 못 잡았다** — 세기는 세면서 견주지는 않았다.
        ("활동 컴포넌트 수", parity["활동"], [
            # 문구를 좁게 잡는다 — "활동 컴포넌트" 라는 말은 수 없이 쓰이는 자리가
            # 많아서(설명·표 머리) 넓게 잡으면 엉뚱한 수를 claim 으로 읽는다
            r"활동\s*컴포넌트\s*(\d+)\s*종",
            r"\|\s*\*\*(\d+)\*\*\s*\|\s*\*\*활동 컴포넌트\*\*",
        ]),
        # masterplan §15 표를 더한 수. CLAUDE.md 가 "그 표의 합계" 라고 말하므로
        # 둘이 갈리면 CLAUDE.md 가 거짓말을 한다
        *(
            [("이식한 화면 수", ported_screens(), [
                r"\|\s*\*\*(\d+)\*\*\s*\|\s*\*\*이식한 화면\*\*",
                # 2026-08-30 — README 가 산문으로 "이식 화면 25" 라고 적어 두었는데
                # 표 꼴만 보던 패턴이 **조용히 지나갔다**(참값 26). 산문 꼴도 본다
                r"이식(?:한)?\s*화면\s*(\d+)",
            ])]
            if ported_screens()
            else []
        ),
        ("CI 검사 스텝 수", ci_steps(), [
            rf"게이트\s*{NUM}\s*(?:개)?\s*(?:을|를)?\s*(?:돈다|돌린다)",
            rf"(?:푸시|PR)[^\n]{{0,20}}?{NUM}\s*이\s*돈다",
        ]),
        # 과 활동 종 수 — **「라인업 8종」과 갈라야 한다.** 둘 다 참인 다른 단위라
        # `활동 N종` 으로 넓히면 라인업을 말하는 열 곳을 잘못 잡는다. 그래서 일곱 쪽이
        # 실제로 쓰는 네 꼴만 본다. `종\s*으로` 의 공백은 태그를 벗기면 생긴다
        # (`<b>…종</b>으로` → `… 종 으로`) — 원문만 보고 패턴을 짜면 안 걸린다.
        ("과 활동 종 수", lesson_activities(), [
            rf"활동 {NUM} 종\s*으로",
            rf"그 과의 활동 {NUM}",
            rf"활동 {NUM} · 화면",
            rf"무엇을 하나 — 활동 {NUM}",
        ]),
        # 자모 문항 수 — 주인을 두지 않는다(위 함수의 주석). **패턴을 아주 좁게 쓴다.**
        # `자모…N행` 으로 넓히면 §2-b 의 "자모가 1행(예시)뿐이라 529행이 사라졌다"
        # 같은 **고치면 안 되는 시점 기록**을 가로질러 잡는다. `N행 전부 …` 꼴은
        # 자모 검수 주장에만 쓰이고, 836행·70행·62행 짜리 다른 주장과도 안 겹친다.
        ("자모 문항 수", jamo_rows(), [
            rf"{NUM}행 전부 `?reviewed",
            rf"{NUM}행 전부 검수",
        ]),
        ("자모 활동 수", jamo_activities(), [
            # **주인을 두지 않는다.** masterplan §0(제품 설명)과 jamo_authoring_spec
            # (저작 명세)이 각각 제 몫으로 이 수를 말한다 — 한쪽을 지우면 그 문서가
            # 하려던 말이 깨진다. 대신 **둘 다 검사받게** 한다.
            #
            # 패턴은 좁게 쓴다. 처음엔 `자모…활동…N종` 으로 넓게 잡았다가
            # 과거 인계 문서의 "자모 목록 인계] 앞서 활동 화면 19종" 을 **문장을 가로질러**
            # 잡았다 — 시점 기록이라 고치면 안 되는 문서다.
            rf"한글 파트는 활동이 따로 {NUM}",
            rf"자모는 활동이 {NUM}\s*(?:종|개)",
        ]),
        # 과 구조 — 정본은 chapter.ts 다. 주인을 따로 두지 않는다:
        # masterplan §0(제품 설명)과 data/README(함정 경고)가 각각 제 몫으로 말한다.
        *(
            [("급별 과 수", chapters_per_book()[0], [
                rf"여덟\s*권\s*모두\s*{NUM}과",
                rf"급마다\s*{NUM}과",
            ])]
            if chapters_per_book()[0]
            else []
        ),
        ("전체 과 수", chapters_per_book()[1], [
            rf"chapter\.ts[^\n]{{0,40}}?{NUM}\s*개",
            rf"과\s*목록\s*{NUM}\s*개",
            rf"과\s*{NUM}개\s*—\s*한글",
        ]),
        ("페이월 상태 수", paywall_kinds(), [
            # **페이월 문맥을 반드시 요구한다.** 처음엔 "N 으로 갈린다" 만 봤다가
            # shell_spec 의 무관한 문장을 잡았다 — 패턴은 좁게, 문맥을 붙여서.
            rf"게스트[^\n]{{0,60}}?{NUM}의 다음 행동",
            rf"PaywallKind[^\n]{{0,30}}?{NUM}\s*(?:갈래|개|상태)",
            rf"paywall-panel[^\n]{{0,80}}?{NUM}\s*으로 갈린다",
            rf"페이월[^\n]{{0,30}}?{NUM}\s*(?:상태|갈래)로",
        ]),
        ("ko_* 표 수", ko_tables(), [
            r"createAllTables\(\)[^\n]{0,80}?\*\*(\d+)개\*\*",
            r"표를? 스스로 만든다[^\n]{0,60}?\*\*(\d+)개\*\*",
        ]),
        ("목업 캡처 수", mockup_captures(), [
            r"캡처\s*(\d+)개(?:는|가|를|만)",
            r"캡처\s*(\d+)개가\s*곧",
            r"목업\s*캡처\s*(\d+)",
        ]),
        ("정본 문서 수", len(live), [
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
    ]

    # 교재 표 수 · 공개 금지가 지키는 자산 — 둘 다 사람이 적었다가 낡은 것들이다
    st = seed_tables()
    if st:
        specs.append(("교재 표 수", st, [
            r"교재\s*(?:표\s*)?(\d+)\s*개",
            r"표\s*(\d+)\s*개\s*·\s*API",
            r"교재\s*문항[^\n]{0,30}?표\s*(\d+)개",
            # **「13표」 처럼 「개」 없이 쓴 꼴.** BLOCKERS §0 이 「교재 문항 13표」였는데
            # 위 셋이 다 「개」를 요구해서 **안 걸렸다**(2026-09-01). 같은 사실을
            # 두 문서가 다른 말투로 적으면 패턴 하나로는 못 잡는다.
            r"교재\s*문항[^\n]{0,20}?(\d+)\s*표",
            r"(\d+)\s*표\s*·\s*API",
        ]))
    for label, prefix, pats in [
        ("추적된 듣기 음원 수", "app/public/audio",
         [r"mp3\s*([\d,]+)\s*개"]),
        ("추적된 교재 지면 이미지 수", "app/public/textbook",
         [r"jpg\s*([\d,]+)\s*장"]),
    ]:
        n, _ = tracked_under(prefix)
        if n:
            specs.append((label, n, pats))

    # 원장 상태값 — 판본마다 는다. developer_tasks DEV-07 이 「54행」·「16종」으로
    # 적어 두었다가 60행·18종이 됐다(2026-09-01). 손으로 적으면 반드시 낡는 종류다.
    dropped, kinds = review_status_counts()
    if dropped:
        specs.append(("원장에서 지운 행 수", dropped, [
            r"`?deleted`?\s*행을 빼고[^\n]{0,10}?지금\s*(\d+)\s*행",
            r"지운 행\s*(\d+)\s*개",
        ]))
    if kinds:
        specs.append(("review_status 값 종류 수", kinds, [
            r"값이\s*(\d+)\s*종",
            r"review_status[^\n]{0,20}?(\d+)\s*종",
        ]))

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
            if src == keeper:
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

    # **0 은 "볼 것이 없다" 가 아니라 "못 쟀다" 다.**
    # 세는 함수 몇은 원본이 깨지면 조용히 0 을 낸다(`chapter.ts` 파싱 실패 →
    # `(0, 0)`, JSON 파싱 실패 → 그 키가 빠짐). 그러면 그 검사가 **말없이 사라졌다.**
    # 실제로 `chapter.ts` 를 깨뜨려 보니 check_docs 가 지적 0 으로 통과했다(2026-08-30).
    # `check:css` 가 `dist` 없이 「건너뜀」을 찍고 통과하던 것과 같은 병이라 같은 처방을 쓴다.
    #
    # 진짜로 0 이 정상인 항목이 생기면 여기 이름을 적어 예외로 둔다 — 지금은 없다.
    ZERO_OK: set[str] = set()
    for label, real, pats in specs:
        if real == 0:
            if label not in ZERO_OK:
                out.append(
                    f"[잴 수 없었다] {label} — 세는 함수가 0 을 냈다\n"
                    f"           원본이 깨졌거나 자리가 바뀌었다. **그동안 이 검사는 없는 것과 같다**"
                )
            continue
        for src, body in text.items():
            flat = re.sub(r"\s+", " ", body)
            for pat in pats:
                for m in re.finditer(pat, flat):
                    # **쉼표를 떼고 본다.** 「mp3 1,133개」처럼 천 단위 쉼표가 있으면
                    # 아래 isdigit() 이 거짓이 되어 **조용히 건너뛰었다**(2026-09-01).
                    # 안 걸리는 것이 아니라 안 세는 것이라 티가 안 난다.
                    tok = m.group(1).replace(",", "")
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
# ── 관찰 기준 ────────────────────────────────────────────────────────
# 문서가 코드·데이터를 보고 적은 문장은 캐시다. 원본이 바뀌면 낡는다.
# 그래서 문서가 스스로 선언한다 — "나는 이 경로들을 이 커밋 기준으로 봤다."
# 그 커밋 이후 그 경로가 바뀌었으면 잡는다. 문서 안에 한 줄로 적는다.
#
#     <!-- 관찰: app/src/shared/data/n6_flashcard.json @ 49101fb -->
#
# 어느 문장이 틀렸는지는 말해 주지 않는다. **"이 문서를 다시 봐라" 만 말한다.**
# 그것이 2026-08-26 에 없던 것이다 — 플래시카드가 1~8급으로 넓어졌는데 그 전제로
# 쓴 문장 다섯이 남은 것을 사람이 훑어서야 찾았다.
#
# 다시 본 뒤 고칠 것이 없으면 기준 커밋만 지금으로 올린다. 그게 정상 흐름이다.
#
# **경로는 좁게 골라라.** 100커밋 동안 몇 번 바뀌는지 세어 정했다 —
#   데이터 JSON 1~2회 · jamo.ts 4 · main/textbook 7 · learn/jamo 10
#   routes/learn 19 · main/activity 23 · components/ 97  ← 이 정도면 쓸 수 없다
# 자주 우는 검사는 사람이 보지 않고 기준만 올리게 만든다. 없는 것보다 나쁘다.
#
# **기준을 올릴 때는 「확인」 한 줄을 같이 적는다** — 형식은 이렇다.
#
#     <!-- 관찰: docs/check_docs.py @ ac36936
#          — 확인: ci_steps 가 늘었을 뿐 이 문서의 주장과 무관 -->
#
# 왜 한 줄을 요구하나. 2026-08-30 에 이 검사가 울었을 때 **가장 싼 통과가
# `sed` 로 해시만 바꾸는 것**이었고, 실제로 그럴 뻔했다. 읽었는지는 관측할 수
# 없으니 「읽었다고 증명해라」는 못 시킨다. 대신 **안 읽고는 쓸 수 없는 한 줄**을
# 요구하고, 그 줄이 커밋 diff 에 남아 사람이 훑을 수 있게 한다.
# 그리고 아래에서 **그 줄이 실제로 바뀌었는지까지 본다** — 안 그러면 빈말이 된다.
OBSERVE_RE = re.compile(
    r"<!--\s*관찰:\s*(?P<paths>[^@]+?)\s*@\s*(?P<base>[0-9a-f]{7,40})"
    r"(?:\s*[—–-]\s*확인:\s*(?P<note>[^>]*?))?\s*-->",
    re.S,
)

PAD = " " * 11        # 지적의 부연 줄. 이 파일의 다른 지적들과 같은 관례다


def _git(*args: str) -> tuple[int, str]:
    try:
        r = subprocess.run(["git", *args], cwd=ROOT, capture_output=True,
                           text=True, timeout=20)
        return r.returncode, (r.stdout if r.returncode == 0 else r.stderr)
    except (OSError, subprocess.SubprocessError) as e:
        return -1, str(e)


def _key(paths: str) -> str:
    return ",".join(sorted(x.strip() for x in paths.split(",") if x.strip()))


def _evidence(base: str, paths: list[str], body: str) -> list[str]:
    """**「다시 읽어라」 대신 읽을 것을 갖다 놓는다.**

    이 저장소의 커밋 제목은 한 줄짜리 논증이라 정보 밀도가 가장 높다.
    그래서 제목을 먼저 주고, 규모(`--stat`)를 주고, 마지막에 **그 문서에서
    그 경로를 말하는 줄**을 준다 — 무슨 주장이 위험한지가 바로 보이게.
    """
    ev: list[str] = []

    rc, log = _git("log", "--format=%h %s", f"{base}..HEAD", "--", *paths)
    subs = [x for x in log.split("\n") if x.strip()] if rc == 0 else []
    if subs:
        ev.append("그 사이 무슨 일이 있었나 —")
        ev += [f"  {s}" for s in subs[:6]]
        if len(subs) > 6:
            ev.append(f"  … 외 {len(subs) - 6}개")

    rc, stat = _git("diff", "--stat", f"{base}..HEAD", "--", *paths)
    rows = [x for x in stat.split("\n") if x.strip()] if rc == 0 else []
    if rows:
        ev.append("얼마나 —")
        ev += [f"  {x.strip()}" for x in rows[:5]]
        if len(rows) > 6:
            ev.append(f"  … 외 {len(rows) - 6}개 파일")

    # 그 문서 안에서 그 경로를 말하는 줄. 선언 줄 자체는 뺀다
    names = {Path(p).name for p in paths} | {p.strip("/").split("/")[-1] for p in paths}
    hits: list[str] = []
    for i, line in enumerate(body.split("\n"), 1):
        if "관찰:" in line:
            continue
        if any(n and n in line for n in names):
            hits.append(f"  {i}: {line.strip()[:96]}")
    if hits:
        ev.append("이 문서에서 그 경로를 말하는 줄 — 여기가 낡았을 자리다")
        ev += hits[:5]
        if len(hits) > 5:
            ev.append(f"  … 외 {len(hits) - 5}줄")
    return ev


def observation_baselines() -> list[str]:
    """문서가 선언한 관찰 경로가 기준 커밋 이후 바뀌었는지 본다."""
    out: list[str] = []
    for f in sorted(HERE.glob("*.html")) + sorted(HERE.glob("*.md")) + [
        ROOT / "README.md",
        ROOT / "BLOCKERS.md",
        ROOT / "CLAUDE.md",
        ROOT / "DESIGN.md",
    ]:
        if not f.exists():
            continue
        body = f.read_text(encoding="utf-8")
        rel = str(f.relative_to(ROOT))

        # 견줄 상대를 고른다. **더러우면 HEAD, 깨끗하면 HEAD~1.**
        # 깨끗할 때(=CI) HEAD 와 견주면 늘 같아서 검사가 사라지고,
        # 더러울 때 HEAD~1 과 견주면 방금 올린 것을 못 잡는다.
        rc, st = _git("status", "--porcelain", "--", rel)
        against = "HEAD" if (rc == 0 and st.strip()) else "HEAD~1"
        rc, old_body = _git("show", f"{against}:{rel}")
        prev = ({_key(m.group("paths")):
                 (m.group("base"), (m.group("note") or "").strip())
                 for m in OBSERVE_RE.finditer(old_body)} if rc == 0 else None)

        for m in OBSERVE_RE.finditer(body):
            paths = [x.strip() for x in m.group("paths").split(",") if x.strip()]
            base = m.group("base")
            note = (m.group("note") or "").strip()

            # ── 기준을 올렸으면 확인 줄도 새로 써야 한다
            if prev is not None:
                was = prev.get(_key(m.group("paths")))
                if was and was[0] != base:
                    if not note:
                        out.append(
                            f"[관찰 확인] {f.name} 가 기준을 {was[0]} → {base} 로 옮겼는데"
                            " 「확인」 줄이 없다\n"
                            f"{PAD}무엇을 보고 올렸는지 한 줄 적어라 —"
                            " 고칠 것이 없었다면 그렇게 적으면 된다\n"
                            f"{PAD}<!-- 관찰: … @ {base} — 확인: … -->"
                        )
                    elif note == was[1]:
                        out.append(
                            f"[관찰 확인] {f.name} 가 기준을 {was[0]} → {base} 로 옮겼는데"
                            " 「확인」 줄이 그대로다\n"
                            f"{PAD}그대로면 이 검사는 없는 것과 같다 —"
                            " 이번에 본 것을 적어라\n"
                            f"{PAD}지금: {note[:70]}"
                        )

            rc, r = _git("diff", "--name-only", f"{base}..HEAD", "--", *paths)
            if rc == -1:
                out.append(f"[관찰 기준] {f.name} — git 을 못 돌렸다: {r}")
                continue
            if rc != 0:
                out.append(
                    f"[관찰 기준] {f.name} 의 기준 {base} 를 git 이 모른다 —"
                    f" {r.strip().split(chr(10))[0][:80]}"
                )
                continue
            changed = [x for x in r.split("\n") if x.strip()]
            if changed:
                shown = ", ".join(changed[:4])
                more = f" 외 {len(changed) - 4}개" if len(changed) > 4 else ""
                msg = [
                    f"[관찰 기준] {f.name} 가 {base} 기준으로 봤다고 적었는데"
                    f" 그 뒤 {len(changed)}개가 바뀌었다",
                    f"{shown}{more}",
                    *_evidence(base, paths, body),
                    "위를 읽고 문서를 고쳐라. 고칠 것이 없으면 기준 커밋을 올리되"
                    " **「확인」 줄을 같이 새로 써라**",
                ]
                out.append(("\n" + PAD).join(msg))
    return out


# ── 문구 지뢰 ────────────────────────────────────────────────────────
# 한 번 거짓이라고 밝혀진 표현. 같은 복사본이 안 훑은 문서에 남아 있거나
# 나중에 되살아나면 잡는다. 손으로 훑은 것을 영구히 남기는 장치다.
#
# 왜 있나 — 2026-08-26 에 플래시카드가 1~8급으로 넓어지자 "2~8급은 플래시카드가
# 없다" 가 문서 다섯에 남았고 검사 셋은 전부 0 이었다. 숫자가 아니라 문장이라
# [숫자 주장] 에 안 걸린다. 그날 고친 열다섯 곳 중 다섯이 같은 문장의 복사본이었다.
#
# 넣을 때 —
#   pat    그 표현만 잡는다. 넓게 쓰면 시점 기록을 헛집는다
#   why    지금 무엇이 참인가. 걸린 사람이 이 줄만 읽고 고칠 수 있어야 한다
#   allow  일부러 남긴 문서 → 이유. 이유 없이 넣지 마라
#
# 한계 — allow 는 문서 단위다. 눈감아 준 문서에 같은 거짓말이 새로 생기면
# 못 잡는다(TWIN_ALLOW 와 같은 성질이다). 그래서 allow 는 아껴 써라.
STALE_PHRASES: list[tuple[str, str, dict[str, str]]] = [
    # ── 2026-08-29 에 넣은 셋. 셋 다 **반박문은 이미 있는데 원본이 안 고쳐진** 꼴이었다.
    # 이 저장소에서 가장 자주 나는 고장이다 — 누가 "그건 사실이 아니다" 를 다른 문서에
    # 써 두고, 정작 그 말을 하는 줄은 그대로 남는다. 반박이 원본 옆이 아니라 딴 데 있으면
    # 다음 사람은 원본만 읽는다. 그래서 원본 쪽에 지뢰를 놓는다.
    #
    # 뒤에 붙은 부정형 예측(적혀·있었다·기록 …)은 **인용을 봐주기 위한 것**이다.
    # 고친 자리에 "전에 이렇게 적혀 있었다" 를 남기는 것이 이 저장소의 관행이라
    # 그것까지 잡으면 고칠수록 걸린다. 대신 **거짓 주장 뒤에 그 말을 붙이면 빠져나간다** —
    # 완벽한 그물이 아니라 되살아남을 막는 그물이다.
    (
        r"(?:서버 작업은 시작되지 않았다|api/ ?에 리뉴얼 코드가 아직 없다|DB·API 미착수)"
        r"(?![^\n]{0,44}(?:적혀|적어|있었다|이었다|였다|거짓|아니다|기록|시작했다|남아 있))",
        "서버는 2026-08-28 기준으로 활동 상태 · 복습 큐 · 권한 판정 · 문의 · 탈퇴가 "
        "api/ 에 들어와 있다(라우터 28개). 남은 것은 결제 · 메일 발송 · 표현클립 신고 · "
        "MY 누적 요약이다. **이 문장 하나가 가장 비쌌다** — CLAUDE.md 는 세션마다 자동으로 "
        "읽히는데 거기 「api/ 에 리뉴얼 코드가 아직 없다」가 오래 남아 있어서 "
        "**모든 새 세션이 「서버는 아직」으로 시작했다.** masterplan 인계 머리말도 "
        "2026-08-28 까지 같은 말을 하고 있었다",
        {},
    ),
    (
        r"(?:자모[^\n]{0,16}(?:검수 전|검수가 안|아직 draft|전부 draft)"
        r"|받침·겹받침[^\n]{0,8}(?:만 남|이 남|남았다|남음))"
        r"(?![^\n]{0,44}(?:적혀|적어|있었다|이었다|였다|거짓|아니다|기록|시작했다|남아 있))",
        "자모는 2026-08-28 에 529행 전부 검수 확정됐다 — 받침·겹받침 포함이고 "
        "원장 v41 에서 review_status 가 reviewed 다. 배관은 그보다 앞선 2026-08-24 에 끝났다. "
        "「검수 전」·「받침·겹받침 67행 남음」은 CLAUDE.md · BLOCKERS · developer_tasks "
        "**세 곳에** 남아 있었다",
        {},
    ),
    (
        r"셋[은를을]? ?캐럿 없이"
        r"(?![^\n]{0,44}(?:적혀|적어|있었다|이었다|였다|거짓|아니다|기록|시작했다|남아 있))",
        "@tanstack 라우터 **셋 중 둘만** 캐럿이 없다 — router-devtools 는 ^1.114.13 이 "
        "남아 있고 지금 막고 있는 것은 pnpm-lock.yaml 이다. BLOCKERS.md §1 이 이것을 "
        "2026-08-28 에 「위 표의 '셋' 은 사실이 아니다」로 적어 뒀는데 **CLAUDE.md 의 줄은 "
        "안 따라왔고**, 세션마다 자동으로 읽히는 것은 그쪽이라 masterplan §0 이 그대로 "
        "옮겨 적어 틀렸다(2026-08-29). 라우터를 올리지 말라는 결론 자체는 그대로 참이다",
        {},
    ),
    # ── 2026-08-29 에 넣은 둘. 둘 다 **이번 회차에 실제로 여러 문서에서 낡아 있던 것**이다.
    (
        # 「」 안의 인용은 봐준다 — 고친 자리에 "전에 이렇게 적혀 있었다" 를 남기기 때문이다
        r"(?<!「)(?:늘 )?무료 범위만 낸다(?![^\n]{0,24}(?:적혀|있었다|였다|아니다))"
        r"|(?<!「)판정은 항상 통과(?![^\n]{0,20}(?:아니다|였다|있었다))",
        "2026-08-28 부터 기관 학생은 전 급을 받는다 (shared/full_scope.py). "
        "무료 범위인 것은 게스트와 개인 계정이고, 학기가 끝난 기관 학생도 무료로 내려간다. "
        "이 문장은 access_and_pricing 두 곳 · user_flow · developer_tasks · dev_spec **다섯 곳**에 "
        "남아 있었다 — 한 사실이 다섯 문서에 손으로 적혀 있으면 한 번 바뀔 때 다섯이 같이 낡는다",
        {},
    ),
    (
        r"(?<!「)탈퇴 기능이 없다|앱에 탈퇴(?:가|를)? (?:없|안 만)",
        "회원 탈퇴는 2026-08-27 에 만들었다 — 앱의 /my-withdraw · POST /auth/withdraw. "
        "지우는 범위는 api/shared/withdrawal_scope.py 가 정본이다. "
        "2026-08-28 에 관리자 탈퇴(POST /student/withdraw)도 붙었다. "
        "legal_draft 가 이것을 「없다(확인함)」로 적은 채 **만든 다음 날 관찰 기준만 올라갔다**",
        {},
    ),
    (
        r"남은 것은 가격|가격[^\n]{0,10}(?:하나(?:다|만)|미정|정해지기 전)"
        r"|가격[^\n]{0,6}(?:·|,)[^\n]{0,6}PG[^\n]{0,6}미정",
        "가격은 2026-08-28 에 월 6달러로 정해졌다 (access_and_pricing_v1 §07). "
        "남은 것은 PG 벤더·통화 표기·세금·체험 기간이지 '가격' 이 아니다",
        {
            "paywall_SOT": "주장이 아니라 화면 규칙이다 — '가격 미정 설명은 페이월에서 "
            "제거합니다'. 가격이 정해진 지금도 그 문장은 그대로 참이다",
            "screen_promotions": "승격 이력이라 **걷어낸 것**을 적는다 — '가격 미정 카드를 "
            "제거하고'. 가격이 미정이라는 주장이 아니다(2026-09-01 · docs/*.md 가 "
            "코퍼스에 들어오면서 처음 보였다)",
        },
    ),
    (
        r"2~8급(?:은|에는|을)[^\n]{0,24}(?:플래시카드[^\n]{0,12}없|늘 잠겨|늘 <?span?[^\n]{0,20}off)",
        "플래시카드는 1~8급 전부에 있다 (2026-08-26 · 2abf726)",
        {
            "textbook_tab_spec_v1": "§07 의 6번 제목을 남기고 '해소' 를 달았다 — 물음이 있었다는 기록",
        },
    ),
    (
        r"(?:최대|세트당|과당)[^\n]{0,8}45장|45칸",
        "세트당 최대는 44장이다. G1 심의에서 중복 '씻다' 를 뺀 뒤(328→327) 1급 8과가 45→44 가 됐다",
        {
            "asis_v1": "리뉴얼 전 앱의 실측이다 — 중복 제거는 그 뒤 원장 심의에서 했으니 그 앱은 45가 맞다",
            "G1_content_gate_v1": "'내가 본 문제 / G2의 기존 해법 / 결론' 심의 표다 — 그때 검토한 논거",
        },
    ),
    (
        r"12세트 327장|327장이 전부 1급|플래시카드가 1급에만 있다(?![^\n]{0,40}해소)",
        "플래시카드 수는 문서에 적지 않는다 — build-content.py --check 의 n6_flashcard",
        {
        },
    ),
    (
        r"자모[^\n]{0,20}(?:라우트 통합 대기|6개로 쪼개|6개 그대로|6종 라우트)"
        r"|라우트 통합[^\n]{0,12}자모만 남았다",
        "자모 라우트는 2026-08-24 에 하나로 합쳤다 — /learn/jamo?level&lesson&group&sub (BLOCKERS §2-c)",
        {},
    ),
    (
        r"앱 JSON[^\n]{0,20}자모[^\n]{0,20}안 (?:받|들어)|자모[^\n]{0,16}검수 대기",
        "화면 여섯이 원장 n8_jamo 를 읽는다 (2026-08-24). **검수도 끝났다 (2026-08-28)** — 529행 전부 reviewed 다(원장 v41)",
        {},
    ),
    (
        r'"?구독인가[^\n]{0,24}(?:급별|권별)[^\n]{0,30}(?:미결|미정|정해지지)',
        "2026-08-26 에 구독으로 확정했다 — ko_entitlement 는 기간 단위이고 expires_at 이 쓰인다"
        " (access_and_pricing_v1 §07 의 1번)",
        {},
    ),
    (
        r"무료[^\n]{0,20}각 급 (?:1과|한 과)(?![^\n]{0,34}(?:전에는|였다|이었다|여덟))",
        "무료 교재는 세 과다 — 1급 4과 · 2급 1과 · 3급 1과. 한글은 1급 1과"
        " (2026-08-26 확정, access_and_pricing_v1 §02). 전에는 '각 급 한 과' 로 여덟이었다",
        {},
    ),
    (
        r"게스트 진행[^\n]{0,24}(?:열려 있|남길지|정해지지)",
        "게스트 진행은 서버에 남기기로 정했다 (2026-08-26, §07 의 2번). migrateGuestData 가"
        " 실제로 돌고 ko_learning_record 도 옮긴다 — BLOCKERS §6-d",
        {},
    ),
    (
        r"미션대화[^\n]{0,30}앱 JSON[^\n]{0,16}안 (?:들어|받)",
        "브리핑도 대화도 원장 n7_mission_chat 을 읽는다 (2026-09-01) — BLOCKERS §8",
        {},
    ),
    # ── 2026-09-01 에 넣은 둘. 미션 대화가 「구 데이터로 돈다」는 말이
    # CLAUDE.md · BLOCKERS §0 · §8 · developer_tasks 네 곳에 있었고, 그 중 하나는
    # **틀린 이유**까지 적고 있었다 — ko_chat_dialog 가 옛 내용을 들고 있다고 했는데
    # 실제로는 0행이었고 이 저장소에 채울 씨드도 없었다. 열쇠도 안 맞았다
    # (id 는 int 라 MySQL 이 'C4' 를 id=0 으로 견준다). 그래서 UPSERT 가 아니라
    # 읽는 곳을 ko_mission_chat 으로 옮겨서 닫혔다(6c5ec6a).
    (
        r"(?:dialog_keywords?\.ts|dialog_keywords)"
        r"(?![^\n]{0,60}(?:지웠|삭제|없어졌|되찾|적혀|있었다|였다|기록))",
        "dialog_keyword.ts 는 2026-09-01 에 지웠다 — 미션 라벨은 원장(ko_mission_chat)에서 "
        "parseMissionDetail 로 만든다. 그 덤프는 117과 중 28과에서 라벨·개수가, 109과에서 "
        "지시문이 원장과 달랐다(1급 4과는 라벨과 지시가 한 칸씩 밀려 있었다). "
        "되찾으려면 git show 57ccc4a:app/src/shared/data/dialog_keyword.ts",
        {},
    ),
    (
        # 2026-09-01. developer_tasks 검수. **같은 문서가 자기와 반대로 말하고 있었다** —
        # DEV-14 는 「끝났다 지금 0 이다」, DEV-10 은 「통과하지 않고」. gates.yml 주석에도
        # 같은 거짓이 있었다. 한 사실이 두 곳에 손으로 적히면 한 번 바뀔 때 하나만 낡는다.
        # **또 갈래를 안 묶어서 인용을 물었다**(2026-09-01). doc_review §6 에 적어 둔
        # 그 실수를 같은 날 다시 했다 — `A|B(?!…)` 는 B 에만 붙는다.
        r"(?:(?:admin|어드민)[^\n]{0,40}?(?:`?pnpm )?typecheck[^\n]{0,20}?(?:가 )?통과하지 ?않"
        r"|typecheck[^\n]{0,12}?(?:가 )?통과하지 ?않[^\n]{0,20}?(?:어드민|admin))"
        r"(?![^\n]{0,60}(?:적혀|있었다|였다|거짓|아니다|기록|끝났다|통과한다))",
        "`cd admin && pnpm typecheck` 는 2026-08-29 부터 **통과한다**(2026-09-01 실행해 0 확인 · "
        "BLOCKERS §14). 어드민에 남은 것은 **빌드가 유틸리티 CSS 를 안 내는 것** 하나다 — "
        "developer_tasks DEV-14. 이 거짓이 developer_tasks 와 .github/workflows/gates.yml "
        "**두 곳에** 있었다",
        {},
    ),
    (
        # 2026-09-01. **이번 회차에 내가 직접 쓴 문장이 거짓이었다** — 「번들에 구 앱
        # 덤프가 하나도 안 남았다」. 미션 대화 덤프만 보고 번들 전체를 말한 것이다.
        # 원장에서 출발하는 대조(build-content --check · seed --check)는 이것을 영영
        # 못 잡는다 — 그 사슬 밖이기 때문이다. bundle-content-check.py 가 잡는다.
        # **부정 예측은 갈래 전체를 묶어야 한다.** 처음에 `A|B|C|D(?!…)` 로 썼더니
        # 예측이 D 에만 붙어서, 바로 뒤에 「거짓이었다」가 오는 인용 셋을 물었다.
        r"(?:번들에 (?:남은 콘텐츠는|콘텐츠는) ?자모뿐"
        r"|번들에 구 앱 덤프가 (?:하나도 )?안 남았"
        r"|번들의 구 앱 덤프는 이것뿐"
        r"|(?:번들에서 )?구 앱 덤프(?:가|는)[^\n]{0,20}?(?:다 )?없어졌다)"
        r"(?![^\n]{0,60}(?:적혀|적어|있었다|였다|거짓|아니다|기록|참이 아니))",
        "**원장(교재 문항) 콘텐츠** 중 번들에 남은 것이 자모뿐이다 — 번들 전체는 아니다. "
        "clip.ts(표현클립 329편)가 5.5MB 로 실려 나가는 JS 7,691KB 의 71% 이고 "
        "자모 JSON(444KB)의 12배다. clip.ts 도 problem_wordgroup*.ts 도 구 앱에서 온 것이다. "
        "매번 재는 것은 app/scripts/bundle-content-check.py — BLOCKERS §8-c",
        {},
    ),
    (
        # 위와 같은 이유로 갈래를 묶는다 — 안 묶으면 예측이 뒤 갈래에만 붙는다
        r"(?:ko_chat_dialog[^\n]{0,40}(?:UPSERT|채워|다시 채|v29 이전|옛 내용|검수 전 내용)"
        r"|실제 (?:AI )?대화[^\n]{0,20}구 (?:앱 )?(?:데이터|덤프))"
        r"(?![^\n]{0,60}(?:적혀|있었다|였다|거짓|아니다|기록|0행))",
        "ko_chat_dialog 는 0행이었고 이 저장소에 채우는 씨드도 없었다. 열쇠도 안 맞는다 — "
        "id 가 int AUTO_INCREMENT 라 MySQL 은 WHERE id='C4' 를 id=0 으로 견준다('C10' 도 같은 행). "
        "그래서 채우는 대신 repo_chat.getDialog 가 ko_mission_chat 을 legacy_id 로 읽는다(6c5ec6a). "
        "「UPSERT 하면 된다」는 계획이 BLOCKERS §8 과 developer_tasks DEV-13 **양쪽에** 있었다",
        {},
    ),
]


# 「전에 이렇게 적혀 있었다」를 봐주는 낱말. 각 지뢰의 부정 예측과 같은 뜻인데
# **줄 전체**를 본다는 것이 다르다.
# **주장 자체에 쓰일 수 있는 낱말은 넣지 마라.**
# 처음에 「지웠·삭제·없어졌·되찾·0행」을 넣었다가, 「구 앱 덤프는 다 없어졌다」라는
# **거짓 주장이 「없어졌」때문에 스스로 면제**되는 것을 대조군에서 봤다(2026-09-01).
# 여기 들어갈 것은 「이건 지금 하는 말이 아니다」를 뜻하는 표지뿐이다.
UNSAYING = ("적혀", "적어", "있었다", "이었다", "였다", "거짓", "아니다", "아니었",
            "기록", "참이 아니", "옛 이름", "그때는", "전에는", "전에 이렇게")


def quoting(flat: str, m) -> bool:
    """그 줄이 **인용이나 시점 기록**인가 — 맞으면 지뢰를 안 터뜨린다.

    지뢰마다 `(?!…)` 로 앞을 내다보게 해 뒀는데 그것만으로 부족한 경우가 둘 있었다
    (2026-09-01, 이 저장소의 문서를 고치다 셋을 헛짚었다):

    ① **반박어가 매치보다 앞에 있을 때.** 예측은 뒤만 본다 —
       「되찾으려면 `git show …dialog_keyword.ts`」가 그랬다.
    ② **갈래가 탐욕적으로 늘어나 반박어를 지나칠 때.** `ko_chat_dialog[^\n]{0,40}(?:UPSERT|…|옛 내용)`
       은 바로 뒤의 「UPSERT 한다」고 적혀 있었다」를 건너뛰고 더 뒤의 「옛 내용」까지
       늘어난다. 그러면 예측이 시작되는 자리가 반박어 **뒤**가 된다.

    그래서 **매치가 놓인 줄 전체**에 반박어가 있으면 넘긴다. 그물이 조금 성겨지지만,
    이 지뢰들의 목적은 「완벽한 그물」이 아니라 **되살아남을 막는 것**이다 —
    거짓 문장을 새로 쓰면서 같은 줄에 「거짓이다」를 같이 적는 사람은 없다.
    """
    a = flat.rfind("\n", 0, m.start()) + 1
    b = flat.find("\n", m.end())
    line = flat[a: b if b != -1 else len(flat)]
    return any(w in line for w in UNSAYING)


def review_status_counts() -> tuple[int, int]:
    """산출물 JSON 에서 (`deleted` 행 수, `review_status` 값 종류 수).

    DEV-07 이 「지금 54행」·「값이 16종」으로 적어 뒀는데 원장 v53 에서 60행·18종이
    됐다(2026-09-01). **판본이 오를 때마다 낡는 수**라 사람이 적으면 안 된다.
    `deleted` 는 산출물에서 빠지므로 원장이 아니라 **빠진 수**를 다시 셀 수 없다 —
    그래서 build-content 가 찍는 것과 같은 값을 여기서 다시 세지 않고, 산출물에
    남은 상태값의 **종류**만 세고 지운 행 수는 원장이 있을 때만 낸다.
    """
    import json as _json
    d = ROOT / "app" / "src" / "shared" / "data"
    if not d.is_dir():
        return 0, 0
    kinds: set[str] = set()
    for f in sorted(d.glob("n*.json")):
        try:
            rows = _json.loads(f.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(rows, list):
            continue
        for r in rows:
            if isinstance(r, dict) and r.get("review_status"):
                kinds.add(str(r["review_status"]))
    # 지운 행은 산출물에 없다 — 원장이 있을 때만 셀 수 있으므로 0 을 낸다
    return 0, len(kinds)


def seed_tables() -> int:
    """`seed_textbook_content.py` 가 채우는 교재 표 수.

    CLAUDE.md 에 「표 13개」로 적혀 있었는데 `ko_mission_hint` 를 더한 날
    **14개가 됐고 아무 데서도 안 걸렸다**(2026-09-01). 세션마다 읽히는 문서라
    그 한 줄이 모든 새 작업의 출발점이 된다.
    """
    f = ROOT / "api" / "seed_textbook_content.py"
    if not f.exists():
        return 0
    s = f.read_text(encoding="utf-8")
    if "TABLES: list[" not in s:
        return 0
    blk = s.split("TABLES: list[")[1].split("= [", 1)[1].split("\n]")[0]
    return len(re.findall(r'^    \("(\w+)", "[\w.]+\.json"', blk, re.M))


def tracked_under(prefix: str) -> tuple[int, int]:
    """git 이 **추적하는** 그 폴더의 파일 수와 바이트.

    「공개 금지」가 무엇을 지키라는 것인지 이 수가 정한다. 전에 「약 21MB」로
    적혀 있었는데 2026-08-21 의 값이었고, 실제로는 **듣기 음원 68.9MB(mp3 1,133개)와
    교재 지면 이미지 34.2MB(jpg 939장)를 아예 안 세고 있었다** — 여섯 배 축소된
    수였다(2026-09-01 실측). 크기를 사람이 적으면 이렇게 낡는다.
    """
    r = subprocess.run(["git", "ls-files", "-z", "--", prefix],
                       cwd=ROOT, capture_output=True, text=True)
    names = [n for n in r.stdout.split("\0") if n]
    total = 0
    for n in names:
        try:
            total += (ROOT / n).stat().st_size
        except OSError:
            pass
    return len(names), total


def stale_phrases(text: dict[str, str]) -> list[str]:
    """한 번 거짓이라 밝혀진 표현이 남아 있거나 되살아났는지 본다.

    눈감아 준 곳이 실제로는 아무것도 막지 않는 경우도 잡는다. 죽은 allow 는
    값 없이 그 문서를 면제해 주므로 해롭다 — 나중에 같은 거짓말이 그 문서에
    새로 생기면 조용히 통과한다. TWIN_ALLOW 의 "이제 같다, 빼라" 와 같은 사정이다.
    """
    out: list[str] = []
    for pat, why, allow in STALE_PHRASES:
        rx = re.compile(pat)
        guarded: set[str] = set()
        for src, body in text.items():
            name = src.replace("(문) ", "").replace(".md", "").replace(".html", "")
            flat = re.sub(r"[ \t]+", " ", body)
            if name in allow:
                if rx.search(flat):
                    guarded.add(name)
                continue
            for m in rx.finditer(flat):
                if quoting(flat, m):
                    continue
                line = body[: m.start()].count("\n") + 1
                out.append(
                    f"[문구 지뢰] {src}:{line} 에 {m.group(0)[:44]!r}\n"
                    f"           지금 참인 것 — {why}\n"
                    f"           일부러 남기는 것이면 STALE_PHRASES 의 allow 에 이유를 적어라"
                )
        for name in allow:
            if name not in guarded:
                out.append(
                    f"[문구 지뢰] allow 의 {name} 이 아무것도 막지 않는다 — {pat[:40]!r}\n"
                    f"           STALE_PHRASES 에서 빼라. 죽은 allow 는 그 문서를 조용히 면제한다"
                )
    return out


# ── 화면 승격 이력 ──────────────────────────────────────────────────
# `_snapshots/`(시점 기록)와 `screens_ref/`(대조 기준)가 갈라진 곳은
# **파이썬 사전이 아니라 문서**에 적는다 — docs/screen_promotions.md.
#
# 전에는 여기 TWIN_ALLOW 라는 사전이 있었고 검사 이름도 [목업 쌍둥이] 였다.
# "둘이 같아야 한다" 는 뜻이었는데, 정본이 앞으로 나갈 때마다 항목이 하나씩
# 느는 **장부**로 성격이 바뀌었다(28화면 — 50 중 절반이 넘는다).
# 걸리는 것이 정상인 검사는 신호가 아니므로 2026-08-26 에 이름과 자리를
# 하는 일에 맞췄다. 읽을 사람이 파이썬을 열지 않아도 된다.
PROMOTIONS = HERE / "screen_promotions.md"


def promoted_screens() -> dict[str, str]:
    """승격 이력 문서의 표 → {화면 파일 이름: 왜 갈라졌나}"""
    if not PROMOTIONS.exists():
        return {}
    out: dict[str, str] = {}
    for line in PROMOTIONS.read_text(encoding="utf-8").splitlines():
        m = re.match(r"\|\s*`([A-Za-z0-9_]+)`\s*\|\s*(.+?)\s*\|\s*$", line)
        if m:
            out[m.group(1) + ".html"] = m.group(2)
    return out



def mockup_twins() -> tuple[list[str], list[str]]:
    """`docs/_snapshots/` 와 `app/src/screens_ref/` 가 갈라진 곳을 본다.

    `_snapshots/` 는 처음 목업을 떴을 때의 날것이고 **덮어쓰지 않는다.**
    `screens_ref/` 는 대조의 기준이라 정본이 앞으로 나가면 다시 뜬다.
    그래서 둘은 앞으로 영원히 갈라진다 — 갈라지는 것이 잘못이 아니라
    **왜 갈라졌는지 적히지 않은 것**이 잘못이다.

    적는 곳은 `docs/screen_promotions.md` 다.
    돌려주는 것은 (표에 없는 것, 표가 설명한 것) 둘이다.
    """
    a, b = HERE / "_snapshots", APP / "src" / "screens_ref"
    bad: list[str] = []
    ok: list[str] = []
    # 폴더가 없으면 **조용히 꺼지지 않는다.** 전에는 return 이라 이름을 바꾸면
    # 검사가 통째로 사라졌고, 그 사실이 통과로 보였다(2026-08-26 에 겪었다).
    for d in (a, b):
        if not d.is_dir():
            return ([f"[화면 승격] {d} 가 없다 — 경로가 바뀌었으면 검사도 같이 고쳐라"], [])
    known = promoted_screens()
    an = {p.name for p in a.glob("*.html")}
    bn = {p.name for p in b.glob("*.html")}

    def noted(n: str) -> bool:
        if n in known:
            ok.append(f"{n} — {known[n]}")
            return True
        return False

    # 한쪽에만 있는 것 — 처음 캡처한 뒤에 생긴 화면이 그렇다
    for only, where in ((an - bn, "_snapshots/ 에만"), (bn - an, "screens_ref/ 에만")):
        for n in sorted(only):
            if not noted(n):
                bad.append(
                    f"[화면 승격] {n} 이 {where} 있다 —\n"
                    f"           일부러라면 screen_promotions.md 표에 줄을 적어라"
                )
    for n in sorted(an & bn):
        if (a / n).read_bytes() == (b / n).read_bytes():
            continue
        if not noted(n):
            bad.append(
                f"[화면 승격] {n} 이 갈라졌다 — parity 는 screens_ref/ 만 본다.\n"
                f"           일부러라면 screen_promotions.md 표에 줄을 적어라"
            )
    # 죽은 줄 — 이제 같아진 화면이 표에 남아 있으면 표가 거짓말을 한다
    for n in sorted(known):
        if n in an & bn and (a / n).read_bytes() == (b / n).read_bytes():
            bad.append(f"[화면 승격] {n} 은 이제 같다 — screen_promotions.md 에서 빼라")
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
    screens_SOT.html#act 를 셋 걸어 두었는데 그 문서의 id 는 mk-act 였다.
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


def ci_steps() -> int:
    """CI 가 도는 검사 스텝 수. 워크플로에서 센다(설치·준비 스텝은 뺀다).

    **문서가 이 수를 손으로 적으면 안 된다.** 2026-08-30 에 스텝 둘을 더했더니
    「게이트 여섯」이 **네 문서에서 동시에** 낡았다(README · BLOCKERS ·
    developer_tasks · doc_review). 지금은 넷 다 `status.generated.md` 를 가리킨다 —
    그 규칙이 지켜지는지 이 검사가 본다.
    """
    f = ROOT / ".github" / "workflows" / "gates.yml"
    if not f.exists():
        return 0
    skip = {"pnpm 준비", "의존성 설치"}
    return sum(1 for m in re.finditer(r"^      - name:\s*(.+)$",
                                      f.read_text(encoding="utf-8"), re.M)
               if m.group(1).strip() not in skip)


def claude_md_size() -> list[str]:
    """`CLAUDE.md` 의 분량 상한.

    **이 파일만 세션마다 자동으로 읽힌다.** 그래서 길이가 곧 매 세션의 비용이고,
    낡은 한 줄은 모든 새 작업의 출발점이 된다. 다른 문서는 필요할 때만 열지만
    이건 안 열 수가 없다 — 그래서 여기만 상한을 둔다(기획 확정 2026-08-30).

    **줄 수와 글자 수를 같이 본다.** 줄만 세면 한 줄을 길게 써서 피할 수 있다.

    넘었을 때 할 일은 「줄이기」가 아니라 **「무엇을 뺄지 고르기」**다 —
    기계가 뽑을 수 있는 사실은 `docs/status.generated.md` 로, 전말은 원래 문서로,
    한 번 거짓이라 밝혀진 문장은 `STALE_PHRASES` 지뢰로 보낸다.
    """
    f = ROOT / "CLAUDE.md"
    if not f.exists():
        return []
    body = f.read_text(encoding="utf-8")
    lines, chars = len(body.split("\n")), len(body)
    out = []
    if lines > CLAUDE_MAX_LINES:
        out.append(f"[분량] CLAUDE.md 가 {lines}줄이다 (상한 {CLAUDE_MAX_LINES})\n"
                   f"           **넣으려면 빼라.** 무엇을 뺄지는 이 함수의 주석에 있다")
    if chars > CLAUDE_MAX_CHARS:
        out.append(f"[분량] CLAUDE.md 가 {chars:,}자다 (상한 {CLAUDE_MAX_CHARS:,})\n"
                   f"           줄 수로 피하지 못하게 글자도 같이 본다")
    return out


def index_covers(live: set[str]) -> list[str]:
    """색인이 정본 전부를 담고 있는지 본다.

    이 저장소가 문서를 못 따라잡은 이유는 목록이 두 곳(README 표 ·
    handoff §01)에 있었던 것이다. 한쪽만 고쳐지니 25 와 26 으로 갈렸다.
    목록을 docs/INDEX.md 하나로 줄이고, 그 하나가 비면 검사기가 잡는다.
    """
    idx = HERE / "INDEX.md"
    if not idx.exists():
        return ["[색인] docs/INDEX.md 가 없다 — 문서 목록이 살 곳이 하나 있어야 한다"]
    body = idx.read_text(encoding="utf-8", errors="replace")
    out: list[str] = []
    for n in sorted(live):
        if n not in body:
            out.append(
                f"[색인] {n} 이 INDEX.md 에 없다 — 문서를 만들었으면 색인에 한 줄 넣어라"
            )
    # 이름을 바꾼 기록은 부르는 것이 아니다 — `옛이름.html` | `새이름.html` 꼴의
    # 줄을 대응표로 읽는다. 옛 이름은 _superseded/ 와 state_audit/ 안에 시점
    # 기록으로 남아 있으므로, 거기서 만난 사람이 찾아올 자리가 있어야 한다.
    renamed: set[str] = set()
    for line in body.splitlines():
        m = re.match(
            r"\s*\|\s*`([A-Za-z0-9_.가-힣/-]+\.html)`\s*\|\s*`([A-Za-z0-9_.가-힣/-]+\.html)`\s*\|",
            line,
        )
        if m:
            renamed.add(m.group(1)[:-5])

    # `_superseded/` 로 **옮겼다고 선언한** 것도 부를 수 있다.
    # 이 저장소는 그 선언을 `옛이름.html → _superseded/` 줄로 한다(REDIRECT_RE).
    # 2026-08-29 에 legacy_shell_mockup 을 옮기면서 알았다 — 선언을 해 뒀는데도
    # 이 검사가 "없는 문서를 가리킨다" 고 잡았다. **한 규약을 두 검사가 알아야 하는데
    # 한쪽만 알고 있었다.**
    moved = {m.group(1) for m in REDIRECT_RE.finditer(body)}

    # 색인이 없는 파일을 부르는 경우
    for m in re.finditer(r"`([A-Za-z0-9_.가-힣-]+)\.html`", body):
        if m.group(1) not in live and m.group(1) not in renamed and m.group(1) not in moved:
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
    # 정본은 docs/*.html 뿐이다 — 저장소의 문은 정본 HTML 수에서 뺀다
    live = {
        n for n in text
        if not n.startswith("(문) ")
    }
    dead = {p.stem for p in (HERE / "_superseded").glob("*.html")}
    secs = {n: sections(raw[n]) for n in live}
    # **문서도 인용의 대상이다.** 여기 "문은 인용의 대상이 아니다" 라고
    # 적혀 있었는데, 정작 `CLAUDE.md` 는 `BLOCKERS.md §N` 을 수시로 부른다.
    # 그래서 .md 로 가는 §N 인용은 **한 번도 검사되지 않았다**(2026-08-30 에 찾았다) —
    # CLAUDE.md 가 두 곳에서 `BLOCKERS.md §3-b` 를 가리켰는데 그 절은 전혀 다른
    # 이야기였고 이 검사는 조용히 지나갔다. 문서 이름(`BLOCKERS.md`)을 키로 넣는다.
    for k in text:
        if k.startswith("(문) "):
            secs[k[len("(문) "):]] = sections(raw[k])

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
            for tgt in secs:
                i = lead.rfind(tgt)
                if i > at:
                    nearest, at = tgt, i
            if nearest is None or not secs.get(nearest):
                continue
            # 이름과 § 사이에 다른 문서 이름이 끼면 귀속이 불확실하니 건너뛴다
            between = lead[at + len(nearest):]
            if any(o in between for o in secs if o != nearest):
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
    for n in sorted(live):
        cited = any(
            n in body
            for src, body in text.items()
            if src != n
        )
        if not cited:
            problems.append(f"[고아] {n} — 아무 문서도, README·BLOCKERS 도 가리키지 않는다")

    # ── 5. 숫자 주장
    problems += claims(live, text)

    # ── 문구 지뢰 · 관찰 기준
    problems += stale_phrases(text)
    problems += observation_baselines()

    # ── 원장 버전 · 데이터 정본
    problems += ledger_claims(text)
    problems += data_source_claims()

    # ── 기계 판독 정책과 공통 상태표
    problems += [f"[상태 계약] {error}" for error in validate_contract(ROOT)]

    # ── 7. 색인 정합성
    problems += index_covers(live)
    problems += claude_md_size()

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
    kinds = len(set(re.findall(r"^  \[([^\]]+)\]", __doc__ or "", re.M)))
    print(
        f"정본 {len(live)}개 · 폐기본 {len(dead)}개 · "
        f"문 {len(DOORS)}개 + 색인 1 · 검사 {kinds}종"
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
        print("구조 검사 통과 — 참조·색인·등록된 계약은 맞음; 문서 의미 전체를 보증하지 않음")
        return 0
    print(f"\n걸린 것 {len(problems)}개\n")
    for p in problems:
        print("  " + p)
    return 1


if __name__ == "__main__":
    sys.exit(main())
