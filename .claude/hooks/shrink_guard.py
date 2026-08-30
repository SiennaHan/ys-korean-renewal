#!/usr/bin/env python3
"""추적 파일이 **갑자기 비었거나 확 줄었으면** 그 자리에서 알린다.

**왜 있나.** 2026-08-30 에 `re.subn()` 의 반환을 거꾸로 풀어
`docs/legal_draft_v1.html` 을 **0바이트로 날렸다.** `open(p, "w")` 는 쓰기 전에
이미 파일을 비우므로, 쓸 내용을 만들다 죽으면 빈 파일만 남는다.
그때는 커밋에 있어서 살았다 — **운이었지 장치가 아니었다.**

게이트는 이걸 못 잡는다. `typecheck` 도 `parity` 도 「없는 내용」을 모르고,
`check_docs` 는 빈 HTML 을 그냥 참조 없는 문서로 읽는다. 사람이 `git status` 를
볼 때까지 안 보인다 — 그 사이 커밋이 지나갈 수 있다.

## 막지 않고 알린다

이미 실행된 뒤에 도는 훅이라 막을 수가 없고, 막을 일도 아니다 — 정당한 대량
삭제가 있다(문서를 절반으로 줄이는 작업을 실제로 했다). **0바이트는 알기만 하면
즉시 고친다.** 필요한 것은 차단이 아니라 눈에 띄는 것이다.

## 같은 것을 두 번 알리지 않는다

훅은 상태가 없어서, 그냥 두면 파일이 그 크기로 있는 동안 **도구를 부를 때마다**
운다. 자주 우는 알림은 사람이 끈다. 그래서 이미 알린 (경로, 크기) 를 기억한다 —
`.git/` 아래에 둔다. 거기는 절대 추적되지 않아 `.gitignore` 를 건드릴 필요가 없다.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STATE = ROOT / ".git" / "claude_shrink_state.json"

# 이 비율 아래로 줄면 알린다. **오늘 가장 큰 정상 축소가 CLAUDE.md 280→262줄(6%)**
# 이라 여유가 크다. 좁게 잡아 거짓 경보를 안 내는 쪽을 골랐다.
KEEP = 0.30
MAX_FILES = 300      # 생성물을 통째로 다시 만들 때를 대비한 상한


def git(*args: str, stdin: str | None = None) -> tuple[int, str]:
    try:
        r = subprocess.run(["git", *args], cwd=ROOT, input=stdin,
                           capture_output=True, text=True, timeout=15)
        return r.returncode, r.stdout
    except (OSError, subprocess.SubprocessError):
        return -1, ""


def load() -> dict[str, int]:
    try:
        return json.loads(STATE.read_text())
    except Exception:
        return {}


def main() -> int:
    rc, out = git("ls-files", "-m")
    if rc != 0:
        return 0
    # **디스크에 있는 것만 본다.** 지운 파일은 크기 0 이라 전부 걸리는데,
    # 지우는 것은 눈에 보이는 의도적 행위지 이 훅이 잡을 사고가 아니다.
    paths = [p for p in (x.strip() for x in out.split("\n")) if p and (ROOT / p).is_file()]
    if not paths or len(paths) > MAX_FILES:
        return 0

    rc, sizes = git("cat-file", "--batch-check=%(objectsize)",
                    stdin="".join(f"HEAD:{p}\n" for p in paths))
    if rc != 0:
        return 0
    rows = sizes.split("\n")

    seen, hits = load(), []
    for p, row in zip(paths, rows):
        row = row.strip()
        if not row.isdigit():          # HEAD 에 없던 파일 — 견줄 것이 없다
            continue
        old, new = int(row), (ROOT / p).stat().st_size
        if old == 0:
            continue
        if new == 0:
            hits.append((p, old, new, "**0바이트가 됐다**"))
        elif new < old * KEEP:
            hits.append((p, old, new, f"{100 * new // old}% 만 남았다"))

    fresh = [h for h in hits if seen.get(h[0]) != h[2]]
    STATE.write_text(json.dumps({h[0]: h[2] for h in hits}))
    if not fresh:
        return 0

    lines = [f"  {p}  {old:,} → {new:,} 바이트 — {why}" for p, old, new, why in fresh]
    print("파일이 갑자기 줄었다 — 의도한 것인지 확인해라.\n"
          + "\n".join(lines)
          + "\n\n`open(p, \"w\")` 는 **쓰기 전에 이미 비운다** — 내용을 다 만든 뒤"
            " 마지막에 열어라.\n"
            "되돌리려면: git checkout -- <파일>", file=sys.stderr)
    return 2          # 2 = 이 내용을 모델에게 준다 (막는 것이 아니다)


if __name__ == "__main__":
    raise SystemExit(main())
