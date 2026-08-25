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
- 관찰: **절반 고쳐졌다(d0044a6).** 오답 칩에 `Choice` 와 같은 흔들림·2초 타이머가 붙어 표시가 거둬진다. **남은 것 둘** — ① 제품(`fill-blank.tsx`)이 `sel === question.answer ? "ok"` 라 **오답을 골라도 정답이 초록으로 드러난다**. ② 오답 칩에 **`✕` 표가 없다**(선택지에는 있다).
- 디자인 검토 필요: 예
- 분류: DRIFT
