-- 게임 컨텐츠 DB 마이그레이션
-- 5개 게임(spring-picnic, particle-sniper, card-sort, seoul-puzzle, vocashot)의
-- 컨텐츠를 코드 번들에서 DB로 이전합니다.
--
-- 참고: server.py가 startup 시 SQLAlchemy.create_all()을 호출하므로
-- 서버 재시작만으로도 동일한 스키마가 자동 생성됩니다.
-- 이 파일은 DBA 리뷰/롤백 참고용입니다.

-- ─── spring-picnic ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS ko_spring_picnic_friend (
    id           VARCHAR(20)  NOT NULL PRIMARY KEY,
    face         VARCHAR(10)  NOT NULL,
    name         VARCHAR(50)  NOT NULL,
    bg           VARCHAR(10)  NOT NULL,
    cats         TEXT         NOT NULL,
    mission      VARCHAR(100) NOT NULL,
    description  VARCHAR(200) NOT NULL,
    description2 VARCHAR(200) NOT NULL,
    sort_order   INT          NOT NULL DEFAULT 0,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ko_spring_picnic_question (
    id         VARCHAR(20)  NOT NULL PRIMARY KEY,
    cat        VARCHAR(50)  NOT NULL,
    level      INT          NOT NULL,
    il         VARCHAR(10)  NOT NULL,
    hint       TEXT         NOT NULL,
    num        VARCHAR(50)  NOT NULL,
    tmpl       VARCHAR(200) NOT NULL,
    tts        VARCHAR(200) NOT NULL,
    correct    VARCHAR(50)  NOT NULL,
    wrong      TEXT         NOT NULL,
    sort_order INT          NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sp_question_cat (cat),
    INDEX idx_sp_question_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── particle-sniper ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS ko_particle_sniper_level (
    id         VARCHAR(20)  NOT NULL PRIMARY KEY,
    summary    VARCHAR(500) NOT NULL,
    color      VARCHAR(10)  NOT NULL,
    accent     VARCHAR(10)  NOT NULL,
    sort_order INT          NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ko_particle_sniper_lesson (
    id                   INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    level                VARCHAR(20) NOT NULL,
    lesson_name          VARCHAR(20) NOT NULL,
    new_particles        TEXT        NOT NULL,
    cumulative_particles TEXT        NOT NULL,
    questions            TEXT        NOT NULL,
    sort_order           INT         NOT NULL DEFAULT 0,
    created_at           DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ps_lesson_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── card-sort ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS ko_card_sort_category (
    name       VARCHAR(50) NOT NULL PRIMARY KEY,
    color      VARCHAR(10) NOT NULL,
    sort_order INT         NOT NULL DEFAULT 0,
    created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ko_card_sort_vocab (
    id             INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    grade          VARCHAR(20) NOT NULL,
    lesson         VARCHAR(20) NOT NULL,
    new_categories TEXT        NOT NULL,
    words          TEXT        NOT NULL,
    sort_order     INT         NOT NULL DEFAULT 0,
    created_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cs_vocab_grade (grade)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ko_card_sort_rare_example (
    word            VARCHAR(50)  NOT NULL PRIMARY KEY,
    category        VARCHAR(50)  NOT NULL,
    confusable_with VARCHAR(200) NULL,
    sort_order      INT          NOT NULL DEFAULT 0,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── seoul-puzzle ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS ko_seoul_puzzle_location (
    id             VARCHAR(30)  NOT NULL PRIMARY KEY,
    name           VARCHAR(50)  NOT NULL,
    num            INT          NOT NULL,
    x              INT          NOT NULL,
    y              INT          NOT NULL,
    unit           VARCHAR(50)  NOT NULL,
    description    VARCHAR(200) NOT NULL,
    grammar        TEXT         NOT NULL,
    entry_messages TEXT         NOT NULL,
    sort_order     INT          NOT NULL DEFAULT 0,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ko_seoul_puzzle_step (
    id          INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    location_id VARCHAR(30) NOT NULL,
    step_index  INT         NOT NULL,
    data        TEXT        NOT NULL,
    created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sp_step_loc (location_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── vocashot (낱말맞추기) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS ko_vocashot_preset (
    id         VARCHAR(50)  NOT NULL PRIMARY KEY,
    label      VARCHAR(100) NOT NULL,
    vocab      TEXT         NOT NULL,
    sort_order INT          NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
