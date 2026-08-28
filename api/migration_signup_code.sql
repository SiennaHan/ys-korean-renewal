-- 기관 발급 코드 — 학교가 코드를 찍고 학생이 그것으로 스스로 계정을 만든다.
--
-- 표 셋이다.
--   ko_signup_code          코드 한 장 (수량 · 기한 · 발급자)
--   ko_signup_code_use      누가 언제 그 코드로 가입했나 — used_count 의 정본
--   ko_signup_code_attempt  코드 시도 로그 — 무차별 대입을 막는 실체.
--                           start.sh 가 gunicorn -w 4 라 프로세스 메모리로는 못 센다.
--
-- **이름을 ko_school_code 로 짓지 않은 이유** — ko_school.school_code 는 학교의
-- 이름표라 안 바뀌고 재사용된다. 이 표의 code 는 수량과 기한이 붙은 배포물이다.
-- 두 개념을 비슷한 이름으로 두면 사고가 난다.
--
-- **모델(persistence/model.py)의 __table_args__ 와 이 파일이 반드시 같아야 한다.**
-- 신설 표라 createAllTables() 가 부팅 때 모델대로도 만든다(database.py). 둘이 다르면
-- SQL 로 만든 DB 와 부팅으로 만든 DB 의 스키마가 갈린다 — ko_daily_activity 가
-- 정확히 그렇게 두 모양이 됐다(migration_daily_responded.sql 을 보라).
--
-- 시각은 전부 UTC 다. 모델의 기본값이 UTC_TIMESTAMP() 이고 이 표를 쓰는 코드도
-- datetime.now(timezone.utc) 를 쓴다. util/timeutils.now() 는 KST 라 섞으면 9시간 어긋난다.

CREATE TABLE IF NOT EXISTS ko_signup_code (
    id                INT          NOT NULL AUTO_INCREMENT,
    code              VARCHAR(16)  NOT NULL COMMENT 'Crockford Base32 8자 · 하이픈 없이 대문자로 저장',
    school_code       VARCHAR(20)  NOT NULL COMMENT 'ko_school.school_code 와 같은 값. FK 아님 — ko_user.school_code 와 같은 관례',
    label             VARCHAR(100) NULL     COMMENT '발급자 메모 — "2026 봄학기 1급 A반"',
    max_uses          INT          NOT NULL COMMENT '수량. 이 코드로 가입할 수 있는 인원',
    used_count        INT          NOT NULL DEFAULT 0 COMMENT '소진 수. 조건부 UPDATE 의 판정 대상이다',
    starts_at         DATETIME     NULL     COMMENT 'NULL 이면 즉시 유효',
    expires_at        DATETIME     NOT NULL COMMENT '지나면 입장만 막는다 — 이미 가입한 학생은 그대로 둔다',
    status            VARCHAR(10)  NOT NULL DEFAULT 'active' COMMENT 'active | paused | revoked',
    issued_by_user_id INT          NOT NULL,
    issued_by_role    VARCHAR(20)  NOT NULL COMMENT '발급 당시 역할을 박제한다 — 나중에 승격돼도 한도 판정이 남는다',
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    -- 이 유니크가 두 일을 겸한다: 학생 검증의 조회 경로이자 발급 경합의 심판이다.
    -- 생성은 "조회 후 삽입" 이 아니라 "삽입해 보고 IntegrityError 면 재시도" 다.
    UNIQUE KEY uq_signup_code_code (code),
    -- 어드민 목록은 늘 "우리 학교 것을 최신순" 이다. 두 칸 복합이라 정렬까지 덮는다.
    KEY ix_signup_code_school (school_code, created_at),
    KEY ix_signup_code_issuer (issued_by_user_id)
    -- status 단독 인덱스는 만들지 않는다 — 값이 셋뿐이라 선택도가 없다
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ko_signup_code_use (
    id          INT         NOT NULL AUTO_INCREMENT,
    code_id     INT         NOT NULL,
    user_id     INT         NOT NULL COMMENT 'ko_user.id',
    school_code VARCHAR(20) NOT NULL COMMENT '가입 당시 값의 스냅샷',
    used_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    -- 한 계정은 한 번만 쓴다. 논리적으로 하나여야 하는 것은 DB 가 지키게 한다
    UNIQUE KEY uq_signup_code_user (code_id, user_id),
    KEY ix_signup_code_use_code (code_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ko_signup_code_attempt (
    id       INT         NOT NULL AUTO_INCREMENT,
    -- business/qr_tracking.py 의 _hash(HMAC-SHA256) 결과. 원본 IP 는 안 남긴다
    ip_hash  VARCHAR(64) NOT NULL,
    ok       TINYINT(1)  NOT NULL DEFAULT 0,
    tried_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    -- 시도한 코드 값은 저장하지 않는다 — 이 표가 유효 코드 목록이 되면 안 된다
    KEY ix_signup_code_attempt_ip_time (ip_hash, tried_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 카운터가 어긋났는지 보는 질의. 이력 표를 둔 값어치가 여기서 나온다.
--
--   SELECT c.id, c.code, c.used_count, COUNT(u.id) AS real_uses
--     FROM ko_signup_code c
--     LEFT JOIN ko_signup_code_use u ON u.code_id = c.id
--    GROUP BY c.id, c.code, c.used_count
--   HAVING c.used_count <> COUNT(u.id);
