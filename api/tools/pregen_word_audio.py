#!/usr/bin/env python3
"""단어(고립 어휘) 음성 사전생성 배치.

런타임 POST /tts/word 는 **조회 전용**이라, 단어 음원은 반드시 이 배치로 채워야 한다.
여기서 빠진 단어는 앱에서 무음이 된다(먼저 tools/audit_word_tts.py 로 확인할 것).

- 저장 키는 business/tts.py 의 wordCacheHash 로 고정 — 합성 엔진을 바꿔도 런타임
  조회가 그대로 히트한다. 즉 나중에 OpenAI 로 재생성해도 프런트 수정이 필요 없다.
- 재실행 안전(idempotent): 이미 캐시에 있으면 건너뛴다. --force 로 덮어쓸 수 있다.

⚠️ 반드시 **런타임이 읽는 것과 같은 DB(.env)** 를 바라보는 환경에서 실행할 것.

사용:
  cd backend/koreanapi
  python tools/audit_word_tts.py --out missing.txt   # 대상 뽑기
  python tools/pregen_word_audio.py missing.txt --dry-run
  python tools/pregen_word_audio.py missing.txt --limit 5      # 소량 검증
  python tools/pregen_word_audio.py missing.txt                # 전체
  python tools/pregen_word_audio.py missing.txt --provider openai --force
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys

# koreanapi 루트를 import path 에 추가 (tools/ 하위에서 실행)
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE)

from business import tts                       # noqa: E402
from persistence import repo_chat              # noqa: E402
from persistence.database import sessionScope  # noqa: E402

WORD_GENDER = "female"  # word-learning / flashcard 둘 다 기본값
CHUNK = 50              # 세션당 커밋 단위 — 중단돼도 여기까지는 보존


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("wordfile", help="줄당 단어 하나")
    ap.add_argument("--provider", default=tts.WORD_PREGEN_PROVIDER)
    ap.add_argument("--gender", default=WORD_GENDER)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true", help="캐시 무시하고 재생성")
    ap.add_argument("--limit", type=int)
    ap.add_argument("--concurrency", type=int, default=4)
    args = ap.parse_args()

    if args.provider not in tts.PROVIDERS:
        raise SystemExit(f"알 수 없는 provider: {args.provider} (가능: {list(tts.PROVIDERS)})")

    with open(args.wordfile, encoding="utf-8") as f:
        words = [w.strip() for w in f if w.strip()]
    if args.limit:
        words = words[: args.limit]

    print(f"대상 {len(words)}개 / provider={args.provider} / gender={args.gender}")

    todo = words
    if not args.force:
        todo = []
        with sessionScope() as db:
            for w in words:
                spoken = tts.normalizeWordForTts(w)
                if await repo_chat.getTtsCache(tts.wordCacheHash(args.gender, spoken), db) is None:
                    todo.append(w)
        print(f"이미 보유 {len(words) - len(todo)} / 생성 필요 {len(todo)}")

    if args.dry_run:
        for w in todo[:20]:
            print("  생성예정:", w)
        if len(todo) > 20:
            print(f"  ... 외 {len(todo) - 20}개")
        return 0
    if not todo:
        print("생성할 것이 없습니다.")
        return 0

    sem = asyncio.Semaphore(args.concurrency)
    done = 0
    failed: list[tuple[str, str]] = []

    async def one(word: str, db):
        nonlocal done
        async with sem:
            try:
                await tts.pregenWordAudio(word, args.gender, db, args.provider, args.force)
                done += 1
            except Exception as e:
                failed.append((word, str(e)[:120]))

    for i in range(0, len(todo), CHUNK):
        chunk = todo[i : i + CHUNK]
        with sessionScope() as db:
            await asyncio.gather(*(one(w, db) for w in chunk))
        print(
            f"  [{min(i + CHUNK, len(todo))}/{len(todo)}] 완료 {done} 실패 {len(failed)}",
            flush=True,
        )

    print(f"\n완료: 생성 {done}, 실패 {len(failed)} / 대상 {len(todo)}")
    for w, e in failed[:20]:
        print(f"  실패: {w!r}: {e}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
