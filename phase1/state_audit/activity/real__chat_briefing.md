# real__chat_briefing

- 활동: 미션대화 브리핑
- 상태: 실제 제품 라우트 첫 화면
- 경로: /learn/mission-chat?level=1&lesson=4
- 화면 폭: 360 (높이 693)
- 언어: en — **앱 기본값이다.** `localStorage` 에 값이 없으면 영어로 뜬다
- 재현: 비로그인 둘러보기 상태로 위 주소를 연다. `capture-real.sh` 참고
- 정본 존재: `activity__briefing` (표시 컴포넌트 쪽)
- 구현 경로: 실제 라우트 — `src/routes/learn/` 아래
- Storybook: 없음 — **제품 화면을 직접 떴다**
- 관찰: **확정 셸(`.activity-frame`)을 아예 안 쓴다.** 제목이 「상황에 맞는 대화를 연습하세요.」로 활동 이름이 아니고, 정본에 있는 **상황 그림 자리가 없다**. 미션 키워드 설명이 영문이다. 버튼이 「시작하기」(정본 「대화 시작하기」).
- 디자인 검토 필요: 예
- 분류: DRIFT
