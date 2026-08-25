# real__jamo_listen

- 활동: 자모 듣고 고르기
- 상태: 실제 제품 라우트 첫 화면
- 경로: /learn/jamo?level=1&lesson=1&group=1&sub=5
- 화면 폭: 360 (높이 693)
- 언어: en — **앱 기본값이다.** `localStorage` 에 값이 없으면 영어로 뜬다
- 재현: 비로그인 둘러보기 상태로 위 주소를 연다. `capture-real.sh` 참고
- 정본 존재: `activity__jamoListen` (표시 컴포넌트 쪽)
- 구현 경로: 실제 라우트 — `src/routes/learn/` 아래
- Storybook: 없음 — **제품 화면을 직접 떴다**
- 관찰: 진행 표시는 있다. **선택지가 넷(2x2)인데 정본 목업은 둘(한 줄)만 담았다.**
- 디자인 검토 필요: 예
- 분류: DRIFT
