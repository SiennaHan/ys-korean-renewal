-- STT shadow 비교에 리턴제로(VITO) 컬럼 추가
-- ko_stt_shadow 는 이미 존재하므로 createAllTables()로는 반영되지 않음 → 수동 ALTER 필요

ALTER TABLE ko_stt_shadow
    ADD COLUMN rtzr_text  VARCHAR(500) NULL AFTER openai_model,
    ADD COLUMN rtzr_model VARCHAR(50)  NULL AFTER rtzr_text,
    ADD COLUMN rtzr_ms    INT          NULL AFTER openai_ms,
    ADD COLUMN rtzr_error VARCHAR(300) NULL AFTER openai_error;
