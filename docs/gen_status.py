#!/usr/bin/env python3
"""코드에서 「지금 상태」를 뽑아 `docs/status.generated.md` 로 쓴다.

**왜 있나.** 문서가 낡는 것은 대부분 **현재 상태 주장**이었다 —
「`.env.example` 이 없다」 · 「CI 가 없다」 · 「검사 15종」 · 「이식 화면 25」.
넷 다 사람이 손으로 적었고 넷 다 틀려 있었다. 검수로 잡을 일이 아니라
**문서가 그 말을 안 하게** 만드는 것이 낫다.

    python3 docs/gen_status.py            # 다시 쓴다
    python3 docs/gen_status.py --check    # 낡았으면 1 을 낸다 (CI 가 이걸 쓴다)

## 무엇을 담고 무엇을 안 담나

**기계로 뽑히는 사실만.** 「거의 됐다」 · 「남은 건 결제다」 · 「위험하다」는 판단이라
사람 몫이다 — 실행 우선순위는 `developer_tasks.md`, 제품 결정 근거는 `masterplan_v3`가 쥔다.

**`check_docs.py` 의 `OWNER` 가 이미 주인을 정해 둔 사실은 넣지 않는다.**
넣으면 `[사실 중복]` 이 운다 — 다른 문서에 하지 말라고 한 바로 그것이다.
그래서 목업 대조 화면 수 · 이식한 화면 수 · 페이월 상태 수 · `ko_*` 표 수 같은 것은
여기 없다. 그 수가 필요하면 주인 문서를 봐라.

## 결정적이어야 한다

CI 가 `--check` 로 「다시 뽑아도 같은가」를 보므로, 돌릴 때마다 달라지면 매번 헛으로 운다.
그래서 **날짜·시각을 쓰지 않고**, `glob()` 은 정렬하고, 경로는 저장소 상대로 적는다.
"""
from __future__ import annotations

import io
import re
import sys

from check_docs import (  # 패턴도 세는 함수도 베끼지 않고 빌린다
    OBSERVE_RE,
    chapters_per_book,
    ci_steps,
    data_counts,
    jamo_activities,
    jamo_rows,
    ko_tables,
    lesson_activities,
    mockup_captures,
    parity_screens,
    paywall_kinds,
    ported_screens,
    review_status_counts,
    seed_tables,
    token_counts,
    tracked_under,
)
from project_contract import load_contract, render_contract, validate_contract
from pathlib import Path

# 「시점 기록」 못. **`<!-- 관찰: … -->` 과 같은 자리에 붙이는 같은 문법이다.**
#
# 관찰 기준은 「이 문서가 무엇을 보고 썼나」를 말하고, 시점 못은 **「이 절은 언제 것이며
# 현재 판정이 아니다」** 를 말한다. 둘은 다른 것이다 — 관찰은 *다시 읽어라* 의 방아쇠고,
# 시점은 *읽지 않아도 된다* 의 표시다.
#
# **막지 않고 센다.** 어느 절이 시점 기록으로 선언됐는지 사람이 알 수 있게만 한다 —
# 「이 절 전체가 시점 기록인가」는 기계가 못 하는 판단이라(2026-09-03 · BLOCKERS §15 가
# 섞여 있어서 통째로 못 박았다) 검사로 만들지 않는다.
# **숫자로 시작하는 것만 센다.** `doc_review_v1.md` §6-b 가 이 문법을 **예시로
# 인용**하는데, 그냥 세면 그 예시가 잡힌다 — 이 저장소가 「인용과 주장을 못 가른다」로
# 적어 둔 그 문제다. `OBSERVE_RE` 가 커밋 해시를 요구해 CLAUDE.md 의 예시를 걸러내는
# 것과 같은 방식으로, 여기는 **날짜**를 요구한다. 예시는 `<날짜>` 로 쓴다.
TIMEPOINT_RE = re.compile(r"<!--\s*시점:\s*(\d[^>]*?)-->", re.S)

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
OUT = HERE / "status.generated.md"


def read(rel: str) -> str:
    p = ROOT / rel
    return p.read_text(encoding="utf-8", errors="replace") if p.exists() else ""


def yn(ok: bool) -> str:
    return "**있다**" if ok else "없다"


def ci_jobs() -> list[str]:
    """워크플로의 job 과 그 안의 이름 있는 스텝. YAML 파서 없이 읽는다."""
    body = read(".github/workflows/gates.yml")
    if not body:
        return []
    lines, out, job = body.split("\n"), [], None
    for i, l in enumerate(lines):
        m = re.match(r"^  ([a-z][a-z0-9_-]*):\s*$", l)
        if m and any(re.match(r"^    (name|runs-on):", x) for x in lines[i:i + 4]):
            job = m.group(1)
            nm = next((re.sub(r"^\s*name:\s*", "", x).strip()
                       for x in lines[i:i + 3] if re.match(r"^    name:", x)), job)
            out.append(f"- **{job}** — {nm}")
            continue
        m = re.match(r"^      - name:\s*(.+)$", l)
        if m and job:
            out.append(f"  - {m.group(1).strip()}")
    return out


def gates() -> list[str]:
    """게이트 — `app/package.json` 의 검사 스크립트 + 문서 검사."""
    body = read("app/package.json")
    names = sorted(re.findall(r'"(typecheck|build|check|check:css|parity:activity)"\s*:', body))
    out = [f"- `pnpm {n}`" for n in names]
    out.append("- `python3 app/scripts/build-content.py --check` — **CI 에서 못 돈다**(원장이 저장소에 없다)")
    out.append("- `python3 docs/check_docs.py` · `python3 docs/check_docs_probe.py`")
    return out


def model_has(table: str) -> bool:
    return bool(re.search(rf"^class {table}\b", read("api/persistence/model.py"), re.M))


def api_routes(*needles: str) -> list[str]:
    """`api/accepter/*.py` 에서 그 문자열을 가진 파일. 정렬해서 낸다."""
    hits = []
    for p in sorted((ROOT / "api" / "accepter").glob("*.py")):
        body = p.read_text(encoding="utf-8", errors="replace")
        if any(n in body for n in needles):
            hits.append(p.name)
    return hits


def mail_senders() -> list[str]:
    """메일 발송 수단. **있는 것을 심어 보고 뒤집히는지 확인한 패턴이다.**"""
    found = []
    for name, pat in [("SMTP", r"\bsmtplib\b|\bSMTP\b"), ("SES", r"\bses\b|\bSES\b"),
                      ("SendGrid", r"sendgrid")]:
        for p in sorted((ROOT / "api").rglob("*.py")):
            if ".venv" in p.parts:
                continue
            if re.search(pat, p.read_text(encoding="utf-8", errors="replace")):
                found.append(name)
                break
    return found


# 카드 보드 — `developer_tasks.md` 에서 뽑는다.
#
# **왜 생성하나.** 「지금 뭘 먼저 해야 하나」에 답하는 지도가 다섯 벌이었고 신뢰
# 등급이 다 달랐다(masterplan §2·§3, 옛 §18, developer_tasks, 이 파일). 손으로 적힌
# 넷은 카드 상태가 바뀌어도 따라오지 않았다 — §3 은 그렇게 15일 동안 이미 끝난
# 콘텐츠를 「먼저 하라」고 가리켰다. **상태는 카드가 쥐고, 여기서 모아 낸다.**
#
# **판단은 생성하지 않는다.** 임계 경로(무엇이 가장 길고 왜 앞을 막나)는 사람이
# 쓴다 — masterplan §3 에 남아 있다. 기계는 *무엇이 끝났나* 는 알아도
# *무엇을 먼저 해야 하나* 는 모른다. 그것까지 생성하면 **신선한데 쓸모없는 지도**가 된다.
#
# **git log 요약은 일부러 안 넣는다.** 커밋마다 이 파일이 바뀌면 `--check` 가 매번
# 빨간불이고, 그러면 아무도 안 본다. 최근 한 일은 `git log` 가 원본이다.
CARD_RE = re.compile(
    r"^### (DEV-\d+) · (.+?) — \*\*(완료|부분완료|미구현|검증 안 됨)\*\*"
    r"(?:\(([^)]*)\))? · (P\d)", re.M)
PD_RE = re.compile(r"^\| (~~)?\*\*(PD-\d+)\*\*(~~)? \| ([^|]+?) \|[^|]*\| ([^|]*?) \|", re.M)


# `### DEV-…` 로 시작하는 줄은 다 카드다. CARD_RE 가 그 중 몇 개를 놓쳤는지 보려고
# 따로 센다 — **전부 실패할 때만 우는 검사는 둘이 빠진 것을 못 잡는다.**
# 실제로 2026-09-03 에 카드 제목의 상태 자리에 「미구현 · 결정은 끝났다」처럼 넷 밖의
# 말을 넣었다가 DEV-06·DEV-11 이 **보드에서 조용히 사라졌다.** `--check` 는 깨진 상태로
# 일관되니 통과했다. 그게 이 문서가 「정본」으로 읽히는 동안 거짓을 말하는 방식이다.
CARD_HEAD_RE = re.compile(r"^### (DEV-\d+)\b.*$", re.M)


def cards() -> tuple[list, list]:
    """(DEV 카드, PD 결정) — 상태 어휘 넷은 project_status.json 이 정본이다."""
    body = read("docs/developer_tasks.md")
    dev = [(m.group(1), m.group(2).strip(), m.group(3), (m.group(4) or "").strip(),
            m.group(5)) for m in CARD_RE.finditer(body)]
    got = {d[0] for d in dev}
    missed = [(m.group(1), m.group(0)) for m in CARD_HEAD_RE.finditer(body)
              if m.group(1) not in got]
    if missed:
        lines = "\n".join(f"      {h.strip()[:110]}" for _, h in missed)
        sys.exit(
            f"❌ 카드 {len(missed)}개를 못 읽었다 — 보드에서 조용히 빠진다:\n{lines}\n"
            "   꼴은 `### DEV-N · 이름 — **상태**(덧말) · Pn` 이고 **상태는 넷뿐이다**\n"
            "   (완료 · 부분완료 · 미구현 · 검증 안 됨). 덧말은 괄호 안에 넣어라.")
    pd = [(m.group(2), m.group(4).strip(), m.group(5).strip(), bool(m.group(1)))
          for m in PD_RE.finditer(body)]
    return dev, pd


def board() -> list[str]:
    dev, pd = cards()
    if not dev:
        return ["**카드를 못 읽었다** — `developer_tasks.md` 의 헤더 꼴이 바뀌었나 본다.",
                "상태 어휘는 넷이다(완료·부분완료·미구현·검증 안 됨).", ""]
    open_pd = {i: what for i, what, _, done in pd if not done}
    L = ["## 카드 보드 — `developer_tasks.md` 에서 뽑았다", "",
         "**순서는 여기 없다.** 무엇을 먼저 할지는 판단이라 `masterplan_v3.html` §3 이 쥔다.", ""]
    groups = [("미구현", "아직 안 된 것"), ("부분완료", "일부만 된 것"),
              ("검증 안 됨", "됐다는데 확인 안 된 것"), ("완료", "끝난 것")]
    for status, title in groups:
        rows = [d for d in dev if d[2] == status]
        if not rows:
            continue
        L.append(f"### {title} — {status} {len(rows)}장")
        L.append("")
        for cid, name, _, note, pri in rows:
            # 괄호 안에서 막은 PD 를 캔다. **「PD-01·02 대기」 꼴을 조심해라** —
            # 뒷번호에는 `PD-` 접두가 없어서 `PD-(\d+)` 만 쓰면 02 를 놓친다.
            blockers = []
            for grp in re.finditer(r"PD-((?:\d+)(?:[·,]\s*(?:PD-)?\d+)*)", note):
                blockers += re.findall(r"\d+", grp.group(1))
            tail = ""
            if blockers:
                names = [f"PD-{b} {open_pd.get(f'PD-{b}', '')}".strip()
                         for b in blockers]
                tail = f" ← **막은 결정** {' · '.join(names)}"
            elif note:
                tail = f" ({note})"
            L.append(f"- `{cid}` {name} · {pri}{tail}")
        L.append("")
    if open_pd:
        L.append(f"### 기다리는 기획 결정 — {len(open_pd)}건")
        L.append("")
        for i, what in open_pd.items():
            blocks = [b for b, _, bl, done in pd if b == i for b in [bl]]
            L.append(f"- `{i}` {what}" + (f" → {blocks[0]}" if blocks and blocks[0] else ""))
        L.append("")
    return L


def build(contract: dict | None = None) -> str:
    contract = contract or load_contract(ROOT)
    jobs = ci_jobs()
    ent, pur = model_has("KoEntitlement"), model_has("KoPurchase")
    reset = api_routes("reset-password", "new-password")
    health = api_routes("/health")
    routers = len(re.findall(r"include_router", read("api/server.py")))
    # **자기 자신은 세지 않는다.** 이 파일이 그 표시를 설명하느라 본문에 담고 있어서,
    # 처음엔 두 번째 실행부터 자기를 목록에 넣었다(9개 → 10개). 그러면 `--check` 가
    # 매번 울어 CI 가 헛으로 빨개진다 — 결정적이어야 한다는 규칙을 스스로 어긴 자리다.
    # **`check_docs.py` 가 도는 범위와 같아야 한다.** 처음엔 `docs/` 만 훑어서
    # 「9개」를 냈는데 실제로는 11개였다 — 루트의 `BLOCKERS.md`(선언 2개) ·
    # `DESIGN.md` · `CLAUDE.md` 를 못 봤다. **「적다」 쪽으로 틀린 수라 더 나쁘다**:
    # 「절반이 넘는 문서가 아직 선언하지 않았다」의 근거로 쓰이고 있었고,
    # 생성물이라 아무도 다시 세어 보지 않는다(2026-08-31 에 고쳤다).
    cand = sorted(HERE.glob("*.html")) + sorted(HERE.glob("*.md")) + [
        ROOT / "README.md", ROOT / "BLOCKERS.md", ROOT / "CLAUDE.md", ROOT / "DESIGN.md"]
    # **문자열이 아니라 `check_docs` 와 같은 정규식으로 센다.** 문자열로 세면
    # `CLAUDE.md` 가 걸린다 — 거기 있는 `<!-- 관찰: … @ 커밋 -->` 는 검사 표를
    # 설명하는 **산문 속 예시**지 선언이 아니다(커밋 해시가 없다). 하필 그 줄이
    # 「인용과 주장을 못 가른다」고 적은 자리다. 패턴을 베끼지 않고 빌려 쓰는 이유가
    # 이것이다 — 두 벌이면 한쪽만 고쳐진다.
    watched: list[tuple[str, int]] = []
    for p in cand:
        if not p.exists() or p.name == OUT.name:
            continue
        n = len(OBSERVE_RE.findall(p.read_text(encoding="utf-8", errors="replace")))
        if n:
            watched.append((str(p.relative_to(ROOT)), n))
    watched.sort()

    L: list[str] = []
    a = L.append
    a("# 지금 상태 — 코드에서 뽑은 것")
    a("")
    a("<!-- 이 파일은 `docs/gen_status.py` 가 만든다. 손으로 고치지 마라 —")
    a("     CI 가 다시 뽑아 보고 다르면 실패시킨다. 고칠 것은 생성기다. -->")
    a("")
    a("**사람이 쓰는 문서는 이 표의 사실을 옮겨 적지 말고 여기를 가리켜라.**")
    a("낡는 문장은 거의 다 「현재 상태」였다 — 그 말을 문서가 안 하게 하려고 만들었다.")
    a("판단(「거의 됐다」·「남은 건 결제다」)은 여기 없다. 실행 우선순위는")
    a("`developer_tasks.md`, 제품 결정 근거는 `masterplan_v3.html`이 쥔다.")
    a("")
    a("## CI")
    a("")
    a(f"워크플로: {yn(bool(jobs))}" + (" (`.github/workflows/gates.yml`)" if jobs else ""))
    a("")
    L += jobs
    a("")
    L += render_contract(contract)
    L += board()
    a("## 게이트")
    a("")
    L += gates()
    a("")
    a("## 서버 — 있는 것과 없는 것")
    a("")
    a("| | |")
    a("|---|---|")
    a(f"| `ko_entitlement` 표 | {yn(ent)} |")
    a(f"| `ko_purchase` 표 | {yn(pur)} |")
    a(f"| 메일 발송 수단 (SMTP·SES·SendGrid) | {', '.join(mail_senders()) or '없다'} |")
    a(f"| 비밀번호 재설정 라우트 | {', '.join(reset) or '없다'} |")
    a(f"| `/health` 를 가진 파일 | {', '.join(health) or '없다'} |")
    a(f"| `include_router` | {routers} |")
    a("")
    a("## 문서")
    a("")
    decls = sum(n for _, n in watched)
    a(f"관찰 기준(`<!-- 관찰: … @ 커밋 -->`)을 선언한 문서 {len(watched)}개"
      f" · 선언 {decls}개 —")
    a("")
    for n, k in watched:
        a(f"- `{n}`" + (f" ({k}개)" if k > 1 else ""))
    a("")
    a("선언하지 않은 문서는 **코드가 바뀌어도 「다시 읽어라」를 못 받는다.**")
    a("")

    # 시점 못 — 「읽지 않아도 되는 자리」가 어디인지
    nails: list[tuple[str, str]] = []
    for p2 in cand:
        if not p2.exists() or p2.name == OUT.name:
            continue
        for m in TIMEPOINT_RE.finditer(p2.read_text(encoding="utf-8", errors="replace")):
            nails.append((str(p2.relative_to(ROOT)), " ".join(m.group(1).split())))
    if nails:
        a("**「시점 기록」으로 못을 박은 자리** — 현재 판정에 쓰지 않는다.")
        a("읽어야 할 양을 줄이는 표시다(삭제가 아니다 — `doc_review_v1.md` §6-b).")
        a("")
        for f2, what in nails:
            a(f"- `{f2}` — {what}")
        a("")

    # ── 센 것 ──────────────────────────────────────────────────────────
    #
    # **여기가 이 절의 요점이다.** 아래 수는 전부 `check_docs.py` 가 **이미 세고
    # 있던 것**이다. 그런데 세어서 **문서의 손글씨와 대조**하는 데만 썼다 — 내는
    # 데는 안 썼다. 그래서 문서가 수를 손으로 적고, 검사는 그 손글씨를 쫓는
    # 정규식 47개를 들고 있었다. 문구를 새로 쓰면 패턴을 하나 더 넣어야 했고
    # 그러지 못한 자리는 **조용히 통과했다**(check_docs 의 그 주석들이 기록이다).
    #
    # **출력처를 바꾼다.** 수는 여기서 나오고, 문서는 여기를 가리킨다.
    # 그러면 대조할 손글씨가 없어 검사도 필요 없다 — 검사가 줄어드는 것이 성과다.
    #
    # 함수를 `check_docs` 에서 빌린다. 베끼면 두 벌이 되고 한쪽만 고쳐진다.
    par = parity_screens()
    tc, dc = token_counts(), data_counts()
    per_book, total_ch = chapters_per_book()
    _, status_kinds = review_status_counts()
    audio_n, audio_b = tracked_under("app/public/audio")
    page_n, page_b = tracked_under("app/public/textbook")
    data_n, data_b = tracked_under("app/src/shared/data")
    mb = lambda b: f"{b / 1024 / 1024:.1f} MB"
    live_html = len(list(HERE.glob("*.html")))
    dead_html = len(list((HERE / "_superseded").glob("*.html")))

    a("## 센 것 — 문서에 옮겨 적지 말고 여기를 가리켜라")
    a("")
    a("| 무엇 | 수 | 어디서 세나 |")
    a("|---|---|---|")
    rows = [
        ("목업 대조 화면", sum(par.values()),
         "`activity-parity.tsx` 의 `SCREENS` — " +
         " · ".join(f"{k} {v}" for k, v in par.items())),
        ("목업 캡처", mockup_captures(), "`app/src/screens_ref/*.html`"),
        ("활동 컴포넌트", par["활동"], "위 `SCREENS` 의 활동 항목"),
        ("이식한 화면", ported_screens(), "`masterplan_v3.html` §15 표 합계"),
        ("`ko_*` 표", ko_tables(), "`api/persistence/model.py`"),
        ("교재 콘텐츠 표", seed_tables(), "`api/seed_textbook_content.py` 의 `TABLES`"),
        ("과 활동 종", lesson_activities(), "`app/src/shared/data/module.ts`"),
        ("자모 문항", jamo_rows(), "`n8_jamo.json`"),
        ("자모 활동", jamo_activities(), "`module.ts` 의 자모 묶음"),
        ("급별 과 · 전체 과", f"{per_book} · {total_ch}", "`chapter.ts` — **과 구조의 정본**"),
        ("페이월 상태", paywall_kinds(), "`paywall` 컴포넌트"),
        ("CI 검사 스텝", ci_steps(), "`.github/workflows/gates.yml`"),
        ("`review_status` 값 종류", status_kinds, "생성된 `n*.json`"),
        ("i18n 로케일", dc["i18n 로케일 수"], "`app/src/i18n/locales/`"),
        ("VocaShot 문항 은행", dc["VocaShot 문항 은행"], "`vocashot-bank.ts`"),
        ("`n1_word_quiz` 행", dc["n1 어휘퀴즈 문항"], "생성된 `n1_word_quiz.json`"),
        ("primitive 색 토큰", tc["primitive 색 토큰"], "`docs/tokens.css`"),
        ("semantic 색 토큰", tc["semantic 색 토큰"], "같은 파일"),
        ("타이포 눈금", tc["타이포 눈금"], "같은 파일"),
        ("정본 HTML", live_html, "`docs/*.html`"),
        ("폐기본 HTML", dead_html, "`docs/_superseded/*.html`"),
        # 아래 셋은 **공개 금지의 근거**다. CLAUDE.md 가 이 수를 손으로 적고 있었는데
        # 「약 21MB」로 낡아 있었다 — 참값의 6분의 1이었고 음원·지면을 아예 안 셌다.
        ("추적된 듣기 음원", f"mp3 {audio_n:,}개 · {mb(audio_b)}",
         "`git ls-files app/public/audio` — **공개 금지**"),
        ("추적된 교재 지면", f"jpg {page_n:,}장 · {mb(page_b)}",
         "`git ls-files app/public/textbook` — **공개 금지**"),
        ("추적된 문장·어휘·지문", f"{data_n:,}개 · {mb(data_b)}",
         "`git ls-files app/src/shared/data` — **공개 금지**"),
    ]
    for label, val, where in rows:
        a(f"| {label} | **{val}** | {where} |")
    a("")
    return "\n".join(L)


def main() -> int:
    contract = load_contract(ROOT)
    contract_errors = validate_contract(ROOT, contract)
    if contract_errors:
        print("project_status.json 계약이 코드와 다르다:")
        for error in contract_errors:
            print(f"  - {error}")
        return 2
    body = build(contract)
    if not body.strip():
        print("빈 내용을 만들었다 — 쓰지 않는다")
        return 2
    if "--check" in sys.argv:
        cur = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if cur != body:
            print("status.generated.md 가 낡았다 — `python3 docs/gen_status.py` 를 돌리고 커밋해라")
            return 1
        print("status.generated.md 는 코드와 같다")
        return 0
    io.open(OUT, "w", encoding="utf-8").write(body)   # 다 만든 뒤 마지막에 연다
    print(f"{OUT.relative_to(ROOT)} 를 다시 썼다")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
