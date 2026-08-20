CREATE TABLE IF NOT EXISTS ko_qr_visitor (
    fingerprint_hash VARCHAR(64) NOT NULL,
    first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (fingerprint_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ko_qr_scan (
    id INT NOT NULL AUTO_INCREMENT,
    tracking_id VARCHAR(36) NOT NULL,
    scanned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    access_url VARCHAR(1000) NOT NULL DEFAULT 'unknown',
    ip_address VARCHAR(64) NOT NULL,
    geo_country VARCHAR(100) NULL,
    geo_city VARCHAR(100) NULL,
    user_agent VARCHAR(1000) NOT NULL,
    fingerprint_hash VARCHAR(64) NOT NULL,
    is_unique TINYINT(1) NOT NULL DEFAULT 0,
    redirect_result VARCHAR(30) NOT NULL DEFAULT 'pending',
    PRIMARY KEY (id),
    UNIQUE KEY uq_ko_qr_scan_tracking_id (tracking_id),
    KEY ix_ko_qr_scan_scanned_at (scanned_at),
    KEY ix_ko_qr_scan_fingerprint_hash (fingerprint_hash),
    KEY ix_ko_qr_scan_is_unique (is_unique),
    KEY ix_ko_qr_scan_redirect_result (redirect_result)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
