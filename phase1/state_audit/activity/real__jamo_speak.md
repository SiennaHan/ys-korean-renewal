# real__jamo_speak

- 활동: 자모 발음
- 상태: 실제 제품 라우트 첫 화면
- 경로: /learn/jamo?level=1&lesson=1&group=1&sub=1
- 화면 폭: 360 (높이 693)
- 언어: en — **앱 기본값이다.** `localStorage` 에 값이 없으면 영어로 뜬다
- 재현: 비로그인 둘러보기 상태로 위 주소를 연다. `capture-real.sh` 참고
- 정본 존재: `activity__speak` (표시 컴포넌트 쪽)
- 구현 경로: 실제 라우트 — `src/routes/learn/` 아래
- Storybook: 없음 — **제품 화면을 직접 떴다**
- 관찰: 확정 셸(`.activity-frame`)을 쓴다. **진행 표시가 없다**(정본에는 있다). 정본이 재생 버튼을 두는 자리에 **입 모양 영상**이 큰 검정 상자로 들어간다. 학습 목록에 1·2·3 페이지 탭이 없다.
- 디자인 검토 필요: 예
- 분류: DRIFT
