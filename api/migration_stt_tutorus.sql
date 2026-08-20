-- STT shadow 비교에 Tutorus(비원어민 korstt) 컬럼 추가
-- ko_stt_shadow 는 이미 존재하므로 createAllTables()로는 반영되지 않음 → 수동 ALTER 필요

ALTER TABLE ko_stt_shadow
    ADD COLUMN tutorus_text  VARCHAR(500) NULL AFTER rtzr_model,
    ADD COLUMN tutorus_model VARCHAR(50)  NULL AFTER tutorus_text,
    ADD COLUMN tutorus_ms    INT          NULL AFTER rtzr_ms,
    ADD COLUMN tutorus_error VARCHAR(300) NULL AFTER rtzr_error;
