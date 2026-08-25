# 학습 활동 상태 감사 (2026-08-25)

**이 폴더는 감사 자료다. 디자인 정본이 아니다.**
`phase1/captured/` 와 `app/src/mockups/` 는 이번 작업에서 **하나도 건드리지 않았다.**

> **범위를 정확히 적는다.** 이것은 **공통 표시 컴포넌트의 상태 감사**다.
> **실제 제품 라우트가 따로 그리는 화면은 아직 못 봤다.** 처음 판에는 "활동 상태
> 전수" 처럼 읽히게 적었는데 사실과 다르다.

## 가장 중요한 발견

**확정 디자인을 그리는 통짜 컴포넌트 여섯을 제품 화면이 쓰지 않는다.**

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
그래서 이 여섯에 대해서는 여기 캡처가 **제품 화면이 아니라 디자인 쪽 구현**이다.

**그래서 승격은 보류다.** 실제 라우트와 확정 컴포넌트를 연결한 **다음에** 승격해야
검사가 진짜 제품 화면을 지킨다.

## 무엇을 했나

| | |
|---|---|
| 새로 뜬 상태 | **54** (360폭·한국어 기준) |
| 추가 캡처 | 320폭 7 · 영어 7 |
| 파일 | `.png` · `.html`(활동 뿌리 outerHTML) · `.md`(상태 설명) 세 벌 |
| 분류 | `MATCH` 22 · `UNSPECIFIED` 27 · `DRIFT` 5 |
| 디자인 결정이 먼저 필요 | 10 |

## 어떻게 떴나 — 지어내지 않았다

- **Storybook 을 하네스로 썼다.** 스토리는 값이 고정된 정적 구성이라 애니메이션
  중간이 우연히 담기지 않는다.
- 없던 15개 상태는 `app/src/components/main/activity/state-audit.stories.tsx` 로 냈다.
  **제품 컴포넌트에 props 를 새로 만들지 않았다** — 쓴 것은 전부 이미 있던
  props 다(`Choice.state` · `RecordControl.mode` · `WriteCanvas.strokes` ·
  `ChatScreen.recordMode`).
- 마이크 권한도 음성 서버도 쓰지 않았다.
- 이 기기의 Chrome 헤드리스는 `--window-size` 를 무시하고 레이아웃을 늘
  500x693 으로 잡는다(확인함). 그래서 `harness.html` 이 iframe 에 폭을 직접 주고
  `capture.py` 가 여러 번 찍어 이어 붙인다.

> **처음에 한 번 잘못 떴다.** 오답 표시는 `WRONG_VISIBLE_MS`(2초) 뒤 **스스로
> 거둬진다.** 기본 6초로 찍었더니 오답이 하나도 안 보였다. 1.2초로 다시 뜨고,
> 거둬진 뒤 모습은 `*_wrong_after` 로 따로 남겼다.

### 자모 경로 — 정정 (2026-08-25)

처음 표에 `level=0`, `jamoListen sub=3`, `write3 sub=1` 처럼 **실제와 다른 주소**를
적었다. 정본은 `shared/data/jamo.ts` 의 `JAMO_SUBS` 와 `unit.ts` 의 `(chapter, seq)` 다.

- **한글은 1급 안이다** — `level=1`
- 과(`lesson`)는 1~3, 묶음(`group`)은 그 과의 `seq` — **3과의 받침은 `group=1`**
- 활동(`sub`) — 1 발음 · 2 2단 조합 · 3 단어 듣고 따라 말하기 ·
  4 단어 읽고 쓰기 · 5 듣고 고르기 · **6 3단·받침 조합**
- 3단·받침(6)은 **3과에만 있다**. 1·2과 묶음은 1~5 뿐이다

## 정해진 규칙 (디자인 결정 — 2026-08-25 기획자 확정)

처음 판에 "채점 문법이 정해진 적이 없다" 고 적었는데 **틀렸다. 정해져 있고
`Choice` 쪽이 맞다.**

| 항목 | 확정 |
|---|---|
| 채점 문법 | **`Choice` 로 통일.** 오답 때 **정답 공개 금지** |
| 오답 표시 | 고른 것 하나만 빨강+✕ · 나머지는 그대로 · **2초 뒤 선택지와 알약이 함께 사라짐** |
| 정답 표시 | 고른 것만 positive · **다음 문항까지 유지** |
| 읽기 선택지 정렬 | 단어·자모처럼 **짧은 답은 가운데**, 구·문장·긴 선택지는 왼쪽. **글자 수 자동판단이 아니라 화면에서 명시 지정** |
| `sending` 아이콘 | 체크가 아니라 **spinner/progress** |
| 녹음 완료 | 체크. 다시 듣기·재녹음 가능 |
| 채점 없는 결과 | **정답률 카드 제거.** 「4개를 모두 연습했어요」처럼 완료량만 |
| 따라쓰기 오답 | 선택지용 원형 ✕ 쓰지 않음. **빨간 외곽선 + 「다시 써 보세요」** |
| 나가기 확인 | 진행·녹음 내용이 **있을 때만** |
| 문항 건너뛰기 | 문항 단위면 **즉시 실행** |
| 미션대화 종료 | 활동 전체를 떠나므로 **확인 필요** |

## 표

`MATCH` 확정 규칙이 그 상태에도 지켜짐 · `DRIFT` 확정 규칙과 어긋남 ·
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
| `activity__jamoListen` | 자모 듣고 고르기 | 고르기 전 | `/learn/jamo?level=1&lesson=1&group=1&sub=5` | 기존 | activity__jamoListen | — | — | 아니오 | `MATCH` |
| `activity__jamoListen_correct` | 자모 듣고 고르기 | 정답 | `/learn/jamo?level=1&lesson=1&group=1&sub=5` | 감사 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__jamoListen_wrong` | 자모 듣고 고르기 | 오답 | `/learn/jamo?level=1&lesson=1&group=1&sub=5` | 감사 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__jamoListen_wrong_after` | 자모 듣고 고르기 | 오답 (2초 뒤) | `/learn/jamo?level=1&lesson=1&group=1&sub=5` | 감사 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__listen_ox` | 듣기 문제 | O/X 고르기 전 | `/learn/listen?level=1&lesson=4` | 기존 | activity__listen | — | — | 아니오 | `MATCH` |
| `activity__listen_wrong` | 듣기 문제 | 오답을 고른 직후 | `/learn/listen?level=1&lesson=4` | 감사 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__listen_wrong_after` | 듣기 문제 | 오답을 고른 직후 (2초 뒤) | `/learn/listen?level=1&lesson=4` | 감사 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__loading` | 예외 | 불러오는 중 | `모든 활동` | 기존 | activity__loading | — | — | 아니오 | `MATCH` |
| `activity__micdenied` | 예외 | 마이크 권한 거부 | `녹음 활동` | 기존 | activity__micdenied | — | ✓ | 아니오 | `MATCH` |
| `activity__progress_many` | 공통 진행 표시 | 16칸 이상 | `모든 활동` | 기존 | 없음 | ✓ | — | 아니오 | `UNSPECIFIED` |
| `activity__reading` | 읽기 문제 | 고르기 전 | `/learn/read?level=1&lesson=4` | 기존 | activity__reading | — | — | **예** | `DRIFT` |
| `activity__reading_long` | 읽기 문제 | 긴 지문 + 두 줄 넘는 선택지 | `/learn/read?level=3&lesson=9` | 감사 | 없음 | ✓ | — | **예** | `UNSPECIFIED` |
| `activity__reading_wrong` | 읽기 문제 | 오답을 고른 직후 | `/learn/read?level=1&lesson=4` | 감사 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__reading_wrong_after` | 읽기 문제 | 오답을 고른 직후 (2초 뒤) | `/learn/read?level=1&lesson=4` | 감사 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__readwrite` | 단어 읽고 쓰기 | 기본 | `/learn/jamo?level=1&lesson=1&group=1&sub=4` | 기존 | activity__readwrite | ✓ | — | **예** | `MATCH` |
| `activity__report` | 대화 리포트 | 기본 | `미션대화 끝` | 기존 | activity__report | — | — | 아니오 | `MATCH` |
| `activity__result` | 결과 | 채점 있는 결과 | `활동 끝` | 기존 | activity__result | ✓ | ✓ | 아니오 | `MATCH` |
| `activity__result_ungraded` | 결과 | 채점 없는 활동의 결과 | `활동 끝` | 기존 | 없음 | — | — | **예** | `DRIFT` |
| `activity__role` | 롤플레잉 | 기본 | `/learn/roleplay?level=1&lesson=4` | 기존 | activity__role | — | — | 아니오 | `MATCH` |
| `activity__role_ai_turn` | 롤플레잉 | AI 차례 | `/learn/roleplay?level=1&lesson=4` | 기존 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__role_recorded` | 롤플레잉 | 내 녹음 완료 | `/learn/roleplay?level=1&lesson=4` | 기존 | 없음 | ✓ | ✓ | 아니오 | `UNSPECIFIED` |
| `activity__speak` | 자모 발음 | 녹음 전 | `/learn/jamo?level=1&lesson=1&group=1&sub=1` | 기존 | activity__speak | — | — | 아니오 | `MATCH` |
| `activity__speak_finishing` | 자모 발음 | 마무리 중(1초) | `/learn/jamo?level=1&lesson=1&group=1&sub=1` | 감사 | 없음 | — | ✓ | 아니오 | `UNSPECIFIED` |
| `activity__speak_preparing` | 자모 발음 | 준비 중(2초) | `/learn/jamo?level=1&lesson=1&group=1&sub=1` | 감사 | 없음 | — | ✓ | 아니오 | `UNSPECIFIED` |
| `activity__speak_recorded` | 자모 발음 | 녹음 완료 | `/learn/jamo?level=1&lesson=1&group=1&sub=1` | 기존 | 없음 | ✓ | ✓ | 아니오 | `UNSPECIFIED` |
| `activity__speak_recording` | 자모 발음 | 녹음 중 | `/learn/jamo?level=1&lesson=1&group=1&sub=1` | 기존 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__speak_uploading` | 자모 발음 | 서버로 보내는 중 | `/learn/jamo?level=1&lesson=1&group=1&sub=1` | 감사 | 없음 | — | — | **예** | `DRIFT` |
| `activity__wordPreview` | 어휘 미리보기 | 기본 | `/learn/word?level=1&lesson=4` | 기존 | activity__wordPreview | — | — | 아니오 | `MATCH` |
| `activity__wordQuiz_before` | 어휘 문제 | 고르기 전 | `/learn/word?level=1&lesson=4` | 기존 | activity__wordQuiz | — | — | 아니오 | `MATCH` |
| `activity__wordQuiz_correct` | 어휘 문제 | 정답을 고른 직후 | `/learn/word?level=1&lesson=4` | 기존 | activity__wordQuiz(풀기 전만) | — | — | 아니오 | `UNSPECIFIED` |
| `activity__wordQuiz_last` | 어휘 문제 | 마지막 문항을 맞힌 뒤 | `/learn/word?level=1&lesson=4` | 기존 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__wordQuiz_wrong` | 어휘 문제 | 오답을 고른 직후 | `/learn/word?level=1&lesson=4` | 기존 | 없음 | — | — | 아니오 | `MATCH` |
| `activity__wordQuiz_wrong_after` | 어휘 문제 | 오답을 고른 직후 (2초 뒤) | `/learn/word?level=1&lesson=4` | 기존 | 없음 | — | — | 아니오 | `MATCH` |
| `activity__wordrep` | 단어 듣고 따라 말하기 | 기본 | `/learn/jamo?level=1&lesson=1&group=1&sub=3` | 기존 | activity__wordrep | — | — | 아니오 | `MATCH` |
| `activity__write3_3` | 자모 조합 | 3단(받침) 조합 | `/learn/jamo?level=1&lesson=3&group=1&sub=6` | 기존 | activity__write3 | — | — | 아니오 | `MATCH` |
| `activity__write3_selected` | 자모 조합 | 받침만 아직 안 고름 | `/learn/jamo?level=1&lesson=3&group=1&sub=6` | 감사 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__write_2` | 자모 조합 | 2단 조합 | `/learn/jamo?level=1&lesson=1&group=1&sub=2` | 기존 | activity__write | — | — | 아니오 | `MATCH` |
| `activity__write_canvas_drawn` | 따라쓰기 모달 | 획이 있는 판 | `조합 화면(sub=2 · sub=6) 안에서 열리는 모달` | 감사 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
| `activity__write_canvas_empty` | 따라쓰기 모달 | 빈 판 | `조합 화면(sub=2 · sub=6) 안에서 열리는 모달` | 기존 | activity__write_canvas | — | — | 아니오 | `MATCH` |
| `activity__write_canvas_wrong` | 따라쓰기 모달 | 틀린 판정 | `조합 화면(sub=2 · sub=6) 안에서 열리는 모달` | 감사 | 없음 | — | — | **예** | `UNSPECIFIED` |
| `activity__write_selected` | 자모 조합 | 첫 줄만 고름 | `/learn/jamo?level=1&lesson=1&group=1&sub=2` | 감사 | 없음 | — | — | 아니오 | `UNSPECIFIED` |
## 확정 규칙과 어긋난 곳 (`DRIFT` 5)

| 캡처 | 어긋남 | 고칠 곳 |
|---|---|---|
| `grammar_graded` | 오답을 표시하면서 **정답까지 초록으로 공개**하고, 시간이 지나도 안 거둬진다 | `ChipOption` — `Choice` 규칙으로 통일 |
| `speak_uploading` · `chat_uploading` | 「확인 중」인데 아이콘이 **녹음 완료와 같은 ✓** | `RecordControl` 의 `sending` 을 spinner 로 |
| `result_ungraded` | 채점이 없는데 **정답률 카드가 「—」로 남고** 머리글이 「0개 풀었어요」 | 결과 화면 — 카드 제거, 완료량 문구로 |
| `reading` | 짧은 답이 **왼쪽 정렬** | 정렬을 화면에서 명시 지정 |

`write_canvas_wrong` 은 빨간 외곽선만 쓰고 있어 **확정 규칙과 같다.**
남은 것은 「다시 써 보세요」 문구를 붙이는 일이다.

## 녹음 상태 머신 불일치

```md
[기능 불일치]
녹음 구현이 둘이고 상태 이름과 개수가 다르다.

  AudioRecorder (자모 발음 · 단어 따라 말하기 · 롤플레잉)
    idle → preparing(2초) → recording → finishing(1초) → recorded → uploading

  useRecording (미션대화)
    ready → recording → converting → recorded → uploading

미션대화에는 preparing·finishing 이 없다. 자모·롤플레잉에서 말이 잘리지 않도록
넣어 둔 2초 준비·1초 마무리가 미션대화에는 없다 — 같은 사람이 한 앱에서 두 규칙을
겪는다.

표시 쪽은 이미 하나다. ChatScreen 도 RecordControl 과 같은 RecordMode
(idle·preparing·recording·finishing·done·sending)를 받는다. 즉 화면은 여섯 상태를
그릴 수 있는데 훅이 다섯을 다른 이름으로 낸다.

디자인 적용 전에 상태 머신 통합이 필요하다. 임의로 추가하지 않았다.
```

## 320폭과 영어

**깨진 곳이 없다.** 눈이 아니라 재서 확인했다.

| 봤던 위험 | 결과 |
|---|---|
| 긴 읽기 선택지 | `.scroll-area`(501px 창에 754px 내용)가 굴러 마지막 선택지에 닿는다. 도크가 안 가린다 |
| 16칸 이상 진행 표시 | 320에서도 연속 막대 + 숫자가 안 겹친다 |
| 녹음 버튼 + 다음 버튼 | 320에서 「녹음 완료·누르면 다시 녹음」과 오른쪽 `>` 가 안 부딪힌다 |
| 롤플레잉 · 미션대화 입력부 | 320 · 영어 모두 넘침 0 |
| 단어 읽고 쓰기 | 320에서 음절 칸이 안 잘린다(모달은 못 봄) |
| 결과 화면 두 버튼 | 320 · 영어 모두 나란히 들어간다 |

영어에서 `자모발음 녹음완료` 의 「My recording」이 두 줄이 되지만 **부모를 안 넘는다**
(가로 넘침 0으로 측정).

## 다음에 떠야 할 것 — 실제 라우트만

일반 상태 캡처는 충분하다. **Storybook 을 더 늘리지 말고 실제 라우트 차이만** 뜬다.
비로그인 둘러보기로 어휘·자모 실제 라우트가 열리는 것은 확인됐다. 나머지는
실제 데이터 진입 경로나 캡처용 fixture 를 붙여야 한다.

- 미션대화 — 브리핑 · 진행 · 텍스트 입력 · 녹음 · 피드백 · 종료 · 리포트
- 롤플레잉 — 기본 · AI 차례 · 녹음 완료
- 플래시카드 — 앞면 · 뒷면 · 판정 후 · 결과
- 단어 읽고 쓰기 모달 — 빈판 · 그린 상태 · 완료
- 채점 없는 활동의 실제 결과
- 나가기 · 미션 건너뛰기 확인 — **구현한 뒤에**

## 실제 제품 라우트 감사 (2026-08-25 추가)

**비로그인 둘러보기로 12개 라우트가 다 열렸다.** 앞 절의 상태 캡처는 표시
컴포넌트 층이고, 이 절은 **제품이 실제로 그리는 화면**이다.

> **언어는 영어다.** 앱은 `localStorage` 에 값이 없으면 영어로 뜬다
> (`src/i18n/index.ts` — `|| "en"`). 신규 방문자가 보는 것이 그것이다.
> 한국어 캡처는 앱 안 언어 설정을 거쳐야 하고 헤드리스는 매번 새 프로필이라
> 이번에는 못 했다.

| 캡처 ID | 활동 | 실제 라우트 | 정본 짝 | 분류 |
|---|---|---|---|---|
| `real__jamo_speak` | 자모 발음 | `/learn/jamo?level=1&lesson=1&group=1&sub=1` | `activity__speak` | `DRIFT` |
| `real__jamo_combine` | 자모 2단 조합 | `/learn/jamo?level=1&lesson=1&group=1&sub=2` | `activity__write_2` | `DRIFT` |
| `real__jamo_wordrep` | 단어 듣고 따라 말하기 | `/learn/jamo?level=1&lesson=1&group=1&sub=3` | `activity__wordrep` | `MATCH` |
| `real__jamo_readwrite` | 단어 읽고 쓰기 | `/learn/jamo?level=1&lesson=1&group=1&sub=4` | `activity__readwrite` | `MATCH` |
| `real__jamo_listen` | 자모 듣고 고르기 | `/learn/jamo?level=1&lesson=1&group=1&sub=5` | `activity__jamoListen` | `DRIFT` |
| `real__jamo_combine3` | 자모 3단·받침 조합 | `/learn/jamo?level=1&lesson=3&group=1&sub=6` | `activity__write3_3` | `DRIFT` |
| `real__chat_briefing` | 미션대화 브리핑 | `/learn/mission-chat?level=1&lesson=4` | `activity__briefing` | `DRIFT` |
| `real__role` | 롤플레잉 | `/learn/roleplay?level=1&lesson=4` | `activity__role` | `DRIFT` |
| `real__flash` | 플래시카드 | `/learn/flashcard?level=1&lesson=4` | `activity__flash_front` | `DRIFT` |
| `real__word` | 어휘 미리보기 | `/learn/word?level=1&lesson=4` | `activity__wordPreview` | `MATCH` |
| `real__read` | 읽기 문제 | `/learn/read?level=1&lesson=4` | `activity__reading` | `DRIFT` |
| `real__listen` | 듣기 문제 | `/learn/listen?level=1&lesson=4` | `activity__listen_ox` | `MATCH` |
| `real__grammar` | 문법 빈칸 | `/learn/grammar?level=1&lesson=4` | `activity__grammar_before` | `MATCH` |
| `real__jamo_readwrite__320` | 단어 읽고 쓰기 (320) | `/learn/jamo?level=1&lesson=1&group=1&sub=4` | `activity__readwrite__320__ko` | `MATCH` |
| `real__chat_progress` | 미션대화 진행 | `/learn/mission-chat?level=1&lesson=4 → 시작하기` | `activity__chat` | `DRIFT` |
| `real__chat_missions` | 미션대화 미션 펼침 | `같음 → 미션 보기` | `없음` | `UNSPECIFIED` |
| `real__chat_text_input` | 미션대화 텍스트 입력 | `같음 → 키보드 버튼` | `없음` | `UNSPECIFIED` |

### 자모 매핑이 실제 화면으로 확인됐다

정정한 주소로 실제 라우트를 열어 문구를 맞춰 봤다 — 여섯이 다 맞는다.

| sub | 실제 화면 문구 |
|---|---|
| 1 | Listen and repeat. (발음) |
| 2 | Listen, then build the letter. (2단 조합) |
| 3 | Listen to the word and repeat it. (단어 듣고 따라 말하기) |
| 4 | Read the word and write it. (단어 읽고 쓰기) |
| 5 | Listen and choose the right one. (듣고 고르기) |
| 6 | Lesson 3 · 받침 — Listen, then build the letter. (3단·받침) |

### 셸을 쓰는지 세어 봤다

눈이 아니라 뜬 HTML 에서 셌다.

| 화면 | `.activity-frame` | 진행 표시 | 건너뛰기 |
|---|---|---|---|
| 자모 발음 | 있음 | **없음**(정본엔 있음) | 있음 |
| 자모 2단 조합 | 있음 | **없음** | 있음 |
| 자모 듣고 고르기 | 있음 | 있음 | 있음 |
| 롤플레잉 | 있음 | **있음**(정본엔 없음) | 있음 |
| 미션대화 브리핑 | **없음** | 없음 | 없음 |
| 플래시카드 | **없음** | **없음** | **없음** |

**진행 표시가 화면마다 들쭉날쭉하다.** 같은 자모 안에서도 갈린다.

### 미션대화 크래시 — 양쪽을 함께 맞췄다 (2026-08-25)

브리핑에서 「시작하기」를 누르면 화면이 **빈 채로 남았다.**

```
Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'map')
    at fetchInitialData (components/learn/mission-dialog.tsx:225)
```

**원인은 데이터 계약이다.** `apiType.ts` 의 `MsgResponse` 는 `msgs`·`feedbacks` 를
배열로 약속하는데, 로컬 목 API 는 **모르는 경로에 `data: {}` 를 냈다.**
`getMsgList` 는 `!msgResponse` 만 보므로 `{}` 를 통과시키고, 바로 다음 줄
`feedbacks.map` 에서 죽는다.

**한쪽만 고치면 안 된다.** 목만 고치면 실서버의 비정상 응답에 그대로 취약하고,
제품만 고치면 로컬 계약 오류가 숨는다. 그래서 둘 다 했다.

| | 무엇 |
|---|---|
| 목 (`phase1/game_mockapi.py`) | `/chat/<id>/msgs` 를 계약대로 `{msgs: [], feedbacks: []}` 로 낸다 |
| 제품 (`mission-dialog.tsx`) | `const { msgs: serverChats = [], feedbacks = [] } = msgResponse` |

고친 뒤 크래시가 사라졌다(콘솔 오류 0). 다만 그것만으로는 화면이 **비어 있어서**,
대화가 실제로 도는 것을 보려고 목에 계약 셋을 더 채웠다 — `/chat/<id>/user`
(첫 대사·미션), `/chat/json`(사람 말 저장 + 봇 대사), `/chat/check/mission`
(미션 완료 판정). **앱 코드가 아니라 목이다.**

### 미션대화 실제 화면 — 확정 디자인과 다른 화면이다

| | 확정 `ChatScreen` | 실제 `mission-dialog` |
|---|---|---|
| 시나리오 | 접히는 카드 | **파란 큰 띠 + `>`** |
| 미션 | 상단 칩 줄 | 회색 줄 + **「미션 보기」 접힘/펼침** |
| 하단 | 「눌러서 녹음」 한 줄 | **키보드 버튼 + 마이크 버튼 둘** |
| 텍스트 입력 | **없다** | 있다 — 「내용을 입력해주세요」 |
| 앱바 | 「1급 4과」 | 「4과」 |
| 건너뛰기 | 화살표 | **번역 안 된 `skip` 키 글자** |

**말풍선 안 아이콘 8개에 이름이 없다**(`aria-label`·글자 둘 다 없음).

### 이 절에서 아직 못 담은 것


| | 왜 |
|---|---|
| 미션대화 **진행·미션 펼침·텍스트 입력** | **담았다**(위 절) |
| 미션대화 녹음·피드백·종료·리포트 | 녹음은 마이크 권한이 필요하고(브라우저가 막는다) 피드백·종료는 목이 판정을 더 내야 한다 |
| 롤플레잉 AI 차례 · 녹음 완료 | 상호작용이 필요하다. 첫 화면만 담았다 |
| 플래시카드 뒷면 · 판정 후 · 결과 | **탭으로 안 뒤집힌다.** 실제는 `transition-transform` 카루셀이고 「1/27」로 진행을 센다 — 확정 `FlashcardScreen`(탭 플립)과 **구조가 다르다.** 스와이프를 넣어야 담긴다 |
| 단어 읽고 쓰기 모달 빈판 · 그린 상태 · 완료 | 글자 칸을 눌러야 열린다 |
| 채점 없는 활동의 실제 결과 | 활동을 끝까지 풀어야 나온다 |
| 나가기 · 미션 건너뛰기 확인 | **아직 구현이 없다** — 캡처 대상이 아니라 설계·구현 대상이다 |

정지 캡처로는 여기까지다. 다음은 **상호작용을 넣는 캡처 하네스**(누른 뒤 뜨기)가
필요하다.

## 승격은 보류다

처음 판에 승격 후보 21개를 적었는데 **지금은 전부 보류**다. 확정 컴포넌트 여섯을
제품이 안 쓰는 채로 승격하면, 검사가 지키는 것이 제품 화면이 아니라 **디자인 쪽
사본**이 된다. 순서는 아래다.

1. 감사 문서의 자모 URL과 "미결정" 표현 수정 ← **했다**
2. 위 실제 라우트 화면만 추가 감사
3. `Choice`/`ChipOption` 채점 규칙 통일
4. 녹음 상태 머신과 아이콘 통일
5. 실제 미션대화·롤플레잉·플래시카드를 확정 컴포넌트 구조로 옮김
6. 결과 · 쓰기 모달 · 나가기 예외 처리
7. 그 뒤에 **승인된 상태만** 정본 49개에 더한다

## 못 담은 상태와 이유

| 상태 | 왜 |
|---|---|
| `activity__listen_playing` | 재생 중을 나타내는 **props 가 없다**. `AudioRow` 는 `label`·`sub`·`onPlay` 뿐이다 |
| `activity__readwrite_modal_*` | 글자 칸 모달을 **표시 컴포넌트로 떼어 놓지 않았다** |
| `activity__flash_result` | `learn/flashcard-result.tsx` 가 그리는데 스토리가 없다 |
| `activity__exit_confirm` · `activity__chat_skip_confirm` | **구현에 없다** — `onExit`·`onSkip` 이 바로 나간다 |
| `activity__record_permission_prompt` | 제품 안 권한 안내는 거부된 뒤(`micdenied`)뿐이다 |
| `activity__load_failed` · `activity__empty_content` | `activity__failed` 가 같은 상태다. 빈 콘텐츠 화면은 따로 없다 |
| 실제 라우트 화면 | 위 「다음에 떠야 할 것」 |

## 이 폴더의 파일

| | |
|---|---|
| `activity/*.png` | 상태 그림 (360x693, 320·EN 변형은 파일명에 붙임) |
| `activity/*.html` | 그때의 활동 뿌리 `outerHTML` |
| `activity/*.md` | 상태 설명 — 경로·재현·정본 존재·관찰·분류 |
| `harness.html` · `capture.py` · `capture-all.py` · `variants.sh` | 캡처 도구 |
| `manifest.json` · `story-ids.json` · `observations.json` | 캡처 목록과 관찰 |
| `write-docs.py` | `.md` 를 명세에서 다시 만든다 |
