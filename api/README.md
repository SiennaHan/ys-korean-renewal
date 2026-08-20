# koreanapi

Speako 메인 API (포트 8000) — 채팅, 인증, TTS, STT, 다이얼로그, 플래시카드, 어드민/학교/학생 관리.

## 요구사항

- **Python 3.12**
- **MySQL** (`.env` 의 `DB_*` 로 접속)
- **ffmpeg** — 듣기 음성 사전 생성 배치(`tools/pregen_listen_audio.py`)에서 Gemini TTS 결과(WAV)를 mp3로 변환하는 데 필요
  ```bash
  # ubuntu
  sudo apt install -y ffmpeg
  # mac
  brew install ffmpeg
  ```

## 설치 & 실행

```bash
pip install -r requirements.txt

python server.py        # 개발 서버 (.env 의 SERVER_ADDRESS/PORT 사용)
bash start.sh           # 운영: gunicorn 8 workers, 포트 8000
bash stop.sh            # 운영 프로세스 종료
```

## 환경 변수 (`.env`)

`SERVER_ADDRESS`, `SERVER_PORT`, `LOG_LEVEL`, `JWT_SECRET`, `JWT_ALGORITHM`,
`DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`,
`OPENAI_API_KEY`, `GEMINI_API_KEY`

QR 추적(`/qr/scan`) 관련 선택 환경 변수:

- `QR_TRACKING_SECRET`: IP 및 IP+User-Agent HMAC 키. 미설정 시 `JWT_SECRET` 사용
- `QR_STORE_RAW_IP`: `true`이면 IP 원문 저장, 기본값은 HMAC 해시 저장
- `QR_GEOIP_URL`: `{ip}` 자리표시자를 포함한 GeoIP JSON API URL. 기본값은 `https://ipapi.co/{ip}/json/`, 빈 문자열이면 외부 조회 비활성화

QR 테이블은 서버 시작 시 자동 생성된다. 운영에서 DDL을 별도 적용하려면
`migration_qr_tracking.sql`을 먼저 실행한다.
이미 QR 테이블이 생성된 환경은 배포 전에 `migration_qr_access_url.sql`을 한 번 실행해
접속 주소 컬럼을 추가해야 한다(`create_all`은 기존 테이블에 컬럼을 추가하지 않음).

S3 업로드(`util/s3utils.py`)는 boto3 기본 자격증명 체인을 사용하므로, 실행 환경에
AWS 쓰기 크레덴셜(`~/.aws/credentials`, region `ap-northeast-2`, 버킷 `pulley-mock`)이 있어야 한다.

## TTS 구조

모든 음성은 **공통 코어 `business/tts.py:getCachedTtsUrl`** 를 거친다:
`sha256(provider::voice::text)` 해시로 `ko_tts_cache` 조회 → 미스 시 Gemini TTS 생성 →
S3(`korean/tts/audio/{hash}.{ext}`) 업로드 → upsert. 텍스트/목소리가 바뀌면 해시가 바뀌어
화면 텍스트와 음성이 어긋나지 않는다. 제공사 교체는 `TTS_PROVIDER` 환경변수 + `PROVIDERS`
레지스트리의 voice 테이블만 수정하면 된다(기본 `gemini`).

### 듣고 질문에 답하기 음성 사전 생성 (mp3 배치)

**왜:** 듣기 음성을 런타임에 온디맨드로 만들면 첫 재생에 Gemini 생성 지연이 생기고,
Gemini 출력이 WAV(무압축)라 다운로드도 느리다. 그래서 모든 듣기 음성을 **미리 mp3로 생성**해
캐시(`ko_tts_cache` + S3)를 채워두면 런타임 `POST /tts/listen/audio` 가 전부 캐시히트가 되어
생성 지연 없이 즉시 응답한다. **앱 재배포는 필요 없다** — 이미 배포된 런타임이 이 캐시를 읽는다.

**무엇을 생성하나:** 지문의 발화 라인만. (지시문(`question`)은 음성 없이 화면에서 읽으므로
생성하지 않는다.) 화자·성별에 따라 목소리를 배정(남 Charon/Orus, 여 Erinome/Kore/Leda/Aoede)하고,
`business/tts.py` 의 `ttsHash`/`assignSlots`/`resolveVoice` 를 그대로 재사용하므로
**런타임 해시와 100% 일치**한다. 현재 데이터 기준 유니크 음성 약 **1,768개** (`--dry-run` 으로 정확한 수 확인).

**출력:** 모노 64kbps **mp3** (WAV 대비 용량 약 1/5) → S3 `korean/tts/audio/{hash}.mp3`,
`ko_tts_cache` 에 `hash → url` 저장. WAV→mp3 변환은 **ffmpeg** 로 수행한다.

**실행 (백엔드 서버에서):**

```bash
cd backend/koreanapi
git pull
sudo apt install -y ffmpeg          # 없으면 (mp3 변환에 필요)

bash pregen_listen_audio.sh --dry-run          # 생성 없이 대상 개수만 확인
bash pregen_listen_audio.sh                    # 전체 생성
bash pregen_listen_audio.sh --concurrency 2    # 동시 생성 수 조절 (기본 4, 레이트리밋 시 낮춤)
bash pregen_listen_audio.sh --data-dir /path/to/frontend/src/shared/data  # 데이터 경로 지정
```

내부적으로 `python tools/pregen_listen_audio.py "$@"` 를 호출한다. (서버 파이썬이 `python3` 면
셸의 마지막 줄을 `python3` 로 바꿔 쓴다.)

**옵션:**

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `--dry-run` | off | 생성하지 않고 대상 개수만 출력 |
| `--concurrency N` | 4 | 동시 생성 개수 (Gemini 레이트리밋 시 낮춤) |
| `--data-dir PATH` | 자동 | 듣기 JSON 경로. 미지정 시 나란히 있는 frontend → `tools/data/` 순으로 탐색 |

**동작 특성:**

- **재실행 안전(idempotent):** 이미 캐시에 있는 항목은 건너뛴다. 중단하거나 일부 실패해도
  같은 명령을 다시 실행하면 **남은 것만** 생성한다.
- **재시도:** 각 항목 최대 3회(레이트리밋/일시 오류 대비). 최종 실패 개수는 종료 시 리포트된다.
- 완료 로그: `생성 N, 스킵(이미존재) M, 실패 K`.

**전제조건 / 유의사항:**

- ⚠️ **런타임 서버가 바라보는 DB(`.env`)** 에 대고 실행할 것. 다른 DB(예: 로컬 dev DB)에 대고
  돌리면 그 DB에만 캐시가 채워져 운영 캐시는 워밍되지 않는다. (S3 버킷은 전역 공유라 무관)
- **ffmpeg** 필요. **AWS 쓰기 크레덴셜**(위 환경 변수 절 참고) 필요.
- **콘텐츠가 바뀌면 다시 실행:** 스크립트 텍스트가 바뀌면 해시가 바뀌므로, 프런트 데이터를
  갱신(또는 `--data-dir` 로 최신 프런트 경로 지정)한 뒤 배치를 재실행한다. 변경된 라인만 새로
  생성되고 나머지는 스킵된다. (`tools/data/` 스냅샷은 프런트 데이터 미러이므로 함께 갱신 권장.)

자세한 로직/옵션은 `tools/pregen_listen_audio.py` 상단 주석 참고.
