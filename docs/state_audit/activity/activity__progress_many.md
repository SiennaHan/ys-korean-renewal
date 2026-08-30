# activity__progress_many

- 활동: 공통 진행 표시
- 상태: 16칸 이상
- 경로: 모든 활동
- 화면 폭: 360 (높이 693)
- 언어: ko
- 재현: Storybook 「진행막대 16칸이상」 를 harness.html 로 360폭에 앉혀 캡처
- 정본 존재: 없음
- 구현 경로: components/main/activity/shell.tsx
- Storybook: 기존(activity.stories.tsx) · 「진행막대 16칸이상」
- 관찰: 16칸 이상이면 눈금을 포기하고 연속 막대 + 「8 / 20」이 된다. 320에서도 숫자와 안 겹친다.
- 디자인 검토 필요: 아니오
- 분류: UNSPECIFIED
- 추가 캡처: 320폭: `activity__progress_many__320__ko.png`
