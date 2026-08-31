-- 교재 콘텐츠 13개 표 — 원장 시트 여덟을 서버로 옮긴다 (DEV-05 · PD-03 확정 2026-08-31)
--
-- **새 표라 `createAllTables()` 가 알아서 만든다.** 그래도 운영에는 손으로 돌린다 —
-- 이 저장소는 무엇이 어느 환경에 적용됐는지 기록하는 장치가 없다(BLOCKERS.md §6-b).
--
-- 열쇠는 `item_id` 다. 13개 파일을 통틀어 전역 고유이고(충돌 0 · 실측) `GF-1-10-001`
-- 처럼 자기 설명적이다. 숫자 `id` 는 n1_word_list 에서 124행이 0 이라 열쇠가 못 된다 —
-- 다만 `ko_learning_record.question_id` 가 그 값이라 `ledger_id` 로 같이 보관한다.
--
-- **`legacy_id` 라는 이름은 쓰지 않는다.** n6·n7·n8 에 이미 그 이름의 열이 있고
-- 'F1'·'Y3W1' 같은 문자열이다(구 앱 식별자). 같은 이름이 표마다 다른 뜻이 되면 안 된다.
--
-- `review_status` 는 앱에 내보내지 않는다. 서버가 노출을 거르는 데 쓴다(DEV-07/PD-05).
-- 길이는 실측 최대의 2배로 잡았다. `review_status` 는 갈래가 16종이고 가장 긴 것이
-- `authored_v23`(12자)라 VARCHAR(12)면 여유가 0이다 — 판본이 늘면 바로 잘린다.


-- 어휘 · n1_word_list.json · 2846행
CREATE TABLE IF NOT EXISTS ko_word (
    item_id                VARCHAR(24)   NOT NULL PRIMARY KEY,
    book_id                TINYINT       NOT NULL,
    chapter_seq            SMALLINT      NOT NULL,
    ledger_id              INT           NULL,
    word                   VARCHAR(50)   NULL,
    en                     VARCHAR(200)  NULL,
    jp                     VARCHAR(100)  NULL,
    cn                     VARCHAR(50)   NULL,
    vi                     VARCHAR(200)  NULL,
    sound                  VARCHAR(50)   NULL,
    image                  VARCHAR(50)   NULL,
    category               VARCHAR(20)   NULL,
    theme                  VARCHAR(20)   NULL,
    review_status          VARCHAR(24)   NOT NULL,
    source_page            VARCHAR(20)   NULL,
    change_note            VARCHAR(500)  NULL,
    hold_reason            VARCHAR(200)  NULL,
    created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX ix_ko_word_ch (book_id, chapter_seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 어휘 퀴즈 · n1_word_quiz.json · 1138행
CREATE TABLE IF NOT EXISTS ko_word_quiz (
    item_id                VARCHAR(24)   NOT NULL PRIMARY KEY,
    book_id                TINYINT       NOT NULL,
    chapter_seq            SMALLINT      NOT NULL,
    ledger_id              INT           NULL,
    type                   VARCHAR(50)   NULL,
    prompt                 VARCHAR(100)  NULL,
    prompt_en              VARCHAR(200)  NULL,
    prompt_jp              VARCHAR(100)  NULL,
    prompt_cn              VARCHAR(50)   NULL,
    prompt_vi              VARCHAR(200)  NULL,
    meaning_en             VARCHAR(200)  NULL,
    meaning_jp             VARCHAR(100)  NULL,
    meaning_cn             VARCHAR(50)   NULL,
    meaning_vi             VARCHAR(200)  NULL,
    image                  VARCHAR(50)   NULL,
    selection1             VARCHAR(50)   NULL,
    selection2             VARCHAR(50)   NULL,
    selection3             VARCHAR(50)   NULL,
    selection4             VARCHAR(20)   NULL,
    answer_index           INT           NULL,
    review_status          VARCHAR(24)   NOT NULL,
    source_page            VARCHAR(50)   NULL,
    change_note            VARCHAR(300)  NULL,
    hold_reason            VARCHAR(100)  NULL,
    created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX ix_ko_word_quiz_ch (book_id, chapter_seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 롤플레잉 대사 · n2_ai_role_play.json · 992행
CREATE TABLE IF NOT EXISTS ko_roleplay_turn (
    item_id                VARCHAR(24)   NOT NULL PRIMARY KEY,
    book_id                TINYINT       NOT NULL,
    chapter_seq            SMALLINT      NOT NULL,
    ledger_id              INT           NULL,
    scenario_id            VARCHAR(20)   NULL,
    title                  VARCHAR(100)  NULL,
    mode                   VARCHAR(20)   NULL,
    turn_seq               INT           NULL,
    speaker                VARCHAR(20)   NULL,
    gender                 VARCHAR(20)   NULL,
    ko                     VARCHAR(500)  NULL,
    en                     TEXT          NULL,
    jp                     VARCHAR(500)  NULL,
    cn                     VARCHAR(200)  NULL,
    vi                     TEXT          NULL,
    review_status          VARCHAR(24)   NOT NULL,
    source_page            VARCHAR(50)   NULL,
    change_note            VARCHAR(200)  NULL,
    hold_reason            VARCHAR(50)   NULL,
    instruction_ko         VARCHAR(50)   NULL,
    instruction_en         VARCHAR(100)  NULL,
    instruction_jp         VARCHAR(50)   NULL,
    instruction_cn         VARCHAR(50)   NULL,
    instruction_vi         VARCHAR(100)  NULL,
    created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX ix_ko_roleplay_turn_ch (book_id, chapter_seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 듣기 지문 · n3_listen_script.json · 377행
CREATE TABLE IF NOT EXISTS ko_listen_script (
    item_id                VARCHAR(24)   NOT NULL PRIMARY KEY,
    book_id                TINYINT       NOT NULL,
    chapter_seq            SMALLINT      NOT NULL,
    ledger_id              INT           NULL,
    seq                    INT           NULL,
    cd_track               VARCHAR(20)   NULL,
    error_note             VARCHAR(100)  NULL,
    audio_text             TEXT          NULL,
    review_status          VARCHAR(24)   NOT NULL,
    source_page            VARCHAR(50)   NULL,
    change_note            VARCHAR(50)   NULL,
    hold_reason            VARCHAR(300)  NULL,
    created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX ix_ko_listen_script_ch (book_id, chapter_seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 지문의 줄 · n3_listen_script_line.json · 1810행 · 부모 ko_listen_script
CREATE TABLE IF NOT EXISTS ko_listen_script_line (
    item_id                VARCHAR(24)   NOT NULL PRIMARY KEY,
    book_id                TINYINT       NOT NULL,
    chapter_seq            SMALLINT      NOT NULL,
    script_item_id         VARCHAR(24)   NULL,
    ledger_id              INT           NULL,
    script_id              INT           NULL,
    seq                    INT           NULL,
    speaker                VARCHAR(20)   NULL,
    gender                 VARCHAR(20)   NULL,
    text                   TEXT          NULL,
    review_status          VARCHAR(24)   NOT NULL,
    source_page            VARCHAR(50)   NULL,
    change_note            VARCHAR(200)  NULL,
    hold_reason            VARCHAR(50)   NULL,
    voice                  VARCHAR(20)   NULL,
    created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX ix_ko_listen_script_line_ch (book_id, chapter_seq),
    INDEX ix_ko_listen_script_line_parent (script_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 듣기 문항 · n3_listen_repeat.json · 678행 · 부모 ko_listen_script
CREATE TABLE IF NOT EXISTS ko_listen_question (
    item_id                VARCHAR(24)   NOT NULL PRIMARY KEY,
    book_id                TINYINT       NOT NULL,
    chapter_seq            SMALLINT      NOT NULL,
    script_item_id         VARCHAR(24)   NULL,
    ledger_id              INT           NULL,
    script_id              INT           NULL,
    seq                    INT           NULL,
    instruction            VARCHAR(50)   NULL,
    question               VARCHAR(200)  NULL,
    type                   VARCHAR(20)   NULL,
    selection1             VARCHAR(100)  NULL,
    selection2             VARCHAR(100)  NULL,
    selection3             VARCHAR(100)  NULL,
    selection4             VARCHAR(100)  NULL,
    selection1_image       VARCHAR(50)   NULL,
    selection2_image       VARCHAR(50)   NULL,
    selection3_image       VARCHAR(50)   NULL,
    selection4_image       VARCHAR(50)   NULL,
    answer_index           INT           NULL,
    review_status          VARCHAR(24)   NOT NULL,
    source_page            VARCHAR(50)   NULL,
    change_note            VARCHAR(500)  NULL,
    hold_reason            VARCHAR(300)  NULL,
    instruction_ko         VARCHAR(50)   NULL,
    instruction_en         VARCHAR(100)  NULL,
    instruction_jp         VARCHAR(50)   NULL,
    instruction_cn         VARCHAR(50)   NULL,
    instruction_vi         VARCHAR(200)  NULL,
    created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX ix_ko_listen_question_ch (book_id, chapter_seq),
    INDEX ix_ko_listen_question_parent (script_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 빈칸 채우기 · n4_blank_question.json · 836행
CREATE TABLE IF NOT EXISTS ko_blank_question (
    item_id                VARCHAR(24)   NOT NULL PRIMARY KEY,
    book_id                TINYINT       NOT NULL,
    chapter_seq            SMALLINT      NOT NULL,
    ledger_id              INT           NULL,
    question               VARCHAR(200)  NULL,
    selections             VARCHAR(50)   NULL,
    answer                 VARCHAR(50)   NULL,
    completion             VARCHAR(200)  NULL,
    grammar_focus          VARCHAR(300)  NULL,
    grammar_focus_revised  VARCHAR(200)  NULL,
    review_status          VARCHAR(24)   NOT NULL,
    source_page            VARCHAR(50)   NULL,
    change_note            VARCHAR(500)  NULL,
    hold_reason            VARCHAR(50)   NULL,
    instruction_ko         VARCHAR(50)   NULL,
    instruction_en         VARCHAR(50)   NULL,
    instruction_jp         VARCHAR(50)   NULL,
    instruction_cn         VARCHAR(50)   NULL,
    instruction_vi         VARCHAR(100)  NULL,
    grammar_tag            VARCHAR(50)   NULL,
    distractor_type        VARCHAR(20)   NULL,
    selection1             VARCHAR(50)   NULL,
    selection2             VARCHAR(50)   NULL,
    selection3             VARCHAR(20)   NULL,
    selection4             VARCHAR(50)   NULL,
    answer_index           INT           NULL,
    answer_text            VARCHAR(50)   NULL,
    created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX ix_ko_blank_question_ch (book_id, chapter_seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 읽기 지문 · n5_read_answer_text.json · 117행
CREATE TABLE IF NOT EXISTS ko_read_text (
    item_id                VARCHAR(24)   NOT NULL PRIMARY KEY,
    book_id                TINYINT       NOT NULL,
    chapter_seq            SMALLINT      NOT NULL,
    ledger_id              INT           NULL,
    type                   VARCHAR(20)   NULL,
    text                   TEXT          NULL,
    review_status          VARCHAR(24)   NOT NULL,
    source_page            INT           NULL,
    change_note            TEXT          NULL,
    hold_reason            VARCHAR(50)   NULL,
    created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX ix_ko_read_text_ch (book_id, chapter_seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 읽기 문항 · n5_read_answer_questions.json · 383행 · 부모 ko_read_text
CREATE TABLE IF NOT EXISTS ko_read_question (
    item_id                VARCHAR(24)   NOT NULL PRIMARY KEY,
    book_id                TINYINT       NOT NULL,
    chapter_seq            SMALLINT      NOT NULL,
    text_item_id           VARCHAR(24)   NULL,
    ledger_id              INT           NULL,
    text_id                INT           NULL,
    seq                    INT           NULL,
    question               VARCHAR(200)  NULL,
    type                   VARCHAR(20)   NULL,
    selection1             VARCHAR(100)  NULL,
    selection2             VARCHAR(100)  NULL,
    selection3             VARCHAR(100)  NULL,
    selection4             VARCHAR(100)  NULL,
    answer_index           INT           NULL,
    review_status          VARCHAR(24)   NOT NULL,
    source_page            VARCHAR(50)   NULL,
    change_note            VARCHAR(300)  NULL,
    hold_reason            VARCHAR(50)   NULL,
    instruction_ko         VARCHAR(50)   NULL,
    instruction_en         VARCHAR(100)  NULL,
    instruction_jp         VARCHAR(50)   NULL,
    instruction_cn         VARCHAR(50)   NULL,
    instruction_vi         VARCHAR(200)  NULL,
    created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX ix_ko_read_question_ch (book_id, chapter_seq),
    INDEX ix_ko_read_question_parent (text_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 플래시카드 세트 · n6_flashcard.json · 117행
CREATE TABLE IF NOT EXISTS ko_flashcard_set (
    item_id                VARCHAR(24)   NOT NULL PRIMARY KEY,
    book_id                TINYINT       NOT NULL,
    chapter_seq            SMALLINT      NOT NULL,
    set_title              VARCHAR(50)   NULL,
    card_count             INT           NULL,
    source                 VARCHAR(50)   NULL,
    review_status          VARCHAR(24)   NOT NULL,
    source_page            VARCHAR(50)   NULL,
    change_note            VARCHAR(300)  NULL,
    hold_reason            VARCHAR(100)  NULL,
    created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX ix_ko_flashcard_set_ch (book_id, chapter_seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 카드 · n6_flashcard_card.json · 2329행 · 부모 ko_flashcard_set
CREATE TABLE IF NOT EXISTS ko_flashcard_card (
    item_id                VARCHAR(24)   NOT NULL PRIMARY KEY,
    book_id                TINYINT       NOT NULL,
    chapter_seq            SMALLINT      NOT NULL,
    set_item_id            VARCHAR(50)   NULL,
    seq                    INT           NULL,
    word                   VARCHAR(50)   NULL,
    meaning_en             VARCHAR(100)  NULL,
    meaning_jp             VARCHAR(50)   NULL,
    meaning_cn             VARCHAR(50)   NULL,
    meaning_vi             VARCHAR(100)  NULL,
    image                  VARCHAR(100)  NULL,
    image_note             VARCHAR(100)  NULL,
    legacy_id              VARCHAR(20)   NULL,
    review_status          VARCHAR(24)   NOT NULL,
    change_note            VARCHAR(20)   NULL,
    created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX ix_ko_flashcard_card_ch (book_id, chapter_seq),
    INDEX ix_ko_flashcard_card_parent (set_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 미션 대화 · n7_mission_chat.json · 117행
CREATE TABLE IF NOT EXISTS ko_mission_chat (
    item_id                VARCHAR(24)   NOT NULL PRIMARY KEY,
    book_id                TINYINT       NOT NULL,
    chapter_seq            SMALLINT      NOT NULL,
    scenario_title         VARCHAR(100)  NULL,
    situation_ko           VARCHAR(100)  NULL,
    situation_en           VARCHAR(200)  NULL,
    situation_jp           VARCHAR(100)  NULL,
    situation_cn           VARCHAR(50)   NULL,
    situation_vi           VARCHAR(200)  NULL,
    mission_detail         VARCHAR(500)  NULL,
    mission_prime_ko       TEXT          NULL,
    ai_persona_prompt      TEXT          NULL,
    ai_first_line          VARCHAR(200)  NULL,
    target_grammar         VARCHAR(500)  NULL,
    level                  VARCHAR(20)   NULL,
    content_img            VARCHAR(100)  NULL,
    video_refs             VARCHAR(100)  NULL,
    legacy_id              VARCHAR(20)   NULL,
    module_code            VARCHAR(20)   NULL,
    review_status          VARCHAR(24)   NOT NULL,
    source_page            VARCHAR(50)   NULL,
    change_note            TEXT          NULL,
    hold_reason            VARCHAR(50)   NULL,
    ai_gender              VARCHAR(20)   NULL,
    ai_role                VARCHAR(50)   NULL,
    user_role              VARCHAR(50)   NULL,
    created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX ix_ko_mission_chat_ch (book_id, chapter_seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 자모 · n8_jamo.json · 529행
CREATE TABLE IF NOT EXISTS ko_jamo (
    item_id                VARCHAR(24)   NOT NULL PRIMARY KEY,
    book_id                TINYINT       NOT NULL,
    chapter_seq            SMALLINT      NOT NULL,
    jamo_group             VARCHAR(100)  NULL,
    activity_sub           VARCHAR(50)   NULL,
    target_jamo            VARCHAR(20)   NULL,
    target_word            VARCHAR(20)   NULL,
    word_refs              VARCHAR(20)   NULL,
    instruction            VARCHAR(50)   NULL,
    problem_type           VARCHAR(20)   NULL,
    choice_1               VARCHAR(50)   NULL,
    answer_1               VARCHAR(20)   NULL,
    choice_2               VARCHAR(50)   NULL,
    answer_2               VARCHAR(20)   NULL,
    choice_3               VARCHAR(50)   NULL,
    answer_3               VARCHAR(20)   NULL,
    pronunciation          VARCHAR(20)   NULL,
    content_img            VARCHAR(100)  NULL,
    content_vid            VARCHAR(100)  NULL,
    content_sound          VARCHAR(100)  NULL,
    legacy_id              VARCHAR(20)   NULL,
    module_code            VARCHAR(20)   NULL,
    scene_num              VARCHAR(20)   NULL,
    review_status          VARCHAR(24)   NOT NULL,
    source_page            VARCHAR(50)   NULL,
    change_note            VARCHAR(200)  NULL,
    hold_reason            VARCHAR(50)   NULL,
    created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX ix_ko_jamo_ch (book_id, chapter_seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
