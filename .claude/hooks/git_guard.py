#!/usr/bin/env python3
"""남의 작업을 쓸어 담거나 지우는 명령을 **막는다**.

**왜 있나.** 2026-08-30 에 하네스가 깨끗한 트리를 요구해서 `git add -A` 로 임시
커밋을 만들었다가, 그 사이 다른 세션이 푸시하면서 **내 wip 이 얹혀 원격으로
나갔다.** 그날 남긴 결론은 "다음부터 조심하자" 였는데 — 그건 장치가 아니다.

이 저장소는 거의 항상 세션이 둘 이상이고, 작업 트리도 `app/.env` 도 공유물이다.
**틀린 길이 맞는 길보다 짧으면 결국 틀린 길로 간다** (`git add -A` 는 짧고
`git commit --only -- <경로들>` 은 길다). 그래서 짧은 쪽을 없앤다.

## 무엇을 막고 무엇을 안 막나

**막는다** — 남의 것을 담거나 지우는 것. 되돌리기 어렵거나 원격으로 새어 나간다.
**경고만 한다** — pathspec 없는 `git commit`. 스테이징이 이미 막혀 있어서
쓸어 담기가 불가능하고, `reset --soft` 뒤의 정당한 커밋을 막으면 안 된다.

## 빠져나갈 문을 두지 않는다

`ALLOW_ONCE=1` 같은 것을 두면 **그게 가장 싼 길이 된다.** 정말 필요하면 사람이
`.claude/settings.json` 에서 이 훅을 지우면 된다 — 되돌리기 쉬운 것이 조건이었다.

## 막을 때는 맞는 명령을 완성해서 돌려준다

막기만 하면 우회가 더 싸진다. 거부 메시지에 **지금 상황에 맞는 명령**을 적어 주면
맞는 길이 오히려 더 싸진다 — 그게 이 훅이 실제로 노리는 것이다.
"""
from __future__ import annotations

import json
import re
import shlex
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ENV = "app/.env"


def sh(*args: str) -> str:
    try:
        r = subprocess.run(args, cwd=ROOT, capture_output=True, text=True, timeout=10)
        return r.stdout if r.returncode == 0 else ""
    except (OSError, subprocess.SubprocessError):
        return ""


def dirty() -> list[str]:
    """지금 더러운 추적 파일. 거부 메시지에 대안을 적어 주려고 쓴다."""
    return [l[3:].strip() for l in sh("git", "status", "--porcelain").split("\n")
            if l.strip()]


def staged() -> list[str]:
    return [l for l in sh("git", "diff", "--cached", "--name-only").split("\n")
            if l.strip()]


# ── 각 갈래를 알아보는 눈 ────────────────────────────────────
#
# **명령줄 하나에 여러 명령이 있을 수 있다** (`a && b`, `a; b`, `a | b`).
# 그래서 통째로 정규식을 걸지 않고 **조각으로 잘라 각각 본다** — 안 그러면
# `echo "git add -A 는 하지 마라"` 같은 문장도 걸리고, 반대로
# `cd x && git add -A` 를 놓친다.
SPLIT = re.compile(r"&&|\|\||;|\n|\|")

HEREDOC = re.compile(r"<<-?\s*['\"]?(\w+)['\"]?")


def strip_heredocs(cmd: str) -> str:
    """히어독 **본문을 판단에서 뺀다.**

    본문은 실행되는 명령이 아니라 글이다. 이 저장소의 커밋 메시지는 사고를
    적으므로 `git add -A` 같은 말이 그대로 들어간다 — 실제로 오늘 그런 메시지를
    썼다. 본문을 안 빼면 **훅이 저 자신을 설명하는 커밋을 막는다.**
    그런 거짓 양성이 한 번 나면 사람은 훅을 끈다.
    """
    out, lines, i = [], cmd.split("\n"), 0
    while i < len(lines):
        out.append(lines[i])
        m = HEREDOC.search(lines[i])
        if m:
            end, i = m.group(1), i + 1
            while i < len(lines) and lines[i].strip() != end:
                i += 1                # 본문은 버린다
            if i < len(lines):
                out.append(lines[i])  # 종료 표시는 남긴다
        i += 1
    return "\n".join(out)


def words(seg: str) -> list[str]:
    try:
        return shlex.split(seg)
    except ValueError:              # 따옴표가 안 닫힌 조각 — 판단하지 않는다
        return seg.split()


def git_sub(w: list[str]) -> tuple[str, list[str]] | None:
    """`git [옵션] <하위명령> [나머지]` 를 알아본다. git 이 아니면 None."""
    if not w:
        return None
    i = 0
    if w[0] == "env":               # `env FOO=1 git …`
        i = 1
        while i < len(w) and "=" in w[i] and not w[i].startswith("-"):
            i += 1
    if i >= len(w) or Path(w[i]).name != "git":
        return None
    i += 1
    while i < len(w) and w[i].startswith("-"):   # -C path, --no-pager 등
        if w[i] in ("-C", "-c", "--git-dir", "--work-tree"):
            i += 2
        else:
            i += 1
    return (w[i], w[i + 1:]) if i < len(w) else None


def check(seg: str) -> tuple[bool, str] | None:
    """(막을까, 할 말). 아무 문제 없으면 None."""
    w = words(seg)
    g = git_sub(w)

    # ── git 이 아닌 명령: app/.env 를 덮어쓰는가
    if g is None:
        if ENV in seg and re.search(rf"(>\s*|>>\s*)\S*{re.escape(ENV)}", seg):
            return True, (
                f"`{ENV}` 로 리다이렉트한다. **그 파일은 공유물이다** — 바꾸면\n"
                "다른 세션이 띄워 둔 앱까지 같이 옮겨 간다(8000/3000 포트 사고).\n"
                "정말 필요하면 백업하고 **바이트까지** 되돌려라:\n"
                f"  cp {ENV} /tmp/env.bak   # … 작업 … \n"
                f"  cp /tmp/env.bak {ENV} && cmp {ENV} /tmp/env.bak")
        if re.match(r"^\s*(cp|mv|install)\b", seg) and re.search(
                rf"{re.escape(ENV)}\s*$", seg):
            return True, f"`{ENV}` 를 덮어쓴다 — 공유물이다. 위와 같다"
        return None

    sub, rest = g

    # ── git add -A / . / --all
    if sub == "add":
        for a in rest:
            if a in ("-A", "--all", "-Av", "--no-ignore-removal") or a == ".":
                d = dirty()
                mine = "  git add <내가 고친 파일들>"
                if d:
                    mine = "  git add " + " ".join(d[:6]) + (" …" if len(d) > 6 else "")
                return True, (
                    f"`git add {a}` — **남의 미완성 작업을 같이 담는다.**\n"
                    "이 저장소는 거의 항상 세션이 둘 이상이고, 실제로 그렇게\n"
                    "wip 커밋이 원격으로 나갔다(2026-08-30).\n"
                    "지금 더러운 파일: " + (", ".join(d[:8]) if d else "(없음)") + "\n"
                    "이름을 적어라 →\n" + mine)

    # ── git commit -a / -am
    if sub == "commit":
        for a in rest:
            if a == "--all" or (re.match(r"^-[a-zA-Z]+$", a) and "a" in a[1:]):
                return True, (
                    f"`git commit {a}` — `-a` 는 **추적 파일 전부**를 담는다.\n"
                    "남의 것이 섞인다. 경로를 적어라 →\n"
                    "  git commit --only -- <내 경로들> -m '…'")
        # pathspec 도 --only 도 없는 커밋: 막지 않고 무엇이 담기는지만 보여 준다
        if "--" not in rest and "--only" not in rest and "--amend" not in rest:
            s = staged()
            if s:
                return False, ("스테이지된 것을 그대로 커밋한다 — 확인해라:\n  "
                               + "\n  ".join(s[:12])
                               + (f"\n  … 외 {len(s) - 12}개" if len(s) > 12 else ""))

    # ── 힘으로 미는 것
    if sub == "push":
        has_force = any(a in ("-f", "--force") for a in rest)
        has_lease = any(a.startswith("--force-with-lease") for a in rest)
        if has_force and not has_lease:
            return True, (
                "`git push --force` — **남이 그 사이에 민 커밋을 지운다.**\n"
                "`--force-with-lease` 는 원격이 움직였으면 스스로 거부한다 →\n"
                "  git push --force-with-lease origin main")

    # ── 남의 미커밋 작업을 지우는 것
    if sub == "reset" and any(a == "--hard" for a in rest):
        d = dirty()
        return True, (
            "`git reset --hard` — **남의 미커밋 작업을 지운다.**\n"
            f"지금 더러운 파일: {', '.join(d[:8]) if d else '(없음)'}\n"
            "브랜치 끝만 옮기려는 것이면 작업 트리를 안 건드리는 쪽을 써라 →\n"
            "  git reset --soft <커밋>        # 내용은 스테이지에 남는다\n"
            "  git branch -f <브랜치> <커밋>  # 다른 브랜치를 옮길 때")
    if sub in ("checkout", "restore") and any(a in (".", ":/") for a in rest):
        return True, (
            f"`git {sub} .` — **되돌린 내용이 남의 것일 수 있다.**\n"
            "파일을 이름으로 적어라 →\n"
            f"  git {sub} -- <되돌릴 파일>")

    return None


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0
    cmd = str((data.get("tool_input") or {}).get("command") or "")
    if not cmd or "git" not in cmd and ENV not in cmd:
        return 0

    blocks, notes = [], []
    for seg in SPLIT.split(strip_heredocs(cmd)):
        if not seg.strip():
            continue
        r = check(seg)
        if r is None:
            continue
        (blocks if r[0] else notes).append(r[1])

    if blocks:
        print("이 명령은 막았다 — 이 저장소는 세션이 여럿이다.\n\n"
              + "\n\n".join(blocks), file=sys.stderr)
        return 2                      # 2 = 막고, 이 내용을 모델에게 준다
    if notes:
        print("\n".join(notes), file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
