# real__role

- 활동: 롤플레잉
- 상태: 실제 제품 화면
- 경로: /learn/roleplay?level=1&lesson=4
- 화면 폭: 360 (높이 693)
- 언어: en — 앱 기본값. 콘텐츠는 한국어라 섞인다
- 재현: 눌러 들어간 뒤 **살아 있는 DOM 을 떠서 다시 그렸다** — 사진이 아니라 재현이다
- 정본 존재: `activity__role`
- 구현 경로: 실제 라우트 — `src/routes/learn/` 아래
- Storybook: 없음 — 제품 화면
- 관찰: **진행 표시가 정책대로다** — 복수 시나리오 롤플레잉은 선형 문항 표시를 쓴다(shell_spec 2026-08-25). 정본 목업(`activity__role.html`)에 아직 진행 표시가 없어 **목업이 낡은 쪽**이다. 버튼에 이름이 다 붙었다(Exit·Skip·AI → me·Tap to record·Next).
- 디자인 검토 필요: 아니오
- 분류: MATCH
- 기준 커밋: `2ec44ff` (2026-08-25 미션대화·쓰기 예외 공통 디자인 반영 뒤)
