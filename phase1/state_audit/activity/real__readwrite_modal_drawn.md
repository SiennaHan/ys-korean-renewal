# real__readwrite_modal_drawn

- 활동: 단어 읽고 쓰기 모달
- 상태: 실제 제품 화면
- 경로: 같음 → 획 긋기
- 화면 폭: 360 (높이 693)
- 언어: 섞임 — 모달 안내는 한국어로 박혀 있고 알약은 앱 언어(영어)를 따른다
- 재현: 위 주소에서 글자 칸(`button.syl`)을 누르면 모달이 열린다.
  획은 **진짜 드래그**로 그었다(합성 이벤트로는 안 그려진다).
  **캔버스 픽셀은 DOM 스냅숏에 안 담기므로** 그린 상태는 `toDataURL()` 로 뽑아
  같은 자리에 `<img>` 로 박아 재현했다
- 정본 존재: `activity__write_canvas_drawn`
- 구현 경로: components/learn/jamo/word-write.tsx · components/draw/HangulCanvas.tsx
- Storybook: 없음 — 제품 화면
- 관찰: 획이 남고 **확인이 활성(파랑)** 된다. 되돌리기·전체 지우기 자리는 그대로. 확정 캡처와 같다.
- 디자인 검토 필요: 아니오
- 분류: MATCH
