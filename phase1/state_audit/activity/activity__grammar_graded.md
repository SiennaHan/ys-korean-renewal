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
- 관찰: 고른 오답을 빨강(no)으로 두면서 **정답까지 초록(ok)으로 밝히고**, 시간이 지나도 안 거둬진다. 확정 규칙은 `Choice` 쪽이다 — 정답 공개 금지·2초 뒤 거둠. **이 화면이 고칠 대상이다.**
- 디자인 검토 필요: 예
- 분류: DRIFT
