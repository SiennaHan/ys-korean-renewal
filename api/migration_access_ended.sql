-- 학기 종료 — 학교 이용 권한을 끊는 칸 (2026-08-28)
--
-- ko_user 는 이미 존재하므로 createAllTables() 로는 반영되지 않는다 → 수동 ALTER.
--
-- **왜 is_active 를 안 쓰나.** 그 칸을 내리면 `loginAsStudent` 가 로그인을 막는다.
-- 그러면 「학기가 끝나 사용 권한이 만료됐습니다」라고 설명할 기회도, 지난 학기
-- 기록을 보여 줄 기회도 없다. 기획 확정(2026-08-28)은 셋을 다 요구한다 —
-- 무료 범위로 내려가고 · 처음 로그인할 때 안내하고 · 지난 기록은 보인다.
-- 그래서 **계정 정지(is_active)와 권한 만료(access_ended_at)를 다른 칸으로 가른다.**
--
-- NULL 이면 권한이 살아 있다. 값이 있으면 그 시각부터 무료 범위다
-- (business/entitlement.py 가 본다).
--
-- **기존 행은 전부 NULL 로 시작한다** — 지금 학생들의 권한을 건드리지 않는다.
-- responded 때와 달리 여기서 값을 채우면 전원이 그 순간 잠긴다.

ALTER TABLE ko_user
    ADD COLUMN access_ended_at DATETIME NULL
        COMMENT '학교 이용 권한이 만료된 시각. NULL 이면 살아 있다'
        AFTER is_active;

-- 학교별로 만료된 학생을 세는 질의 (어드민 목록의 상태 칸과 같은 판정)
--
--   SELECT school_code,
--          SUM(access_ended_at IS NULL)     AS 이용중,
--          SUM(access_ended_at IS NOT NULL) AS 만료
--     FROM ko_user WHERE role = 'student' AND school_code IS NOT NULL
--    GROUP BY school_code;
