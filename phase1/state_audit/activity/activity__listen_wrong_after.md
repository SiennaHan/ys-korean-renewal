# activity__listen_wrong_after

- 활동: 듣기 문제
- 상태: 오답을 고른 직후 — 2초가 지나 표시가 거둬진 뒤
- 경로: /learn/listen?level=1&lesson=4
- 화면 폭: 360 (높이 693)
- 언어: ko
- 재현: 같은 스토리를 가상 시간 6000ms 로 떠서 WRONG_VISIBLE_MS(2초)를 넘긴다
- 정본 존재: 없음
- 구현 경로: components/learn/listen-answer.tsx
- Storybook: 감사용(state-audit.stories.tsx) · 「듣기 오답」
- 관찰: 2초 뒤 표시가 거둬진다.
- 디자인 검토 필요: 아니오
- 분류: UNSPECIFIED
