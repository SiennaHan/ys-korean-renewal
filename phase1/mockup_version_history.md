# UI/UX 목업 버전 이력

## 운영 규칙

- 시각 정본 파일명은 `screens_uiux.html`처럼 `_uiux`를 유지한다.
- 같은 정본의 수정마다 `v2`, `v3` 파일을 복제하지 않는다. 문서 안의 버전과 Git 이력으로 관리한다.
- `state_audit/`와 `captured/`는 당시 제품 상태를 남긴 감사 자료다. 정본이 바뀌어도 과거 캡처를 덮어쓰지 않는다.
- 프로토타입에서 확정한 공통 컴포넌트·상태 문법은 같은 작업에서 정본 목업과 기획 문서에도 반영한다.

## v2.8 — 2026-08-26

### 반영 파일

- `screens_uiux.html` — 전체 시각 정본
- `app/src/screens_ref/activity__failed.html` · `activity__micdenied.html` — 목업 재캡처
- `app/src/components/main/activity/state-screens.tsx` · `icons.tsx` · `mic-blocked.tsx`
- `app/src/styles/activity.css` — `.state-icon` 추가, `.state-view` 정렬
- `app/src/i18n/locales/*.ts` — 다섯 로케일에 `loadFailedBody` · `micDeniedBody` 추가

### 변경 내용

- 로드 실패·마이크 거부가 한 줄 문장만 떠 있던 것을 **아이콘 + 제목 + 설명**으로 바꿨다.
  `activity_controls_uiux.html` 에 시안으로만 그려져 있고 정본에 올라온 적이 없던 디자인이다.
- 마이크 문구를 정본대로 고쳤다 — "마이크가 꺼져 있어요" → "마이크를 사용할 수 없어요" + 설명.
  전체 화면과 알림(`MicBlockedDialog`)이 **같은 키**를 쓰므로 둘이 함께 바뀐다.
- 제목과 설명을 키로 갈랐다. 전에는 한 키를 `\n` 으로 쪼개 제목을 만들었다.
- `.state-view` 가 늘 위에 붙어 있던 것을 가운데로 되돌렸다. `flex:1` 을 적어 두었지만
  부모 `.scroll-area` 가 `display:block` 이라 아무 일도 하지 않았다 — `min-height:100%` 으로
  고쳤고, **정본 프로토타입도 같은 증상이라 같이 고쳤다.**
- 실패 화면을 손으로 짜 두었던 활동 셋(빈칸·읽기·듣기)을 공용 `FailedScreen` 으로 모았다.
  그 셋은 하단 버튼이 아예 없어 나가기 말고는 길이 없었다 — 정본이 그리는 다시 시도가 생겼다.

## v2.6 — 2026-08-26

### 반영 파일

- `screens_uiux.html` — 전체 시각 정본
- `recording_interaction_uiux.html` — 녹음 상태 확인용 시안
- `app/src/components/main/activity/record.tsx` — 공통 녹음·듣기 조작
- `app/src/components/learn/ai-roleplay.tsx` — 실제 롤플레잉 상태 연결

### 변경 내용

- AI 차례에는 듣기 상태, 내 차례에는 녹음 상태, 발음 판정 중에는 확인 상태만 보이게 역할을 분리했다.
- 동작하지 않는 녹음 버튼이 활성 상태처럼 보이던 문제를 없앴다.
- 아직 오지 않은 대사는 비활성 버튼 색이 아니라 읽을 수 있는 보조 텍스트 대비를 사용한다.
- 대본의 다시 듣기 터치 영역을 32px로 넓히고, 발음 결과 행동 버튼 높이를 42px로 보정했다.
- 확인용 녹음 시안도 실제 컴포넌트와 같은 `56px 버튼 + 오른쪽 상태 문구` 구조로 맞췄다.

## v2.5 — 2026-08-25

### 반영 파일

- `screens_uiux.html` — 전체 시각 정본
- `recording_interaction_uiux.html` — 녹음 상태 확인용 시안
- `shell_spec_v1.html` — 활동 셸·조작 규칙
- `dev_spec_v1.html` — 진행·다시 풀기 규칙

### 변경 내용

- 롤플레잉 녹음을 `대기 → 2초 준비 → 녹음 → 1초 마무리 → 자동 분석`으로 통일했다.
- 분석 결과는 목표 대사 바로 아래 카드에 `인식된 문장`으로 표시한다.
- STT가 대본과 달라도 진행을 막지 않고 `다시 녹음`과 `다음 대사`를 함께 제공한다.
- 결과 카드가 보이는 동안 하단 녹음 조작을 숨겨 같은 기능이 두 번 나오지 않게 했다.
- 시나리오 진행 표시는 앱바 아래 공통 진행 표시를 사용한다.
- 기존 감사 캡처는 과거 상태 증거로 보존하고 정본 링크와 변경점을 감사 문서에 남겼다.
