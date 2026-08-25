# real__chat_missions

- 활동: 미션대화 미션 펼침
- 상태: 실제 제품 화면
- 경로: 같음 → 미션 보기
- 화면 폭: 360 (높이 693)
- 언어: ko/en 섞임 — 앱 기본값이 영어인데 콘텐츠는 한국어다
- 재현: 목 API 에 대화를 심고(`POST /chat/json` × 3) 브리핑에서 시작하기.
  **URL 이 없는 단계라 살아 있는 DOM 을 떠서 다시 그렸다**(`snap__*.html`)
- 정본 존재: 없음
- 구현 경로: components/learn/mission-dialog.tsx · components/dialog/dialog-input.tsx
- Storybook: 없음 — 제품 화면
- 관찰: 「미션 보기」를 누르면 미션 설명이 펼쳐지고 버튼이 「미션 숨기기」로 바뀐다. 확정 디자인에 이 접힘/펼침이 없다.
- 디자인 검토 필요: 예
- 분류: UNSPECIFIED
