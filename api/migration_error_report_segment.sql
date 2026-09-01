-- 표현클립 신고를 구간 단위로 저장한다 (DEV-02 · 2026-09-01)
--
-- ko_error_report 는 이미 존재하므로 createAllTables() 로는 반영되지 않는다 → 수동 ALTER.
-- 운영 서버에서 이 파일을 손으로 돌려야 한다.
--
-- ⚠ 순서 — 반드시 클라이언트의 "제외 → 하위 정렬" 배포가 먼저 나가고 이 마이그레이션은
-- 그 뒤에 돈다. target_id 를 늘리는 순간부터 신고가 실제로 저장되기 시작하는데,
-- 옛 클라이언트(신고=제외)가 아직 떠 있으면 익명 신고 한 건이 그 영상을 전원의
-- 검색 결과에서 지운다 — BLOCKERS.md §6-e 가 하지 말라고 정한 바로 그것이다.
-- 하위 정렬 클라이언트가 이미 배포됐다면 이 파일을 돌려도 안전하다.
--
-- target_id 는 지금 varchar(10) 인데 유튜브 ID 는 11자라 저장이 늘 500 이었다
-- (1406 Data too long for column 'target_id') — category='video' 행이 0건인 이유다.
-- 최소 32자로 늘린다. 신고 단위는 영상이 아니라 영상 구간이라 구간 시작 초
-- (segment_start)와 검색에 걸린 대본 줄(matched_line)을 같이 담는다.
-- content 칸은 지금까지 한 번도 채워진 적이 없어(위 이유로 전부 저장 실패) 검색어
-- 용도로 그대로 재사용한다 — rename 하지 않는다.
--
-- error_code 도 varchar(10) 이라 좁았다 — 로컬에서 실제로 신고를 넣어 보다가
-- 찾았다. 예전엔 자동 재생 오류 코드("100"·"101"·"150")만 들어가 안 걸렸는데,
-- 바텀시트 사유 "audio_quality"·"inappropriate"(둘 다 13자)는 여기서도 1406 이 난다.
-- 20자로 늘린다.

ALTER TABLE ko_error_report
    MODIFY COLUMN target_id VARCHAR(32) NOT NULL,
    MODIFY COLUMN error_code VARCHAR(20) NULL,
    ADD COLUMN segment_start INT NULL
        COMMENT '구간 시작 초 — 영상 단위 신고(재생 불가·부적절)는 NULL'
        AFTER content,
    ADD COLUMN matched_line VARCHAR(500) NULL
        COMMENT '검색에 걸린 대본 줄 — content(검색어)와 다른 값이다'
        AFTER segment_start,
    ADD INDEX ix_ko_error_report_target (category, target_id);

-- 롤백
--
-- ALTER TABLE ko_error_report
--     DROP INDEX ix_ko_error_report_target,
--     DROP COLUMN matched_line,
--     DROP COLUMN segment_start,
--     MODIFY COLUMN error_code VARCHAR(10) NULL,
--     MODIFY COLUMN target_id VARCHAR(10) NOT NULL;
--
-- target_id 가 10자를 넘는 행(구간 신고가 실제로 쌓인 뒤)이 있으면 마지막 MODIFY 가
-- 실패한다 — 유튜브 ID 는 11자 고정이라 이 표에서는 사실상 전부 그렇다.
-- error_code 도 "audio_quality"·"inappropriate" 행이 있으면 그 앞 MODIFY 가 실패한다.
-- 롤백하려면 먼저 그 행을 지우거나 다른 표로 옮겨야 한다. 클라이언트가 먼저 "제외" 로
-- 되돌아가지 않은 채 컬럼만 롤백하면 신고가 다시 500 으로 죽는다 — 위와 대칭인 순서 문제다.
