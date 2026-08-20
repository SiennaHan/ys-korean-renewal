#!/bin/bash
# 듣고 질문에 답하기(listen-answer) 음성 사전 생성 — 백엔드 서버에서 직접 실행
#
# 모든 지시문 + 발화 라인을 Gemini TTS로 미리 만들어 mp3로 S3에 올리고
# ko_tts_cache 를 채운다. 이후 런타임은 전부 캐시히트라 재생 지연이 사라진다.
#
# ⚠️ 런타임 서버(.env)가 바라보는 DB에 대고 실행해야 함. S3는 전역 공유라 무관.
# ⚠️ ffmpeg 필요:  ubuntu -> sudo apt install -y ffmpeg
#
# 사용:
#   bash pregen_listen_audio.sh              # 전체 생성
#   bash pregen_listen_audio.sh --dry-run    # 대상 개수만 확인
#   bash pregen_listen_audio.sh --concurrency 4
#   bash pregen_listen_audio.sh --data-dir /path/to/frontend/src/shared/data

cd "$(dirname "$0")" || exit 1

# 서버와 동일한 파이썬으로 실행 (필요시 python3 로 바꿔 쓰세요)
python tools/pregen_listen_audio.py "$@"
