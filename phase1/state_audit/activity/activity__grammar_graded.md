# activity__grammar_graded

- 활동: 문법 빈칸
- 상태: 채점한 뒤
- 경로: /learn/grammar?level=1&lesson=4
- 화면 폭: 360 (높이 693)
- 언어: ko
- 재현: Storybook 「문법빈칸 채점후」 를 harness.html 로 360폭에 앉혀 캡처
- 정본 존재: 없음
- 구현 경로: components/learn/fill-blank.tsx
- Storybook: 기존(activity.stories.tsx) · 「문법빈칸 채점후」
- 관찰: 타이머·흔들림은 `Choice` 와 같아졌다. **남은 것 둘** — ① `fill-blank.tsx` 가 `sel === question.answer ? "ok"` 라 **오답을 골라도 정답 칩이 초록으로 드러난다**(확정 규칙은 공개 금지). ② 오답 칩에 **`✕` 표가 없다**(선택지에는 있다).
- 디자인 검토 필요: 예
- 분류: DRIFT
