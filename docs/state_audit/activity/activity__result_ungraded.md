# activity__result_ungraded

- 활동: 결과
- 상태: 채점 없는 활동의 결과
- 경로: 활동 끝
- 화면 폭: 360 (높이 693)
- 언어: ko
- 재현: Storybook 「결과 채점없음」 를 harness.html 로 360폭에 앉혀 캡처
- 정본 존재: 없음
- 구현 경로: components/main/activity/result-screen.tsx
- Storybook: 기존(activity.stories.tsx) · 「결과 채점없음」
- 관찰: **컴포넌트는 고쳐졌는데 아무도 안 쓴다(2ec44ff).** `ResultScreen` 에 `grading="completion"` 이 생겨 정답률 카드를 지울 수 있게 됐지만, **그 props 를 넘기는 곳이 스토리에도 제품에도 없다.** 그래서 이 캡처는 여전히 「정답률 —」 카드를 보여 준다. `ResultScreen` 자체를 제품이 안 쓰는 것도 그대로다.
- 디자인 검토 필요: 예
- 분류: DRIFT
