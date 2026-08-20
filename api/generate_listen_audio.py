"""
듣기 지문 발화 라인별 mp3 사전 생성 스크립트

사용법 (backend/koreanapi 에서):
    python generate_listen_audio.py

- frontend/korean/src/shared/data/n3_listen_script_line.json 을 읽어
  각 라인을 OpenAI TTS 로 합성 → frontend/korean/public/audio/listen/{script_id}/{seq}.mp3
- 라인의 voice 는 성별("male"/"female") — resolveVoice 로 실제 화자 이름을 얻는다.
- 이미 존재하는 파일은 스킵 (재실행 가능)
"""

import asyncio
import json
import os
import sys
import time

from business import tts as tts_business
from xternal import openai as openai_xternal

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LINE_JSON = os.path.join(
    ROOT, "frontend", "korean", "src", "shared", "data", "n3_listen_script_line.json"
)
OUT_DIR = os.path.join(ROOT, "frontend", "korean", "public", "audio", "listen")


async def main():
    with open(LINE_JSON, encoding="utf-8") as f:
        lines = json.load(f)

    total = len(lines)
    generated = 0
    skipped = 0
    failures = []

    for i, line in enumerate(lines, 1):
        outDir = os.path.join(OUT_DIR, str(line["script_id"]))
        outPath = os.path.join(outDir, f"{line['seq']}.mp3")
        if os.path.exists(outPath) and os.path.getsize(outPath) > 0:
            skipped += 1
            continue

        os.makedirs(outDir, exist_ok=True)
        voiceName = tts_business.resolveVoice(line["voice"], 0, "openai")
        audio = await openai_xternal.tts(line["text"], voiceName)
        if not audio:
            failures.append(line)
            print(f"[{i}/{total}] 실패: script {line['script_id']} seq {line['seq']}")
            continue

        with open(outPath, "wb") as f:
            f.write(audio)
        generated += 1
        if generated % 50 == 0:
            print(f"[{i}/{total}] 생성 {generated} / 스킵 {skipped} / 실패 {len(failures)}")
        time.sleep(0.1)  # API 부하 방지

    print(f"\n완료: 생성 {generated}, 스킵 {skipped}, 실패 {len(failures)} / 전체 {total}")
    if failures:
        print("실패 라인:")
        for line in failures:
            print(f"  script {line['script_id']} seq {line['seq']}: {line['text'][:40]}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
