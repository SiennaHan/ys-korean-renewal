-- 미션 힌트 — 원장 n7_mission_hint.json · 354행 (DEV-13 후속 · 2026-09-01)
--
-- **새 표라 `createAllTables()` 가 알아서 만든다.** 그래도 운영에는 손으로 돌린다 —
-- 이 저장소는 무엇이 어느 환경에 적용됐는지 기록하는 장치가 없다(BLOCKERS.md §6-b).
--
-- **손으로 돌려야 하는 이유가 하나 더 있다.** `createAllTables()` 는
-- `ON UPDATE CURRENT_TIMESTAMP` 를 안 붙인다(모델의 `onupdate=` 는 파이썬 쪽이고
-- 씨드는 날 SQL 로 upsert 한다). 그것이 없으면 힌트를 고쳐도 `updated_at` 이 안 움직여
-- **`contentVersion` 이 그대로고 기기 캐시가 안 버려진다** — 고친 힌트가 학습자에게
-- 영영 안 간다. 다른 열셋과 같은 사정이라 여기서도 DDL 로 못박는다.
--
-- **열 이름이 원장과 다르다.** 원장의 `hint_id` 가 여기 `item_id` 이고, 원장의
-- `item_id`(부모 미션)가 여기 `chat_item_id` 다 — `ko_flashcard_card.set_item_id` 와
-- 같은 규약이고, 씨드의 「item_id 는 표를 가로질러 고유」 불변식을 지키려는 것이다.
-- 바꾸는 자리는 `seed_textbook_content.py` 의 RENAME_BY_TABLE.
--
-- 길이는 실측 최대의 2배 안팎으로 잡았다 (hint_en 167자 · hint_vi 140자가 가장 길다).

CREATE TABLE IF NOT EXISTS ko_mission_hint (
    item_id                VARCHAR(24)   NOT NULL PRIMARY KEY,
    chat_item_id           VARCHAR(24)   NOT NULL,
    book_id                TINYINT       NOT NULL,
    chapter_seq            SMALLINT      NOT NULL,
    slot_seq               SMALLINT      NOT NULL,
    mission_label          VARCHAR(50)   NULL,
    hint_ko                VARCHAR(200)  NULL,
    hint_en                VARCHAR(300)  NULL,
    hint_jp                VARCHAR(200)  NULL,
    hint_cn                VARCHAR(200)  NULL,
    hint_vi                VARCHAR(300)  NULL,
    hint_grammar           VARCHAR(100)  NULL,
    review_status          VARCHAR(24)   NOT NULL,
    change_note            VARCHAR(200)  NULL,
    created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX ix_ko_mission_hint_ch (book_id, chapter_seq),
    INDEX ix_ko_mission_hint_chat (chat_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
