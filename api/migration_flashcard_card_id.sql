-- 플래시카드 학습 기록의 card_id 를 12자로 넓힌다 (기획 확정 2026-08-31)
--
-- **기존 표에 칸을 고치는 것이라 `createAllTables()` 로는 안 된다** — 그 함수는
-- 없는 표만 만든다. 손으로 돌려야 한다(BLOCKERS.md §6-b).
--
-- 왜. `flashcard_word.ts` 가 `id: c.legacy_id || c.item_id` 로 카드를 가리키는데,
-- `legacy_id` 가 있는 것은 327개뿐이고 **나머지 2,000개는 `item_id` 로 떨어진다**.
-- `FCW-3-12-004` 는 12자인데 열이 VARCHAR(10) 이라 `FCW-3-12-0` 으로 잘렸다 —
-- 그러면 한 과의 001~009 가 **전부 같은 값**이 되어 「알아요/몰라요」가 엉뚱한
-- 카드에 붙는다. 2026-08-31 에 찾았다(개발 DB 에는 시험용 1행뿐이라 손해는 없었다).
--
-- **12자는 여유가 0이다.** `build-content.py` 의 `ID_MAX` 가 원장에서 그보다 긴
-- item_id 가 나오면 빌드를 실패시킨다 — 잘리는 대신 거기서 걸리게 했다.
--
-- 돌리기 전에 이미 잘린 값이 있는지 먼저 세라. 잘린 값은 되돌릴 수 없다:
--   SELECT COUNT(*) FROM ko_user_flashcard_word WHERE CHAR_LENGTH(card_id) >= 10;

ALTER TABLE ko_user_flashcard_word MODIFY card_id VARCHAR(12) NOT NULL;
