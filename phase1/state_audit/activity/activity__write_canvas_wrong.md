# activity__write_canvas_wrong

- 활동: 따라쓰기 모달
- 상태: 틀린 판정
- 경로: /learn/jamo?…
- 화면 폭: 360 (높이 693)
- 언어: ko
- 재현: 같은 스토리를 가상 시간 1200ms 로 뜬다 — 2초가 지나면 표시가 사라진다
- 정본 존재: 없음
- 구현 경로: components/draw/HangulCanvas.tsx
- Storybook: 감사용(state-audit.stories.tsx) · 「따라쓰기 틀린판」
- 관찰: 틀리면 판 테두리가 빨강이 된다. **선택지의 ✕ 표시와 달리 판에는 표가 없다** — 색만으로 알린다.
- 디자인 검토 필요: 예
- 분류: UNSPECIFIED
