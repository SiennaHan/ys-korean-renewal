# real__readwrite_modal_empty

- 활동: 단어 읽고 쓰기 모달
- 상태: 실제 제품 화면
- 경로: /learn/jamo?level=1&lesson=1&group=1&sub=4 → 글자 칸
- 화면 폭: 360 (높이 693)
- 언어: en — 앱 기본값. 콘텐츠는 한국어라 섞인다
- 재현: 눌러 들어간 뒤 **살아 있는 DOM 을 떠서 다시 그렸다** — 사진이 아니라 재현이다
- 정본 존재: `activity__write_canvas_empty`
- 구현 경로: 실제 라우트 — `src/routes/learn/` 아래
- Storybook: 없음 — 제품 화면
- 관찰: 점선 판 · Undo · Erase all · **Check 비활성**. 닫기 ✕ 가 생겼다.
- 디자인 검토 필요: 아니오
- 분류: MATCH
- 기준 커밋: `2ec44ff` (2026-08-25 미션대화·쓰기 예외 공통 디자인 반영 뒤)
