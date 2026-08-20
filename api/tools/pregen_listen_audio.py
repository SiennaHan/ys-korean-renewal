#!/usr/bin/env python3
"""듣고 질문에 답하기(listen-answer) 음성 사전 생성 배치.

모든 문제의 지시문(question) + 발화 라인을 Gemini TTS로 생성 → mp3 변환(ffmpeg) →
S3 업로드 → ko_tts_cache 에 hash→url 저장한다.
런타임 POST /tts/listen/audio 는 동일 hash로 전부 캐시히트되어 생성 지연 없이
즉시 URL을 반환한다.

- hash / voice 배정은 business/tts.py 를 그대로 재사용하므로 런타임과 100% 일치.
- 재실행 안전(idempotent): 이미 캐시에 있으면 건너뜀. 중단 후 재실행하면 남은 것만 생성.
- mp3(모노, 64kbps)로 저장 → WAV 대비 용량 1/5 수준이라 재생 다운로드도 빨라짐.

⚠️ 반드시 **런타임이 읽는 것과 같은 DB(.env)** 를 바라보는 환경에서 실행할 것.
   (S3 버킷은 전역 공유라 문제없음)

사용:
  cd backend/koreanapi
  python tools/pregen_listen_audio.py             # 전체 생성
  python tools/pregen_listen_audio.py --dry-run   # 생성 없이 대상 개수만 확인
  python tools/pregen_listen_audio.py --concurrency 4
  python tools/pregen_listen_audio.py --data-dir /path/to/frontend/src/shared/data
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import shutil
import subprocess
import sys
from collections import defaultdict

# koreanapi 루트를 import path 에 추가 (tools/ 하위에서 실행)
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE)

from business import tts                       # noqa: E402
from persistence import repo_chat              # noqa: E402
from persistence.database import sessionScope  # noqa: E402
from util import s3utils                       # noqa: E402
from xternal import gemini                     # noqa: E402

# 데이터 경로 후보: (1) --data-dir → (2) 나란히 체크아웃된 frontend → (3) tools/data 번들 스냅샷
SIBLING = os.path.join(BASE, "..", "..", "frontend", "korean", "src", "shared", "data")
BUNDLED = os.path.join(BASE, "tools", "data")

MP3_BITRATE = "64k"  # 음성용 모노


def resolve_data_dir(arg):
    for cand in [arg, SIBLING, BUNDLED]:
        if cand and os.path.isfile(os.path.join(cand, "n3_listen_repeat.json")):
            return os.path.abspath(cand)
    raise SystemExit(
        "듣기 데이터(n3_listen_repeat.json)를 찾을 수 없습니다. --data-dir 로 경로를 지정하세요."
    )


def load_json(data_dir, name):
    with open(os.path.join(data_dir, name), encoding="utf-8") as f:
        return json.load(f)


def wav_to_mp3(wav):
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error",
         "-i", "pipe:0", "-ac", "1", "-codec:a", "libmp3lame", "-b:a", MP3_BITRATE,
         "-f", "mp3", "pipe:1"],
        input=wav, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg 변환 실패: {proc.stderr.decode('utf-8', 'ignore')[:200]}")
    return proc.stdout


def build_jobs(data_dir):
    """{hash: (text, voiceName)} — 런타임과 동일한 hash/voice로 유니크 작업 목록 구성.

    지시문(question)은 음성 없이 화면에서 읽으므로 생성하지 않는다. 발화 라인만 대상.
    """
    questions = load_json(data_dir, "n3_listen_repeat.json")
    lines_all = load_json(data_dir, "n3_listen_script_line.json")

    by_script = defaultdict(list)
    for ln in lines_all:
        by_script[ln["script_id"]].append(ln)
    for sid in by_script:
        by_script[sid].sort(key=lambda x: x["seq"])

    jobs = {}

    def add(text, voice):
        if text and text.strip():
            jobs[tts.ttsHash(tts.TTS_PROVIDER, voice, text)] = (text, voice)

    # 문제가 참조하는 지문의 발화 라인만 생성 (지시문 제외)
    for sid in {q["script_id"] for q in questions}:
        lines = by_script.get(sid, [])
        slots = tts.assignSlots(lines)
        for ln in lines:
            gender, slot = slots[ln["speaker"]]
            add(ln["text"], tts.resolveVoice(gender, slot))

    return jobs


async def generate_one(hash_key, text, voice, sem, stats):
    async with sem:
        try:
            with sessionScope() as db:
                if await repo_chat.getTtsCache(hash_key, db) is not None:
                    stats["skip"] += 1
                    return

            last = None
            for attempt in range(3):  # 레이트리밋/일시 오류 재시도
                try:
                    wav = await gemini.gemini_tts(text, voice)
                    mp3 = await asyncio.to_thread(wav_to_mp3, wav)
                    url = await s3utils.public_upload_to_s3(
                        mp3, tts.S3_DIRNAME, f"{hash_key}.mp3", "audio/mpeg"
                    )
                    with sessionScope() as db:
                        await repo_chat.upsertTtsCache(hash_key, voice, text, url, db)
                    stats["gen"] += 1
                    print(f"  [gen {stats['gen']:4}] {voice:8} {text[:28]}")
                    return
                except Exception as e:  # noqa: BLE001
                    last = e
                    await asyncio.sleep(1.5 * (attempt + 1))

            stats["err"] += 1
            print(f"  [ERR] {voice:8} {text[:28]} :: {last}", file=sys.stderr)
        except Exception as e:  # noqa: BLE001
            stats["err"] += 1
            print(f"  [ERR] {text[:28]} :: {e}", file=sys.stderr)


async def run(data_dir, concurrency, dry_run):
    jobs = build_jobs(data_dir)
    print(f"데이터: {data_dir}")
    print(f"provider={tts.TTS_PROVIDER}  유니크 음성 작업: {len(jobs)}개")
    if dry_run:
        print("(--dry-run: 생성하지 않고 종료)")
        return
    if not shutil.which("ffmpeg"):
        raise SystemExit("ffmpeg 가 필요합니다. (ubuntu: sudo apt install -y ffmpeg / mac: brew install ffmpeg)")

    sem = asyncio.Semaphore(concurrency)
    stats = {"gen": 0, "skip": 0, "err": 0}
    await asyncio.gather(*[
        generate_one(h, t, v, sem, stats) for h, (t, v) in jobs.items()
    ])

    print(f"\n완료 — 생성 {stats['gen']}, 스킵(이미존재) {stats['skip']}, 실패 {stats['err']}")
    if stats["err"]:
        print("실패 항목이 있습니다. 같은 명령을 다시 실행하면 남은 것만 재생성합니다.")


def main():
    ap = argparse.ArgumentParser(description="듣고 질문에 답하기 음성 사전 생성")
    ap.add_argument("--data-dir", default=None, help="listen JSON 디렉터리 (기본: frontend 또는 번들)")
    ap.add_argument("--concurrency", type=int, default=4, help="동시 생성 개수 (기본 4)")
    ap.add_argument("--dry-run", action="store_true", help="생성 없이 대상 개수만 출력")
    args = ap.parse_args()

    data_dir = resolve_data_dir(args.data_dir)
    asyncio.run(run(data_dir, args.concurrency, args.dry_run))


if __name__ == "__main__":
    main()
