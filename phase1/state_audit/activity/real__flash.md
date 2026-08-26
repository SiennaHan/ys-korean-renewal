# real__flash

- 활동: 플래시카드
- 상태: 실제 제품 화면
- 경로: /learn/flashcard?level=1&lesson=4
- 화면 폭: 360 (높이 693)
- 언어: en — 앱 기본값. 콘텐츠는 한국어라 섞인다
- 재현: 비로그인 둘러보기로 위 주소를 연다. `capture-real.sh` 참고
- 정본 존재: `activity__flash_front`
- 구현 경로: 실제 라우트 — `src/routes/learn/` 아래
- Storybook: 없음 — 제품 화면
- 관찰: 확정 셸·진행 표시(점 27 + 「1 / 27」)·「카드를 눌러 뜻을 보세요」가 다 붙었다. 뒤집기는 framer-motion `onTap` 이라 합성 이벤트로는 안 되고 진짜 제스처가 필요하다.
- 디자인 검토 필요: 아니오
- 분류: MATCH
- 기준 커밋: `2abf726` (2026-08-26 롤플레잉 v2.6 · 플래시카드 원장 배선 반영 뒤)
