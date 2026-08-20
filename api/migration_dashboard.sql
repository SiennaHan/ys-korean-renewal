-- 홈 대시보드 기능을 위한 신규 테이블

CREATE TABLE IF NOT EXISTS ko_study_session (
    id            INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id       VARCHAR(45)  NOT NULL,
    session_date  VARCHAR(10)  NOT NULL COMMENT 'KST 기준 YYYY-MM-DD',
    started_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_ping_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duration_sec  INT          NOT NULL DEFAULT 0,
    INDEX idx_session_user_date (user_id, session_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS ko_daily_activity (
    id              INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id         VARCHAR(45)  NOT NULL,
    activity_date   VARCHAR(10)  NOT NULL COMMENT 'KST 기준 YYYY-MM-DD',
    study_seconds   INT          NOT NULL DEFAULT 0,
    modules_done    INT          NOT NULL DEFAULT 0,
    words_learned   INT          NOT NULL DEFAULT 0,
    last_book_id    INT          NULL,
    last_chapter_seq INT         NULL,
    last_menu_type  VARCHAR(20)  NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_date (user_id, activity_date),
    INDEX idx_activity_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
