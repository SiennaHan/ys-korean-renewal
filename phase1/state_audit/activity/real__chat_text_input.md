# real__chat_text_input

- 활동: 미션대화 텍스트 입력
- 상태: 실제 제품 화면
- 경로: 같음 → 키보드 버튼
- 화면 폭: 360 (높이 693)
- 언어: ko/en 섞임 — 앱 기본값이 영어인데 콘텐츠는 한국어다
- 재현: 목 API 에 대화를 심고(`POST /chat/json` × 3) 브리핑에서 시작하기.
  **URL 이 없는 단계라 살아 있는 DOM 을 떠서 다시 그렸다**(`snap__*.html`)
- 정본 존재: 없음
- 구현 경로: components/learn/mission-dialog.tsx · components/dialog/dialog-input.tsx
- Storybook: 없음 — 제품 화면
- 관찰: 키보드 버튼을 누르면 하단이 **입력 칸(「내용을 입력해주세요」)** 으로 바뀐다. 확정 디자인에 텍스트 입력 갈래가 아예 없다 — `ChatScreen` 은 `recordMode` 만 받는다.
- 디자인 검토 필요: 예
- 분류: UNSPECIFIED
