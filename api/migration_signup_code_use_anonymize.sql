-- 탈퇴한 학생의 코드 사용 이력 — 지우지 않고 개인 연결만 끊는다 (2026-08-28)
--
-- ko_signup_code_use 는 이미 존재하므로 createAllTables() 로는 반영되지 않는다 → 수동 ALTER.
-- (createAllTables() 는 **없는 표만** 만든다. BLOCKERS §6-b 의 그 함정이다.)
--
-- **왜 이 칸을 비우게 하나.** 탈퇴 판정(`shared/withdrawal_scope.py`)이 이 표를
-- 아예 빠뜨리고 있었다. 그래서 코드로 가입한 학생이 탈퇴하면 행이 남고 그 행의
-- user_id 가 **이미 지워진 ko_user.id 를 가리켰다**(2026-08-28 재현).
--
-- 갈래가 둘이었고 기획이 「행은 남기고 user_id 만 비운다」를 골랐다.
--
--   · 지우면 — 「누가 이 코드를 썼나」가 사라지고, used_count 는 1로 남으므로
--     (탈퇴해도 자리를 안 돌려준다 — BLOCKERS §10) countUses() 와 **영구히 어긋난다.**
--     그 대조가 이 표를 따로 둔 이유 ③ 이다
--   · 비우면 — 좌석 회계와 「몇 명이 언제 썼나」는 남고 사람만 지워진다.
--     남는 값은 code_id · school_code · used_at 뿐이라 개인정보가 아니다
--     (legal_draft_v1 제4조에 그 한 줄을 적었다)
--
-- **0 이 아니라 NULL 이어야 한다.** uq_signup_code_user(code_id, user_id) 가 걸려
-- 있고, MySQL 은 유니크 인덱스에서 NULL 을 서로 다른 값으로 본다. 0 으로 채웠다면
-- 같은 코드로 가입한 둘째 탈퇴자가 중복키로 터진다.

ALTER TABLE ko_signup_code_use
    MODIFY COLUMN user_id INT NULL
        COMMENT 'ko_user.id. 탈퇴하면 NULL — 행은 좌석 회계로 남고 사람만 지워진다';

-- 이미 고아가 된 행이 있으면 여기서 정리한다. 배포 시점에 한 번만 돌리면 된다 —
-- 앞으로는 purgeAccount 가 탈퇴하는 그 순간에 비운다.
--
-- **먼저 세어 보고 돌려라.** 0 이 아니면 그만큼이 이미 새어 나간 것이다:
--   SELECT COUNT(*) FROM ko_signup_code_use u
--    WHERE u.user_id IS NOT NULL
--      AND NOT EXISTS (SELECT 1 FROM ko_user k WHERE k.id = u.user_id);
UPDATE ko_signup_code_use u
   SET u.user_id = NULL
 WHERE u.user_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM ko_user k WHERE k.id = u.user_id);
