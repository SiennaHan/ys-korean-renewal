#!/usr/bin/env python3
"""단어 TTS 사전생성 감사 — 어떤 단어에 음원이 아직 없는지 확인한다.

앱이 POST /tts/word 로 보낼 모든 단어를 모아 ko_tts_cache 를 조회한다.
- 단어 출처: n1_word_list.json(단어학습), flashcard_word.ts(플래시카드)
  두 호출처 모두 voice 기본값이 "female".
- 해시/정규화는 business/tts.py 의 wordCacheHash 를 그대로 재사용하므로 런타임 조회와
  100% 일치한다.

런타임 /tts/word 는 조회 전용이라 여기서 빠진 단어는 앱에서 **무음**이 된다.
읽기 전용이라 아무것도 생성하지 않는다 — 생성은 tools/pregen_word_audio.py 로.

⚠️ 반드시 **런타임이 읽는 것과 같은 DB(.env)** 를 바라보는 환경에서 실행할 것.

사용:
  cd backend/koreanapi
  python tools/audit_word_tts.py                  # 요약 + 미생성 목록
  python tools/audit_word_tts.py --quiet          # 요약만
  python tools/audit_word_tts.py --out missing.txt
  python tools/audit_word_tts.py --data-dir /path/to/frontend/korean/src/shared/data
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys

# koreanapi 루트를 import path 에 추가 (tools/ 하위에서 실행)
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE)

from business import tts                       # noqa: E402
from persistence import repo_chat              # noqa: E402
from persistence.database import sessionScope  # noqa: E402

# 데이터 경로 후보: (1) --data-dir → (2) 나란히 체크아웃된 frontend → (3) tools/data 번들 스냅샷
SIBLING = os.path.join(BASE, "..", "..", "frontend", "korean", "src", "shared", "data")
BUNDLED = os.path.join(BASE, "tools", "data")

WORD_VOICE = "female"  # word-learning / flashcard 둘 다 기본값


def resolveDataDir(explicit: str | None) -> str:
    for cand in (explicit, SIBLING, BUNDLED):
        if cand and os.path.isfile(os.path.join(cand, "n1_word_list.json")):
            return cand
    raise SystemExit(
        "단어 데이터를 찾을 수 없습니다. --data-dir 로 "
        "frontend/korean/src/shared/data 경로를 지정하세요."
    )


def loadWordList(dataDir: str) -> list[tuple[str, str]]:
    with open(os.path.join(dataDir, "n1_word_list.json"), encoding="utf-8") as f:
        return [(r["word"], "word-list") for r in json.load(f) if r.get("word")]


def loadFlashcardWords(dataDir: str) -> list[tuple[str, str]]:
    """flashcard_word.ts 는 TS 파일이지만 배열 리터럴이 순수 JSON 이라 잘라서 파싱한다."""
    path = os.path.join(dataDir, "flashcard_word.ts")
    if not os.path.isfile(path):
        return []
    with open(path, encoding="utf-8") as f:
        src = f.read()
    start = src.index("[", src.index("export const flashcard_words"))
    end = src.rindex("]") + 1
    rows = json.loads(src[start:end])
    return [(r["word"], "flashcard") for r in rows if r.get("word")]


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data-dir")
    ap.add_argument("--quiet", action="store_true", help="미생성 목록 없이 요약만")
    ap.add_argument("--out", help="미생성 단어를 파일로 저장")
    args = ap.parse_args()

    dataDir = resolveDataDir(args.data_dir)
    raw = loadWordList(dataDir) + loadFlashcardWords(dataDir)

    # 같은 단어가 여러 출처에 나와도 음원은 하나 — 정규화 결과 기준으로 중복 제거
    byText: dict[str, set[str]] = {}
    for word, source in raw:
        byText.setdefault(tts.normalizeWordForTts(word), set()).add(source)

    missing: list[tuple[str, list[str]]] = []
    have = 0

    with sessionScope() as db:
        for spoken, sources in sorted(byText.items()):
            if await repo_chat.getTtsCache(tts.wordCacheHash(WORD_VOICE, spoken), db):
                have += 1
            else:
                missing.append((spoken, sorted(sources)))

    print(f"데이터 경로            : {os.path.normpath(dataDir)}")
    print(f"원본 단어 항목         : {len(raw)}")
    print(f"고유 발화 텍스트       : {len(byText)}")
    print(f"  음원 有              : {have}")
    print(f"  음원 없음(생성 필요) : {len(missing)}")

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            for spoken, _ in missing:
                f.write(spoken + "\n")
        print(f"\n미생성 목록 저장: {args.out}")
    elif missing and not args.quiet:
        print("\n--- 미생성 목록 ---")
        for spoken, sources in missing:
            print(f"  {spoken}\t({','.join(sources)})")

    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
