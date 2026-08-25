# activity__wordQuiz_wrong

- 활동: 어휘 문제
- 상태: 오답을 고른 직후
- 경로: /learn/word?level=1&lesson=4
- 화면 폭: 360 (높이 693)
- 언어: ko
- 재현: 같은 스토리를 가상 시간 1200ms 로 뜬다 — 2초가 지나면 표시가 사라진다
- 정본 존재: 없음
- 구현 경로: components/learn/word-learning.tsx
- Storybook: 기존(activity.stories.tsx) · 「어휘문제 오답」
- 관찰: 고른 것만 분홍 + ✕, 정답은 안 밝힌다. 알약 「다시 해보세요」. **확정 규칙 그대로다.** 다음 버튼은 활성이라 틀려도 넘어간다.
- 디자인 검토 필요: 아니오
- 분류: MATCH
