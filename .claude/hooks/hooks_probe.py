#!/usr/bin/env python3
"""훅이 **실제로 도는지** 확인한다 — 등록된 명령을 그대로 실행해서.

**왜 있나.** 2026-08-31 에 세 훅이 전부 죽어 있었다. `settings.json` 에 명령을
상대 경로(`python3 .claude/hooks/git_guard.py`)로 적어 뒀는데, `cd app` 을 한 순간
기준점이 같이 옮겨 갔다(Bash 의 작업 디렉터리는 호출 사이에 유지된다).

**이 실패가 조용하다는 것이 핵심이다.** "파일 없음" 한 줄이 뜨긴 하지만 그 사이에
친 `git add -A` 는 그냥 통과한다. 어제 하루 종일 「게이트가 조용히 사라지는 자리」를
쫓았는데 내가 만든 가드가 같은 꼴이었다. 기억에 적어 두는 것은 조치가 아니다 —
**다음에 또 죽으면 그때도 모른다.** 그래서 죽었는지를 묻는 것을 만든다.

## 훅 파일이 아니라 「등록된 명령」을 돌린다

`git_guard.py` 를 직접 부르는 시험은 **이 사고를 못 잡는다** — 파일은 멀쩡했고
`settings.json` 의 경로가 틀렸을 뿐이다. 그래서 `settings.json` 을 읽어
거기 적힌 명령 문자열을 **셸로 그대로** 돌린다. 그리고 **저장소 루트와 하위
디렉터리에서 각각** 돌린다. 하위에서 안 돌리면 이 사고는 영영 안 보인다.

## 아무것도 못 찾으면 실패다

「없다」를 뽑는 것이 가장 위험하다. 훅이 0개로 읽히면 모든 항목이 조용히 건너뛰어
**초록불이 뜬다.** 그래서 기대하는 훅이 하나라도 안 걸려 있으면 실패시킨다.

    python3 .claude/hooks/hooks_probe.py
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SETTINGS = ROOT / ".claude" / "settings.json"

# 반드시 걸려 있어야 하는 훅. **이름이 아니라 스크립트 파일로 찾는다** —
# matcher 를 바꾸는 것은 정상이지만 훅이 통째로 빠지는 것은 사고다.
REQUIRED = {
    "git_guard.py": "PreToolUse",
    "doc_gate.py": "PostToolUse",
    "shrink_guard.py": "PostToolUse",
}

# (이름, 훅파일, stdin JSON, 기대 종료코드)
#
# **막는 쪽과 통과하는 쪽을 둘 다 넣는다.** 막는 것만 보면, 훅이 무엇이든 2를 내도록
# 망가졌을 때 초록으로 보인다.
CASES = [
    ("git_guard: git add -A 를 막는다", "git_guard.py",
     {"tool_input": {"command": "git add -A"}}, 2),
    ("git_guard: git push --force 를 막는다", "git_guard.py",
     {"tool_input": {"command": "git push --force origin main"}}, 2),
    ("git_guard: app/.env 덮어쓰기를 막는다", "git_guard.py",
     {"tool_input": {"command": "echo X=1 > app/.env"}}, 2),
    ("git_guard: 멀쩡한 명령은 통과시킨다", "git_guard.py",
     {"tool_input": {"command": "git status --short"}}, 0),
    ("git_guard: 이름을 적은 add 는 통과시킨다", "git_guard.py",
     {"tool_input": {"command": "git add README.md"}}, 0),
    ("shrink_guard: 멀쩡한 트리에선 조용하다", "shrink_guard.py",
     {"tool_input": {"file_path": "README.md"}}, 0),
    ("doc_gate: 문서가 아니면 조용하다", "doc_gate.py",
     {"tool_input": {"file_path": str(ROOT / "app" / "package.json")}}, 0),
]


def registered() -> dict[str, str]:
    """`settings.json` 에 실제로 적힌 명령. {훅파일이름: 명령문자열}"""
    if not SETTINGS.exists():
        return {}
    try:
        data = json.loads(SETTINGS.read_text(encoding="utf-8"))
    except ValueError as e:
        print(f"settings.json 을 못 읽었다 — {e}")
        return {}
    out: dict[str, str] = {}
    for event, groups in (data.get("hooks") or {}).items():
        for g in groups or []:
            for h in g.get("hooks") or []:
                cmd = str(h.get("command") or "")
                for name in REQUIRED:
                    if name in cmd:
                        out[name] = cmd
    return out


def main() -> int:
    reg = registered()
    missing = sorted(set(REQUIRED) - set(reg))
    if missing:
        print("등록되지 않은 훅이 있다 — " + ", ".join(missing))
        print("  훅이 빠지면 이 검사의 나머지가 조용히 건너뛰므로 여기서 멈춘다.")
        return 1

    # **루트와 하위 디렉터리 둘 다.** 하위에서 안 돌리면 상대 경로 사고가 안 보인다.
    places = [ROOT] + [ROOT / d for d in ("app", "docs") if (ROOT / d).is_dir()]
    ok, bad = 0, []
    for cwd in places:
        where = "." if cwd == ROOT else cwd.name + "/"
        for name, hook, payload, want in CASES:
            cmd = reg[hook]
            r = subprocess.run(["bash", "-c", cmd], cwd=cwd, input=json.dumps(payload),
                               capture_output=True, text=True, timeout=60)
            label = f"[{where}] {name}"
            if r.returncode == want:
                ok += 1
                print(f"  OK    {label}")
            else:
                bad.append(label)
                err = (r.stderr or "").strip().split("\n")[0][:90]
                print(f"  ⚠ 어긋남 {label}  기대 {want} · 실제 {r.returncode}  {err}")

    print(f"\n{ok + len(bad)}개 중 {ok}개가 제 몫을 한다."
          f"  (돌린 자리: {', '.join('.' if p == ROOT else p.name + '/' for p in places)})")
    if bad:
        print("\n어긋난 것 —")
        for b in bad:
            print("  " + b)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
