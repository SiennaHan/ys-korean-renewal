# Tutorus 발음평가(korpron)·비원어민 STT(korstt) 연동

한시적으로 붙여둔 기능입니다. **원복이 쉽도록** 설계했습니다.

## 즉시 끄기

`.env`에서 용도별 URL을 지우거나 주석 처리하고 서버를 재시작합니다.

- `TUTORUS_KORPRON_URL`: 발음평가 라우터 비활성화
- `TUTORUS_KORSTT_WS_URL`: STT shadow 레인 비활성화
- 공통 인증 설정(`CLIENT_ID`, `CLIENT_SECRET`, `TOKEN_URL`): 두 기능 모두 비활성화

```
[TUTORUS] 발음평가 비활성 — KORPRON 설정 없음
```

프런트는 404 를 받으면 `null` 을 반환하고 패널을 그리지 않습니다.
**백엔드만 꺼도 화면이 깨지지 않으므로**, 프런트 코드는 그대로 둔 채 기능만 끌 수 있습니다.

## 완전 제거

### 백엔드

```bash
rm backend/koreanapi/xternal/tutorus.py
rm backend/koreanapi/business/tutorus_pron.py
rm backend/koreanapi/accepter/tutorus_accepter.py
rm backend/koreanapi/TUTORUS_INTEGRATION.md
```

`server.py` 의 `# --- [TUTORUS] BEGIN ---` ~ `# --- [TUTORUS] END ---` 블록 삭제.
`.env` 의 `TUTORUS_*` 5줄 삭제.

### 프런트엔드

```bash
rm frontend/korean/src/api/tutorus.ts
rm -r frontend/korean/src/components/tutorus/
```

`frontend/korean/src/components/learn/ai-roleplay.tsx` 에서 `[TUTORUS]` 로 검색해
나오는 4곳 삭제:

| 위치 | 내용 |
|---|---|
| import 2줄 | 줄 끝에 `// [TUTORUS] 제거 시 삭제` 주석 |
| state | `[TUTORUS] BEGIN~END` — `pronResult` / `pronLoading` |
| `handleRecordResult` 안 | `[TUTORUS] BEGIN~END` — `evaluatePronunciation` 호출 |
| 렌더 | `[TUTORUS] BEGIN~END` — `<PronunciationScore />` |

```bash
grep -n "TUTORUS" frontend/korean/src/components/learn/ai-roleplay.tsx
```

발음평가 결과는 저장하지 않지만 STT shadow 비교값은 DB에 저장합니다.

- `requirements.txt`: korstt WebSocket 연결용 `websockets`
- `migration_stt_tutorus.sql`: `ko_stt_shadow`의 Tutorus 비교 컬럼
- `package.json`: 추가 의존성 없음
- `accepter/base.py`, `api/apiType.ts` 등 공용 파일
- `src/i18n/locales/*.ts` 5개 (문구를 컴포넌트 안에 자체 보유)
- `AudioRecorder` 컴포넌트 (기존 `audioUrl` 을 재사용 — 시그니처 변경 없음)

## 엔드포인트

### `GET /tutorus/health`

설정·연결 확인용.

```json
{"result": true, "code": 200, "data": {
  "enabled": true, "ffmpeg": true, "tokenOk": true, "detail": null
}}
```

### `POST /tutorus/pronunciation`

```json
{
  "reference": "시계를 보니 벌써 지하철 막차 시간이어서...",
  "base64sound": "<녹음 base64, data URI 접두사 있어도 됨>",
  "includeRaw": false
}
```

응답 `data`:

| 필드 | 설명 |
|---|---|
| `score.overall` | 종합 발음 점수 (KO_HOLISTIC, 30~100) |
| `score.segment` | 음소/분절 (KO_SEGMENT) |
| `score.speed` | 발화 속도 (KO_SPEED) |
| `score.prosody` | 억양/초분절 (KO_SUPRASEGMENT) |
| `score.acoustic` | 음향 신뢰도 (0~100) |
| `words[]` | 단어별 `{index, text, score, start, end}` |
| `weakWords[]` | 60점 미만 단어 최대 5개, 낮은 순 |
| `weakPhones[]` | 점수 낮은 음소 최대 5개 (`score` 는 LLR, 음수 가능) |
| `intonation` | 억양 곡선 정수 배열 |
| `durationSec` | 발화 길이 |
| `raw` | `includeRaw: true` 일 때만 원본 응답 |

실패 시 `makeError` 형식:

| 코드 | 상황 |
|---|---|
| 400 | reference 없음 / 100단어 초과 / 오디오 디코딩 실패 |
| 422 | 무음·잡음으로 발화 미검출 |
| 500 | ffmpeg 없음 |
| 502 | 토큰 발급 실패, 상대 서버 오류 |
| 503 | `.env` 미설정 |

## 알아둘 것

- **오디오 변환**: WAV 입력은 numpy 로 16kHz/mono/16bit 정규화(의존성 없음).
  webm/opus·mp4 는 **ffmpeg 필요** → 배포 서버에 `apt install -y ffmpeg`.
  프런트는 webm 으로 녹음하므로 실사용엔 ffmpeg 가 사실상 필수.
- **에러가 HTTP 200 으로 온다**: 규격서 §4.4. 본문 `error_code`/`error` 로 판별하도록
  `_evaluate_blocking` 에서 처리해 둠.
- **토큰 수명 300초**: 만료 30초 전까지 프로세스 내 캐시.
- **엔드포인트가 dev**: `dev.tutorusresearch.com`. 운영 도입 시 운영 URL·전용 자격증명 필요.
- **자격증명**: 현재 sound-lib 예제의 `freewheelin` 계정은 speako 전용이 아님.

## 프런트 연동 지점

AI 롤플레잉(`/learn/roleplay`) 한 곳에만 붙어 있습니다.

- 녹음 완료 → `handleRecordResult` 에서 기존 합격판정(`evaluateSpeech`)과 **병렬로**
  발음평가를 호출합니다. 발음평가가 느려도 기존 흐름이 지연되지 않습니다.
- 오디오는 `AudioRecorder` 가 이미 넘겨주는 blob object URL 을 `fetch` 해서 씁니다.
  덕분에 `AudioRecorder` 를 수정할 필요가 없었습니다(다른 4곳에서 공용으로 쓰는 컴포넌트).
- 점수 패널은 상태 메시지 아래에 뜨고, 다음 녹음을 시작할 때까지 남아 있습니다.

## 로컬 확인

```bash
curl -s localhost:8000/tutorus/health
```
