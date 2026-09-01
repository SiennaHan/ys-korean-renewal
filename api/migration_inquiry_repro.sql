-- 문의 폼 재현 정보 — 칸 둘을 더한다 (2026-09-01)
--
-- ko_inquiry 는 이미 존재하므로 createAllTables() 로는 반영되지 않는다 → 수동 ALTER.
-- 운영 서버에서 이 파일을 손으로 돌려야 한다.
--
-- 유형에 따라 화면이 한 칸(payment·account·etc)이거나 세 칸(bug·content)이다.
-- 세 칸일 때 message 는 "무엇을 했는지" 가 되고, 여기 더하는 둘이 나머지를 받는다.
-- 기존 message 칸의 이름은 그대로 둔다 — slack.py·repo_inquiry.py·
-- tools/resend_inquiries.py 가 그 이름을 쓴다.
--
-- 기존 행은 전부 NULL 로 시작한다 — 지난 문의는 재현 정보가 없을 뿐 잃는 것이 아니다.

ALTER TABLE ko_inquiry
    ADD COLUMN actual   VARCHAR(2000) NULL
        COMMENT '실제로 어떻게 됐는지 — 세 칸 유형에서만 채워진다'
        AFTER message,
    ADD COLUMN expected VARCHAR(2000) NULL
        COMMENT '어떻게 되길 기대했는지 — 세 칸 유형에서도 선택이다'
        AFTER actual;
