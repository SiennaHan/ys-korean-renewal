# real__chat_progress

- 활동: 미션대화 진행
- 상태: 실제 제품 화면
- 경로: /learn/mission-chat?level=1&lesson=4 → 시작하기
- 화면 폭: 360 (높이 693)
- 언어: en — 앱 기본값. 콘텐츠는 한국어라 섞인다
- 재현: 눌러 들어간 뒤 **살아 있는 DOM 을 떠서 다시 그렸다** — 사진이 아니라 재현이다
- 정본 존재: `activity__chat`
- 구현 경로: 실제 라우트 — `src/routes/learn/` 아래
- Storybook: 없음 — 제품 화면
- 관찰: 셸·미션 칩·말풍선 조작(스피커·Aa)이 정리됐다. **여기 적었던 i18n 지적은 틀렸다** — `chat-header.tsx` 를 근거로 들었는데 그 파일은 2026-08-25 `2ec44ff` 에서 공통 셸 `ActivityAppBar` 로 갈아치워진 **죽은 파일**이었다. 화면을 안 보고 파일을 읽어서 나온 지적이다. 실제 헤더는 아이콘 둘(나가기·건너뛰기)에 `t("player.exit")`·`t("player.skip")` 이 붙어 있다. 2026-08-26 에 그 파일을 지웠다. 같은 화면에서 **진짜** 영문 리터럴은 따로 있었다 — `mission-dialog.tsx` 의 `<>Loading dialog</>`. 공용 `FailedScreen`(state.loadFailed)으로 바꿨다.
- 디자인 검토 필요: 예
- 분류: MATCH  (2026-08-26 정정 — DRIFT 근거였던 i18n 지적이 틀렸다)
- 기준 커밋: `2abf726` (2026-08-26 롤플레잉 v2.6 · 플래시카드 원장 배선 반영 뒤)
