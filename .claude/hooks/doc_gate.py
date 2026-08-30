#!/usr/bin/env python3
"""문서를 고친 직후에만 `check_docs.py` 를 돌린다.

**왜 `Stop` 이 아니라 여기인가.** 세션 끝마다 돌리면 문서를 안 건드린 작업에도
돈다 — 성가시면 사람이 훅을 꺼 버리고, 꺼진 훅은 없는 것과 같다.
문서를 쓴 직후는 **고칠 것이 기억에 남아 있는 때**라 되먹임이 가장 싸다.

돌리는 값은 0.9초쯤이다(2026-08-30 실측). 그래서 매번 돌려도 부담이 없다.

**통과하면 아무 말도 하지 않는다.** 걸릴 때만 stderr 로 알린다 —
조용한 훅이라야 사람이 안 끈다.

성가시면 `.claude/settings.json` 에서 이 항목을 지우면 된다. 되돌리기 쉬운 것이
이 훅의 조건이었다(기획 재량 2026-08-30).
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

# 이 경로를 건드렸을 때만 돈다. **좁게 고른다** — 자주 우는 훅은 꺼진다.
DOC = re.compile(
    r"(^|/)(CLAUDE|README|BLOCKERS|DESIGN)\.md$"
    r"|(^|/)docs/[^/]+\.(md|html)$"
)


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0                      # 입력을 못 읽으면 조용히 지나간다

    path = str((data.get("tool_input") or {}).get("file_path") or "")
    if not path:
        return 0
    try:
        rel = str(Path(path).resolve().relative_to(ROOT))
    except ValueError:
        return 0                      # 저장소 밖 파일
    if not DOC.search(rel):
        return 0

    # 생성물은 사람이 고치는 것이 아니다 — 그쪽은 CI 의 `--check` 가 본다
    if rel.endswith("status.generated.md"):
        return 0

    r = subprocess.run([sys.executable, "docs/check_docs.py"], cwd=ROOT,
                       capture_output=True, text=True)
    if r.returncode == 0:
        return 0                      # 통과하면 아무 말 안 한다

    found = [l for l in (r.stdout + r.stderr).split("\n") if l.strip().startswith("[")]
    print(f"{rel} 를 고친 뒤 check_docs 가 걸렸다:\n" + "\n".join(found[:12]),
          file=sys.stderr)
    return 2                          # 2 = 이 내용을 모델에게 돌려준다


if __name__ == "__main__":
    raise SystemExit(main())
