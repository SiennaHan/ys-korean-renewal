# 학습 활동 상태 감사 (2026-08-25)

**이 폴더는 감사 자료다. 디자인 정본이 아니다.**
`phase1/captured/` 와 `app/src/mockups/` 는 이번 작업에서 **하나도 건드리지 않았다.**
여기 그림을 정본으로 승격하는 것은 디자인 검토 뒤에 할 일이다.

## 무엇을 했나

확정 목업 49화면은 활동마다 **기본 화면 하나씩**만 담고 있다. 고른 뒤·채점 뒤·
녹음 중처럼 **상호작용으로만 들어가는 상태**는 담긴 적이 없어, 목업 대조가
그 자리를 영영 안 본다. 그 자리를 전수로 떠서 무엇이 정해져 있고 무엇이
안 정해져 있는지 갈랐다.

| | |
|---|---|
| 새로 뜬 상태 | **54** (360폭·한국어 기준) |
| 추가 캡처 | 320폭 7 · 영어 7 |
| 파일 | `.png` · `.html`(활동 뿌리 outerHTML) · `.md`(상태 설명) 세 벌 |
| 분류 | `MATCH` 21 · `UNSPECIFIED` 29 · `DRIFT` 4 |
| 디자인 결정이 먼저 필요 | 10 |

## 어떻게 떴나 — 지어내지 않았다

- **Storybook 을 하네스로 썼다.** 스토리는 값이 고정된 정적 구성이라 애니메이션
  중간이 우연히 담기지 않는다.
- 확정 목업에도 기존 스토리에도 없던 15개 상태는
  `app/src/components/main/activity/state-audit.stories.tsx` 를 새로 만들어 냈다.
  **제품 컴포넌트에 props 를 새로 만들지 않았다** — 쓴 것은 전부 이미 있던
  props 다(`Choice.state` · `RecordControl.mode` · `WriteCanvas.strokes` ·
  `ChatScreen.recordMode`).
- 마이크 권한도 음성 서버도 쓰지 않았다. 녹음 상태는 전부 props 로 냈다.
- 이 기기의 Chrome 헤드리스는 `--window-size` 를 무시하고 레이아웃을 늘
  500x693 으로 잡는다(확인함). 그래서 `harness.html` 이 iframe 에 폭을 직접 주고
  `capture.py` 가 여러 번 찍어 이어 붙인다.

> **처음에 한 번 잘못 떴다.** 오답 표시는 `WRONG_VISIBLE_MS`(2초) 뒤 **스스로
> 거둬진다.** 기본 6초로 찍었더니 오답이 하나도 안 보였다. 1.2초로 다시 뜨고,
> 거둬진 뒤 모습은 `*_wrong_after` 로 따로 남겼다.

## 표

`MATCH` 확정 디자인이 그 상태에도 잘 적용됨 · `DRIFT` 같은 기능인데 문법이 다름 ·
`UNSPECIFIED` 필요한 상태인데 확정 디자인 자체가 없음

| 캡처 ID | 활동 | 상태 | 실제 라우트 | Storybook | 정본 존재 | 320 | EN | 디자인 문제 | 분류 |
|---|---|---|---|---|---|---|---|---|---|
| `activity__briefing` | 미션 브리핑 | 기본 | `미션대화 시작` | 기존 | activity__briefing | — | — | 아니오 | `MATCH` |
| `activity__chat` | 미션대화 | 기본 | `/learn/mission-chat?level=1&lesson=4` | 기존 | activity__chat | — | ✓ | 아니오 | `MATCH` |
| `activity__chat_done` | 미션대화 | 미션 완료 | `/learn/mission-chat?level=1&lesson=4` | 기존 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__chat_feedback` | 미션대화 | 고칠 곳 피드백 | `/learn/mission-chat?level=1&lesson=4` | 기존 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__chat_recorded` | 미션대화 | 녹음 완료 | `/learn/mission-chat?level=1&lesson=4` | 감사 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__chat_recording` | 미션대화 | 녹음 중 | `/learn/mission-chat?level=1&lesson=4` | 감사 | 없음 | ✓ | — | 아니오 | `UNSPECIFIED` |
| `activity__chat_uploading` | 미션대화 | 보내는 중 | `/learn/mission-chat?level=1&lesson=4` | 감사 | 없음 | — | — | **예** | `DRIFT` |
| `activity__failed` | 예외 | 불러오기 실패 | `모든 활동` | 기존 | activity__failed | — | — | 아니오 | `MATCH` |
| `activity__flash_back` | 플래시카드 | 뒤집은 뒷면 | `/learn/flashcard?level=1&lesson=4` | 기존 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__flash_front` | 플래시카드 | 앞면 | `/learn/flashcard?level=1&lesson=4` | 기존 | activity__flash | — | — | 아니오 | `MATCH` |
| `activity__grammar_before` | 문법 빈칸 | 고르기 전 | `/learn/grammar?level=1&lesson=4` | 기존 | activity__grammar | — | — | 아니오 | `MATCH` |
| `activity__grammar_graded` | 문법 빈칸 | 채점한 뒤 | `/learn/grammar?level=1&lesson=4` | 기존 | 없음 | — | — | **예** | `DRIFT` |
| `activity__grammar_selected` | 문법 빈칸 | 고르기만 하고 채점 전 | `/learn/grammar?level=1&lesson=4` | 기존 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__jamoListen` | 자모 듣고 고르기 | 고르기 전 | `/learn/jamo?level=0&lesson=1&group=1&sub=3` | 기존 | activity__jamoListen | — | — | 아니오 | `MATCH` |
| `activity__jamoListen_correct` | 자모 듣고 고르기 | 정답 | `/learn/jamo?level=0&lesson=1&group=1&sub=3` | 감사 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__jamoListen_wrong` | 자모 듣고 고르기 | 오답 | `/learn/jamo?level=0&lesson=1&group=1&sub=3` | 감사 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__jamoListen_wrong_after` | 자모 듣고 고르기 | 오답 (2초 뒤) | `/learn/jamo?level=0&lesson=1&group=1&sub=3` | 감사 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__listen_ox` | 듣기 문제 | O/X 고르기 전 | `/learn/listen?level=1&lesson=4` | 기존 | activity__listen | — | — | 아니오 | `MATCH` |
| `activity__listen_wrong` | 듣기 문제 | 오답을 고른 직후 | `/learn/listen?level=1&lesson=4` | 감사 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__listen_wrong_after` | 듣기 문제 | 오답을 고른 직후 (2초 뒤) | `/learn/listen?level=1&lesson=4` | 감사 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__loading` | 예외 | 불러오는 중 | `모든 활동` | 기존 | activity__loading | — | — | 아니오 | `MATCH` |
| `activity__micdenied` | 예외 | 마이크 권한 거부 | `녹음 활동` | 기존 | activity__micdenied | — | ✓ | 아니오 | `MATCH` |
| `activity__progress_many` | 공통 진행 표시 | 16칸 이상 | `모든 활동` | 기존 | 없음 | ✓ | — | 아니오 | `UNSPECIFIED` |
| `activity__reading` | 읽기 문제 | 고르기 전 | `/learn/read?level=1&lesson=4` | 기존 | activity__reading | — | — | **예** | `MATCH` |
| `activity__reading_long` | 읽기 문제 | 긴 지문 + 두 줄 넘는 선택지 | `/learn/read?level=3&lesson=9` | 감사 | 없음 | ✓ | — | **예** | `UNSPECIFIED` |
| `activity__reading_wrong` | 읽기 문제 | 오답을 고른 직후 | `/learn/read?level=1&lesson=4` | 감사 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__reading_wrong_after` | 읽기 문제 | 오답을 고른 직후 (2초 뒤) | `/learn/read?level=1&lesson=4` | 감사 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__readwrite` | 단어 읽고 쓰기 | 기본 | `/learn/jamo?level=0&lesson=1&group=4&sub=1` | 기존 | activity__readwrite | ✓ | — | **예** | `MATCH` |
| `activity__report` | 대화 리포트 | 기본 | `미션대화 끝` | 기존 | activity__report | — | — | 아니오 | `MATCH` |
| `activity__result` | 결과 | 채점 있는 결과 | `활동 끝` | 기존 | activity__result | ✓ | ✓ | 아니오 | `MATCH` |
| `activity__result_ungraded` | 결과 | 채점 없는 활동의 결과 | `활동 끝` | 기존 | 없음 | — | — | **예** | `DRIFT` |
| `activity__role` | 롤플레잉 | 기본 | `/learn/roleplay?level=1&lesson=4` | 기존 | activity__role | — | — | 아니오 | `MATCH` |
| `activity__role_ai_turn` | 롤플레잉 | AI 차례 | `/learn/roleplay?level=1&lesson=4` | 기존 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__role_recorded` | 롤플레잉 | 내 녹음 완료 | `/learn/roleplay?level=1&lesson=4` | 기존 | 없음 | ✓ | ✓ | 아니오 | `UNSPECIFIED` |
| `activity__speak` | 자모 발음 | 녹음 전 | `/learn/jamo?level=0&lesson=1&group=1&sub=2` | 기존 | activity__speak | — | — | 아니오 | `MATCH` |
| `activity__speak_finishing` | 자모 발음 | 마무리 중(1초) | `/learn/jamo?level=0&lesson=1&group=1&sub=2` | 감사 | 없음 | — | ✓ | 아니오 | `UNSPECIFIED` |
| `activity__speak_preparing` | 자모 발음 | 준비 중(2초) | `/learn/jamo?level=0&lesson=1&group=1&sub=2` | 감사 | 없음 | — | ✓ | 아니오 | `UNSPECIFIED` |
| `activity__speak_recorded` | 자모 발음 | 녹음 완료 | `/learn/jamo?level=0&lesson=1&group=1&sub=2` | 기존 | 없음 | ✓ | ✓ | 아니오 | `UNSPECIFIED` |
| `activity__speak_recording` | 자모 발음 | 녹음 중 | `/learn/jamo?level=0&lesson=1&group=1&sub=2` | 기존 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__speak_uploading` | 자모 발음 | 서버로 보내는 중 | `/learn/jamo?level=0&lesson=1&group=1&sub=2` | 감사 | 없음 | — | — | **예** | `DRIFT` |
| `activity__wordPreview` | 어휘 미리보기 | 기본 | `/learn/word?level=1&lesson=4` | 기존 | activity__wordPreview | — | — | 아니오 | `MATCH` |
| `activity__wordQuiz_before` | 어휘 문제 | 고르기 전 | `/learn/word?level=1&lesson=4` | 기존 | activity__wordQuiz | — | — | 아니오 | `MATCH` |
| `activity__wordQuiz_correct` | 어휘 문제 | 정답을 고른 직후 | `/learn/word?level=1&lesson=4` | 기존 | activity__wordQuiz(풀기 전만) | — | — | 아니오 | `UNSPECIFIED` |
| `activity__wordQuiz_last` | 어휘 문제 | 마지막 문항을 맞힌 뒤 | `/learn/word?level=1&lesson=4` | 기존 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__wordQuiz_wrong` | 어휘 문제 | 오답을 고른 직후 | `/learn/word?level=1&lesson=4` | 기존 | 없음 | — | — | **예** | `UNSPECIFIED` |
| `activity__wordQuiz_wrong_after` | 어휘 문제 | 오답을 고른 직후 (2초 뒤) | `/learn/word?level=1&lesson=4` | 기존 | 없음 | — | — | **예** | `UNSPECIFIED` |
| `activity__wordrep` | 단어 듣고 따라 말하기 | 기본 | `/learn/listen-answer?level=1&lesson=4` | 기존 | activity__wordrep | — | — | 아니오 | `MATCH` |
| `activity__write3_3` | 자모 조합 | 3단(받침) 조합 | `/learn/jamo?level=0&lesson=1&group=3&sub=1` | 기존 | activity__write3 | — | — | 아니오 | `MATCH` |
| `activity__write3_selected` | 자모 조합 | 받침만 아직 안 고름 | `/learn/jamo?level=0&lesson=1&group=3&sub=1` | 감사 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__write_2` | 자모 조합 | 2단 조합 | `/learn/jamo?level=0&lesson=1&group=1&sub=1` | 기존 | activity__write | — | — | 아니오 | `MATCH` |
| `activity__write_canvas_drawn` | 따라쓰기 모달 | 획이 있는 판 | `/learn/jamo?…` | 감사 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__write_canvas_empty` | 따라쓰기 모달 | 빈 판 | `/learn/jamo?…` | 기존 | activity__write_canvas | — | — | 아니오 | `MATCH` |
| `activity__write_canvas_wrong` | 따라쓰기 모달 | 틀린 판정 | `/learn/jamo?…` | 감사 | 없음 | — | — | **예** | `UNSPECIFIED` |
| `activity__write_selected` | 자모 조합 | 첫 줄만 고름 | `/learn/jamo?level=0&lesson=1&group=1&sub=1` | 감사 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
## 못 담은 상태와 이유

| 상태 | 왜 |
|---|---|
| `activity__listen_playing` | 재생 중을 나타내는 **props 가 없다.** `AudioRow` 는 `label`·`sub`·`onPlay` 뿐이다 |
| `activity__readwrite_modal_empty` · `_drawn` · `_complete` | 글자 칸을 눌렀을 때 뜨는 모달을 **표시 컴포넌트로 떼어 놓지 않았다.** 실제 화면(`learn/jamo/word-write.tsx`)에서만 열리고 로그인·데이터가 필요하다 |
| `activity__flash_result` | 플래시카드 결과는 `learn/flashcard-result.tsx` 가 그리는데 스토리가 없다 |
| `activity__exit_confirm` · `activity__chat_skip_confirm` | 나가기·건너뛰기 확인 화면이 **구현에 없다** — `onExit`·`onSkip` 이 바로 나간다 |
| `activity__record_permission_prompt` | 제품 안 권한 안내는 `activity__micdenied`(거부된 뒤) 하나뿐이다. **묻기 전 안내가 없다** |
| `activity__load_failed` · `activity__empty_content` | `activity__failed` 가 이미 같은 상태다. 빈 콘텐츠 화면은 따로 없다 |
| 실제 라우트 화면 전부 | 로그인과 서버 데이터가 있어야 열린다. 이번 감사는 **표시 컴포넌트** 층이다 |

## 디자인이 가장 크게 갈라진 곳

### 1. 채점 문법이 활동마다 다르다 — `DRIFT`

같은 "채점된 선택지"인데 두 부품이 **반대 규칙**을 쓴다.

| | 어휘·듣기·읽기·자모듣기 (`Choice`) | 문법 빈칸 (`ChipOption`) |
|---|---|---|
| 오답 | 분홍 + `✕` | 빨강 |
| **정답 밝히기** | **안 밝힌다** | **같이 밝힌다**(초록) |
| **거둬짐** | **2초 뒤 스스로 사라진다** | **안 사라진다** |

`Choice` 는 `WRONG_VISIBLE_MS` 타이머를 갖고 있고 `ChipOption` 은 `className` 에
상태를 그대로 붙일 뿐이다. **둘 중 어느 쪽이 맞는지 정해진 적이 없다.**

### 2. "보내는 중"과 "녹음 완료"가 같은 아이콘이다 — `DRIFT`

`RecordControl` 의 `sending` 과 `done` 이 **둘 다 ✓ 동그라미**다. 글자만
「확인 중」/「녹음 완료」로 다르다. 미션대화도 같은 부품이라 같이 겪는다.

### 3. 채점 없는 활동에 정답률 카드가 남는다 — `DRIFT`

`activity__result_ungraded` 는 정답률이 「—」인 카드를 그대로 둔다. 머리글도
「4개 중 0개 풀었어요」라 **못 푼 것처럼 읽힌다.**

### 4. 표시 컴포넌트와 실제 화면이 갈라져 있다 — 이번 감사의 가장 큰 것

목업 대조가 검사하는 `main/activity/*` 중 **화면 통짜 여섯**은 제품이 안 쓴다.

| 목업 대조가 검사하는 것 | 제품이 실제로 그리는 것 |
|---|---|
| `activity/chat.tsx` (`ChatScreen`) | `learn/mission-dialog.tsx` |
| `activity/report-screen.tsx` | `learn/mission-report.tsx` |
| `activity/roleplay.tsx` | `learn/ai-roleplay.tsx` |
| `activity/flashcard.tsx` | `routes/learn/flashcard.tsx` + `learn/flashcard-result.tsx` |
| `activity/result-screen.tsx` | 대응 라우트를 못 찾았다 |
| `activity/briefing-screen.tsx` | `routes/learn/mission-chat.tsx` 안쪽 |

**공용 부품**(`ActivityFrame`·`ProblemCard`·`ChoiceList`·`JamoSection`·
`RecordControl`)은 실제 라우트가 쓴다. 갈라진 것은 **화면 통짜** 여섯이다.
그래서 이 여섯에 대해서는, 여기 캡처가 **제품 화면이 아니라 디자인 쪽 구현**이다.

## 녹음 상태 머신 불일치

```md
[기능 불일치]
녹음 구현이 둘이고 상태 이름과 개수가 다르다.

  AudioRecorder (자모 발음 · 단어 따라 말하기 · 롤플레잉)
    idle → preparing(2초) → recording → finishing(1초) → recorded → uploading

  useRecording (미션대화)
    ready → recording → converting → recorded → uploading

미션대화에는 preparing·finishing 이 없다. 그래서 자모·롤플레잉에서 잘리지 않도록
넣어 둔 2초 준비·1초 마무리가 미션대화에는 없다 — 같은 사람이 같은 앱에서
두 규칙을 겪는다.

표시 쪽은 이미 하나다. ChatScreen 도 RecordControl 과 같은 RecordMode
(idle·preparing·recording·finishing·done·sending)를 받는다. 즉 **화면은 여섯
상태를 그릴 수 있는데 훅이 다섯을 다른 이름으로 낸다.**

디자인 적용 전에 상태 머신 통합이 필요하다. 임의로 추가하지 않았다.
```

## 공통 컴포넌트 수정으로 풀리는 것

1. **채점 문법 통일** — `Choice` 와 `ChipOption` 중 하나로 정하면 네 활동이 같이 맞는다
2. **`sending` 아이콘 분리** — `RecordControl` 한 곳만 고치면 자모·단어·롤플레잉·미션대화가 같이 고쳐진다
3. **녹음 상태 머신 통합** — `useRecording` 을 `RecorderStatus` 에 맞추면 미션대화만 다른 문제가 사라진다

## 화면별로 따로 봐야 하는 것

1. **결과 화면** — 채점 없는 활동에서 정답률 카드와 머리글을 어떻게 할지
2. **따라쓰기 판** — 틀렸을 때 테두리 색만 쓴다. 선택지는 `✕` 표를 붙이는데 판에는 없다
3. **단어 읽고 쓰기 모달** — 표시 컴포넌트로 떼어 놓지 않아 아직 아무도 못 본다
4. **나가기·건너뛰기 확인** — 지금은 확인 없이 바로 나간다

## 320폭과 영어

**깨진 곳이 없다.** 잰 것은 아래와 같다.

| 봤던 위험 | 결과 |
|---|---|
| 긴 읽기 선택지 | `.scroll-area` 가 굴러 마지막 선택지에 닿는다. 도크가 안 가린다 |
| 16칸 이상 진행 표시 | 320에서도 연속 막대 + 숫자가 안 겹친다 |
| 녹음 버튼 + 다음 버튼 | 320에서 「녹음 완료 · 누르면 다시 녹음」과 오른쪽 `>` 가 안 부딪힌다 |
| 롤플레잉 · 미션대화 입력부 | 320 · 영어 모두 넘침 0 |
| 단어 읽고 쓰기 | 320에서 음절 칸이 안 잘린다(모달은 못 봄) |
| 결과 화면 두 버튼 | 320 · 영어 모두 나란히 들어간다 |

영어에서 `자모발음 녹음완료` 의 「My recording」이 두 줄이 되지만 **부모를
넘지 않는다**(가로 넘침 0으로 측정).

## 정본으로 승격해도 될 것 / 결정이 먼저인 것

**승격 후보 (`UNSPECIFIED` 이지만 기존 문법을 그대로 따르는 것)** — 확정 디자인의
규칙을 새로 만들지 않고 이미 있는 규칙이 그 상태에 적용된 결과다.

`wordQuiz_correct` · `wordQuiz_last` · `listen_wrong` · `reading_wrong` ·
`jamoListen_correct` · `jamoListen_wrong` · `write_selected` ·
`write3_selected` · `write_canvas_drawn` · `speak_preparing` ·
`speak_recording` · `speak_finishing` · `speak_recorded` ·
`chat_recording` · `chat_recorded` · `chat_done` · `chat_feedback` ·
`role_recorded` · `role_ai_turn` · `flash_back` · `progress_many`

**결정이 먼저인 것** — 위 `DRIFT` 넷과, 오답 표시가 2초 뒤 **전부** 거둬지는 것이
의도인지(`wordQuiz_wrong_after`), 그리고 읽기 짧은 답의 정렬 규칙.

## 이 폴더의 파일

| | |
|---|---|
| `activity/*.png` | 상태 그림 (360x693, 320·EN 변형은 파일명에 붙임) |
| `activity/*.html` | 그때의 활동 뿌리 `outerHTML` |
| `activity/*.md` | 상태 설명 — 경로·재현·정본 존재·관찰·분류 |
| `harness.html` · `capture.py` · `capture-all.py` · `variants.sh` | 캡처 도구 |
| `manifest.json` · `story-ids.json` · `observations.json` | 캡처 목록과 관찰 |
| `write-docs.py` | `.md` 를 명세에서 다시 만든다 |
