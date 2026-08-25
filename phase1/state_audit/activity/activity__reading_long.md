# activity__reading_long

- 활동: 읽기 문제
- 상태: 긴 지문 + 두 줄 넘는 선택지
- 경로: /learn/read?level=3&lesson=9
- 화면 폭: 360 (높이 693)
- 언어: ko
- 재현: Storybook 「읽기 긴선택지」 를 harness.html 로 360폭에 앉혀 캡처
- 정본 존재: 없음
- 구현 경로: components/learn/read-answer.tsx
- Storybook: 감사용(state-audit.stories.tsx) · 「읽기 긴선택지」
- 관찰: 긴 지문 + 두 줄 선택지. **도크가 가리지 않는다** — 안쪽 `.scroll-area`(501px 창에 754px 내용)가 굴러 마지막 선택지에 닿는다. 다만 첫 화면에 선택지가 1.5개만 보인다.
- 디자인 검토 필요: 예
- 분류: UNSPECIFIED
- 추가 캡처: 320폭: `activity__reading_long__320__ko.png`
