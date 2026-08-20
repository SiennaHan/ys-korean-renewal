-- Existing deployments only: run once before deploying code that reads access_url.
ALTER TABLE ko_qr_scan
    ADD COLUMN access_url VARCHAR(1000) NOT NULL DEFAULT 'unknown' AFTER scanned_at;
