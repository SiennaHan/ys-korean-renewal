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

from check_docs import OBSERVE_RE   # 패턴을 베끼지 않고 빌린다
from project_contract import load_contract, render_contract, validate_contract
from pathlib import Path

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
