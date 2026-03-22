-- ============================================================
-- MYSQL SCHEMA — OHARA LIBRARY
-- Aiven MySQL — Audit Trail + Financial Ledger
-- Run in your MySQL client / Aiven console
-- ============================================================

-- Audit trail for book changes (already existed — kept + enhanced)
CREATE TABLE IF NOT EXISTS audit_trail (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    book_id     INT NOT NULL,
    action      VARCHAR(50)  NOT NULL,       -- 'INSERT', 'UPDATE', 'DELETE'
    field_name  VARCHAR(100),               -- Which field changed
    old_value   TEXT,
    new_value   TEXT,
    changed_by  VARCHAR(100),              -- staff email or 'system'
    changed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata    JSON,                       -- IP, user agent, etc.
    INDEX idx_book_id   (book_id),
    INDEX idx_action    (action),
    INDEX idx_change_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Member audit log — tracks PII access and member record changes
CREATE TABLE IF NOT EXISTS member_audit_log (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    member_id   INT NOT NULL,
    action      VARCHAR(50) NOT NULL,       -- 'CREATE', 'UPDATE', 'DELETE', 'VIEW_PII'
    field_name  VARCHAR(100),
    old_value   TEXT,
    new_value   TEXT,
    changed_by  VARCHAR(100),
    ip_address  VARCHAR(45),
    changed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_member_id (member_id),
    INDEX idx_action    (action),
    INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Financial transaction ledger — immutable record of all fines and payments
CREATE TABLE IF NOT EXISTS financial_records (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    member_id        INT NOT NULL,
    transaction_type ENUM('fine','payment','refund','waiver') NOT NULL,
    amount           DECIMAL(10,2) NOT NULL,
    description      TEXT,
    pg_transaction_id INT,                  -- FK reference to PostgreSQL transactions.id
    processed_by     VARCHAR(100),          -- staff email
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_member_id (member_id),
    INDEX idx_type      (transaction_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- USEFUL QUERIES (reference)
-- ============================================================

-- All changes for a specific book
-- SELECT * FROM audit_trail WHERE book_id = 1 ORDER BY changed_at DESC;

-- All deletions
-- SELECT * FROM audit_trail WHERE action = 'DELETE' ORDER BY changed_at DESC;

-- Outstanding fines per member
-- SELECT member_id,
--        SUM(CASE WHEN transaction_type = 'fine'    THEN amount ELSE 0 END) AS total_fined,
--        SUM(CASE WHEN transaction_type = 'payment' THEN amount ELSE 0 END) AS total_paid
-- FROM financial_records GROUP BY member_id;

-- Financial summary for a month
-- SELECT transaction_type, COUNT(*), SUM(amount)
-- FROM financial_records
-- WHERE YEAR(created_at) = 2025 AND MONTH(created_at) = 3
-- GROUP BY transaction_type;
