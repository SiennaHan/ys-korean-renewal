-- 탈퇴한 계정을 지우지 않고 가린다 — 그 사실을 담을 칸 (2026-08-29)
--
-- ko_user 는 이미 존재하므로 createAllTables() 로는 반영되지 않는다 → 수동 ALTER.
-- (BLOCKERS §6-b 의 그 함정. migration_access_ended.sql 때와 같은 자리다.)
--
-- **왜 새 칸인가.** 이 표에 이미 「못 쓰는 계정」을 뜻할 수 있는 칸이 둘 있다.
-- 셋은 서로 다른 사실이라 한 칸에 겹쳐 담으면 판정이 섞인다:
--
--   is_active = 0      계정 정지 — 되돌릴 수 있다. 로그인을 막는다
--   access_ended_at    학기 종료 — 로그인은 되고 이용 범위만 무료로 내려간다
--   withdrawn_at       탈퇴     — 되돌릴 수 없다(가린 이름·이메일이 이미 없다)
--
-- 2026-08-28 에 `access_ended_at` 을 따로 판 것과 같은 이유다. 그때는
-- 「is_active 를 내리면 학기가 끝났다고 설명할 기회가 없어진다」였고,
-- 이번에는 「왜 못 쓰는 계정인지」를 구별해야 해서다.
--
-- **기존 행은 전부 NULL 로 시작한다** — 지금 계정을 하나도 건드리지 않는다.

ALTER TABLE ko_user
    ADD COLUMN withdrawn_at DATETIME NULL
        COMMENT '탈퇴한 시각. NULL 이면 살아 있다. 되돌릴 수 없다'
        AFTER access_ended_at;

-- 학교별 탈퇴자 수 (학교 목록에서 빠지는 그 사람들)
--
--   SELECT school_code, COUNT(*) FROM ko_user
--    WHERE role = 'student' AND withdrawn_at IS NOT NULL
--    GROUP BY school_code;
