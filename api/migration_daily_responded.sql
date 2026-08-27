-- 스트릭 기준을 "응답했나" 로 바꾼다 + 하루 한 줄을 DB 가 지키게 한다
--
-- ko_daily_activity 는 이미 존재하므로 createAllTables() 로는 반영되지 않는다 → 수동 ALTER.
--
-- ① responded — 그날 문항에 응답하고 채점 결과까지 봤나 (기획 확정 2026-08-27).
--    전에는 스트릭이 "그날 행이 있나" 였는데, 그 행은 학습 세션 핑이 만든다.
--    즉 **아무것도 안 풀고 활동 화면을 열어만 봐도 스트릭이 올랐다.**
--
-- ② uq_user_date — migration_dashboard.sql 은 처음부터 이 키를 걸어 뒀는데
--    모델에는 없었다. 그래서 createAllTables() 로 만든 DB 에는 없고,
--    SQL 로 만든 DB 에는 있었다 — 같은 표가 두 모양이었다(2026-08-27 실측).
--    없으면 ensureExists 의 읽고-쓰기 사이에 요청이 겹쳐 하루가 두 줄이 되고,
--    학습 시간이 갈려 주간 차트가 실제보다 적게 나온다.
--
--    **거는 순서가 중요하다.** repo_daily_activity.ensureExists 가 IntegrityError 를
--    받아 되돌리도록 먼저 고쳐 두었다. 안 고치고 인덱스만 걸면 그 경합이 500 이 된다.

ALTER TABLE ko_daily_activity
    ADD COLUMN responded TINYINT(1) NOT NULL DEFAULT 0 AFTER words_learned;

-- 이미 있는 날은 "응답했다" 로 본다.
-- 지금까지의 행은 학습 기록이 있어야만 뜻이 있었고, 여기서 0 으로 두면
-- **기존 사용자의 스트릭이 통째로 끊긴다.** 앞으로 생기는 행만 새 기준을 탄다.
UPDATE ko_daily_activity SET responded = 1;

-- 중복이 있으면 인덱스를 못 건다. 걸기 전에 확인하라 —
--   SELECT user_id, activity_date, COUNT(*) c FROM ko_daily_activity
--   GROUP BY 1,2 HAVING c > 1;
-- 2026-08-27 로컬 기준 0건이었다. 있으면 study_seconds 가 큰 행만 남기고 지운다.
ALTER TABLE ko_daily_activity
    ADD UNIQUE KEY uq_user_date (user_id, activity_date);
