# real__jamo_readwrite

- 활동: 단어 읽고 쓰기
- 상태: 실제 제품 라우트 첫 화면
- 경로: /learn/jamo?level=1&lesson=1&group=1&sub=4
- 화면 폭: 360 (높이 693)
- 언어: en — **앱 기본값이다.** `localStorage` 에 값이 없으면 영어로 뜬다
- 재현: 비로그인 둘러보기 상태로 위 주소를 연다. `capture-real.sh` 참고
- 정본 존재: `activity__readwrite` (표시 컴포넌트 쪽)
- 구현 경로: 실제 라우트 — `src/routes/learn/` 아래
- Storybook: 없음 — **제품 화면을 직접 떴다**
- 관찰: 구조가 같다. 낱말이 한 글자라 칸이 하나다(정본은 두 글자). **글자 칸을 누르면 뜨는 모달은 이 정지 캡처로는 못 담는다.**
- 디자인 검토 필요: 아니오
- 분류: MATCH
