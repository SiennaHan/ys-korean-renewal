# real__chat_progress

- 활동: 미션대화 진행
- 상태: 실제 제품 화면
- 경로: /learn/mission-chat?level=1&lesson=4 → 시작하기
- 화면 폭: 360 (높이 693)
- 언어: ko/en 섞임 — 앱 기본값이 영어인데 콘텐츠는 한국어다
- 재현: 목 API 에 대화를 심고(`POST /chat/json` × 3) 브리핑에서 시작하기.
  **URL 이 없는 단계라 살아 있는 DOM 을 떠서 다시 그렸다**(`snap__*.html`)
- 정본 존재: activity__chat
- 구현 경로: components/learn/mission-dialog.tsx · components/dialog/dialog-input.tsx
- Storybook: 없음 — 제품 화면
- 관찰: 확정 `ChatScreen` 과 **완전히 다른 화면**이다. 시나리오가 접히는 카드가 아니라 **파란 큰 띠 + `>`** 이고, 미션 칩이 그 아래 회색 줄이며 오른쪽에 「미션 보기」가 있다. 하단이 **키보드 버튼 + 마이크 버튼 두 개**다(확정은 「눌러서 녹음」 한 줄). 앱바 제목이 「4과」이고 건너뛰기가 **번역 안 된 `skip` 키** 그대로다. **말풍선 안 아이콘 8개에 이름이 없다.**
- 디자인 검토 필요: 예
- 분류: DRIFT
