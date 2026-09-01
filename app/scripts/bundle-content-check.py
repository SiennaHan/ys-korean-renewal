#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""번들에 콘텐츠가 실려 나가나 — 원장 밖에서 오는 것을 잡는다.

## 왜 이것이 필요한가

2026-08-31 에 교재 문항을 서버로 옮겼다(DEV-05). 그런데 **그 뒤로도 두 번**,
화면이 원장이 아니라 번들의 옛 파일을 읽고 있는 것이 뒤늦게 드러났다:

- 미션 대화의 미션 칩이 `dialog_keyword.ts` 에서 왔다. 117과 중 28과에서 라벨·개수가,
  109과에서 지시문이 원장과 달랐다. **브리핑과 대화 화면이 서로 다른 것을 그리고
  있었는데** 사람이 눈으로 보고 찾았다(2026-09-01).
- 힌트 354행은 반대였다 — 원장에만 있고 아무 데도 안 닿았다.

`build-content.py --check` 도 `seed --check` 도 이것을 못 잡는다. **둘 다 원장에서
출발하는 사슬만 보기 때문이다.** 화면이 그 사슬 **밖**을 보고 있으면 양쪽 다 통과한다.
이 검사는 반대쪽에서 본다 — **번들에 실리는 데이터 파일을 세고, 허락한 것 말고는
막는다.**

## 무엇을 데이터로 보나

`app/src/shared/data/` 의 `.ts` 중 **여러 줄짜리 객체 배열을 내보내는 것**과,
앱 코드가 `import` 하는 `.json`. 타입·헬퍼만 있는 파일은 대상이 아니다.

`n*.json` 은 대부분 **씨드용 산출물**이라 앱이 import 하지 않는다 — 그것이 정상이고,
누가 그 중 하나를 화면에서 직접 import 하면 여기서 걸린다.

끝에 0 을 내면 통과다.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
APP = HERE.parent
DATA = APP / "src/shared/data"

# 일부러 번들에 두는 것. **이유를 적어야 들어올 수 있다.**
#
# 여기 더하는 것은 「원장 밖 콘텐츠를 학습자에게 그대로 내보낸다」는 결정이다.
# 값이 원장과 갈라져도 아무도 모르게 된다 — 위 미션 칩이 그랬다.
ALLOW: dict[str, str] = {
    # 과 구조 — 콘텐츠가 아니라 주소다. chapter.ts 는 과 구조의 정본이다(CLAUDE.md).
    "book.ts": "급 목록 8행 — 주소",
    "chapter.ts": "과 구조 120행 — **과 구조의 정본이다**. 원장이 아니라 여기가 기준",
    "unit.ts": "자모 라우팅 구조 243행 — 주소",
    "module.ts": "자모 라우팅 구조 463행 — 주소",
    # 자모 — 일부러 남긴 것(CLAUDE.md · BLOCKERS §2)
    "n8_jamo.json": "자모 529행 — 일부러 번들에 남겼다. 주소 색인이라 서버에 두면 매 화면이 왕복한다",
    "problem_wordgroup.ts": "자모 낱말 묶음 52행 — 자모와 같이 남겼다",
    "problem_wordgroup_choice.ts": "자모 낱말 340행 — 자모와 같이 남겼다",
    # 게임 — 교재 문항이 아니다
    "vocashot-bank.ts": "게임 어휘 은행 — 교재 문항이 아니라 게임 자산이다",
    # 표현클립 — **번들에서 가장 큰 것이다.** 아래 주석을 읽고 넘겨라
    "clip.ts": "표현클립 329편 — 원장에 시트가 없는 고유 콘텐츠. 서버 표도 라우트도 없다"
               "(clip_spec_v1). 무료·비로그인 탭이라 **막을 권한이 없어 새는 문제는 아니다**",
}

# 위 ALLOW 가 「괜찮다」는 뜻은 아니다. clip.ts 는 원본 5.5MB · 지연 청크 하나로
# 나가고 gzip 2.0MB 다 — **실려 나가는 JS 의 71%가 이 하나**다(2026-09-01 실측).
# 무료 탭이라 권한 문제는 없지만, 그 탭이 비로그인 첫 화면이라 받는 크기가 곧
# 첫인상이다(clip.ts 머리말이 같은 말을 한다). 서버로 옮기는 것은 DEV-05 가
# 안 건드린 자리다 — 표도 라우트도 아직 없다(clip_spec_v1 §04).
#
# **크기를 매번 찍는 이유가 이것이다.** 「있다/없다」로만 보면 이 수가 두 배가 돼도
# 아무 일도 안 일어난다.


def app_sources() -> dict[str, str]:
    out = subprocess.run(
        ["bash", "-c",
         "find src -name '*.ts' -o -name '*.tsx' | grep -v screens_ref"],
        cwd=APP, capture_output=True, text=True, check=True).stdout.split()
    return {f: (APP / f).read_text(encoding="utf-8") for f in out}


def data_rows(text: str) -> int:
    """객체 배열의 항목 수. 타입·헬퍼는 0 이 나온다.

    **한 줄로 민 배열도 센다.** 처음엔 `\n  {` 만 셌는데 `vocashot-bank.ts`(169KB)가
    한 줄짜리라 0 으로 나와 **검사를 통째로 빠져나갔다.** 검사기에 이런 구멍이 있으면
    막으려던 바로 그 일이 다시 난다 — 아래 크기 문턱도 같은 이유로 둔다.
    """
    return max(text.count("\n  {") + text.count("\n\t{"),
               text.count("},{") + (1 if "[{" in text else 0))


def main() -> int:
    src = app_sources()
    rows_by_file = {}
    offenders, allowed = [], []

    for p in sorted(DATA.iterdir()):
        if p.suffix not in (".ts", ".json") or p.name.endswith(".d.ts"):
            continue
        text = p.read_text(encoding="utf-8")
        if p.suffix == ".json":
            try:
                n = len(json.load(open(p, encoding="utf-8")))
            except Exception:
                n = 0
        else:
            n = data_rows(text)
        rows_by_file[p.name] = n
        kb_raw = p.stat().st_size // 1024
        # 행 세기가 못 알아보는 꼴이 있을 수 있다 — 크기로도 한 번 더 본다.
        # 타입·헬퍼가 20KB 를 넘는 일은 이 폴더에 없다(가장 큰 것이 6KB).
        if n <= 5 and kb_raw < 20:
            continue
        # 앱이 이 파일을 import 하나
        stem = re.escape(p.stem)
        pat = re.compile(r'from "[^"]*(?:data/' + stem + r'|' + re.escape(p.name) + r')"')
        importers = sorted(f for f, s in src.items()
                           if f != f"src/shared/data/{p.name}" and pat.search(s))
        if not importers:
            continue                    # 씨드용 산출물 — 번들에 안 실린다
        kb = p.stat().st_size // 1024
        (allowed if p.name in ALLOW else offenders).append((p.name, kb, n, importers))

    print("번들에 실리는 데이터 파일\n")
    for name, kb, n, imp in sorted(allowed, key=lambda x: -x[1]):
        print(f"  {name:32s}{kb:>6}KB {n:>5}행   {ALLOW[name]}")
    if offenders:
        print()
        for name, kb, n, imp in sorted(offenders, key=lambda x: -x[1]):
            print(f"  ❌ {name:29s}{kb:>6}KB {n:>5}행")
            for f in imp[:3]:
                print(f"        ← {f}")

    if not offenders:
        print("\n통과 — 허락한 것 말고는 번들에 콘텐츠가 없다")
        return 0

    print("\n❌ 원장 밖 콘텐츠가 번들에 실린다.")
    print("   **화면이 이것을 읽으면 원장과 갈라져도 아무도 모른다** — 미션 칩이 그랬다")
    print("   (117과 중 109과에서 지시문이 달랐고, 사람이 눈으로 보고 찾았다).")
    print("   서버로 옮기든지, 일부러 두는 것이면 ALLOW 에 **이유를 적어라**.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
