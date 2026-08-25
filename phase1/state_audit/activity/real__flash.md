# real__flash

- 활동: 플래시카드
- 상태: 실제 제품 화면
- 경로: /learn/flashcard?level=1&lesson=4
- 화면 폭: 360 (높이 693)
- 언어: en — 앱 기본값이다(`i18n` 의 `|| "en"`). 콘텐츠는 한국어라 섞인다
- 재현: 비로그인 둘러보기로 위 주소를 연다. `capture-real.sh` 참고
- 정본 존재: `activity__flash_front`
- 구현 경로: 실제 라우트 — `src/routes/learn/` 아래
- Storybook: 없음 — 제품 화면
- 관찰: 진행 표시는 정책대로 붙었다. **남은 것은 셸이다** — `.activity-frame` 을 안 쓰고, 카드가 탭 플립이 아니라 `transition-transform` 카루셀이다.
- 디자인 검토 필요: 예
- 분류: DRIFT
- 기준 커밋: `49f48c2` (2026-08-25 채점·녹음·진행바 정리 반영 뒤)
