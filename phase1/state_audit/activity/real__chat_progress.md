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
- 관찰: 셸·미션 칩·말풍선 조작(스피커·Aa)이 정리됐다. **남은 것은 i18n** — `chat-header.tsx` 가 `skip`·`finish` 를 **영문 리터럴로 박아** 뒀다. `ko.ts` 에 `player.skip: "건너뛰기"` 가 이미 있는데 안 쓴다.
- 디자인 검토 필요: 예
- 분류: DRIFT
- 기준 커밋: `2abf726` (2026-08-26 롤플레잉 v2.6 · 플래시카드 원장 배선 반영 뒤)
