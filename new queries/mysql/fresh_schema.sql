-- ============================================================
-- MYSQL FRESH SCHEMA — OHARA LIBRARY
-- Aiven MySQL — Audit Trail & Financial Records
-- Run in MySQL client / Aiven console
-- ============================================================

-- ============================================================
-- IMPORTANT: Clean up incorrect tables first
-- activity_logs and analytics should be in MongoDB, not MySQL!
-- ============================================================
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS analytics;

-- Drop existing audit tables (to recreate fresh)
DROP TABLE IF EXISTS transaction_audit;
DROP TABLE IF EXISTS financial_records;
DROP TABLE IF EXISTS member_audit_log;
DROP TABLE IF EXISTS audit_trail;

-- ============================================================
-- 1. AUDIT_TRAIL TABLE (Book Changes - Field Level)
-- Records exactly what changed: old_value → new_value
-- ============================================================
CREATE TABLE audit_trail (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- What book changed
    book_id INT NOT NULL,
    book_title VARCHAR(500),  -- Denormalized for display
    book_isbn VARCHAR(20),
    
    -- Action type
    action ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    
    -- Field-level change details (for UPDATE actions)
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    
    -- Who made the change
    changed_by VARCHAR(255),  -- Staff email or 'system'
    changed_by_id INT,  -- Staff ID (optional)
    
    -- When (IST timezone)
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional context
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSON,  -- Any additional context
    
    -- Indexes
    INDEX idx_audit_book_id (book_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_changed_at (changed_at DESC),
    INDEX idx_audit_changed_by (changed_by),
    INDEX idx_audit_field_name (field_name)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. MEMBER_AUDIT_LOG TABLE (Member Changes)
-- ============================================================
CREATE TABLE member_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- What member changed
    member_id INT NOT NULL,
    member_name VARCHAR(200),
    member_email VARCHAR(255),
    member_card_id VARCHAR(30),
    
    -- Action type
    action ENUM('INSERT', 'UPDATE', 'DELETE', 'SUSPEND', 'ACTIVATE', 'VIEW_PII') NOT NULL,
    
    -- Field-level change
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    
    -- Who made the change
    changed_by VARCHAR(255),
    changed_by_id INT,
    
    -- When (IST timezone)
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Context
    ip_address VARCHAR(45),
    reason TEXT,  -- Reason for change (e.g., why suspended)
    metadata JSON,
    
    -- Indexes
    INDEX idx_member_audit_member_id (member_id),
    INDEX idx_member_audit_action (action),
    INDEX idx_member_audit_changed_at (changed_at DESC),
    INDEX idx_member_audit_changed_by (changed_by)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. FINANCIAL_RECORDS TABLE (Fines & Payments)
-- ============================================================
CREATE TABLE financial_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Who
    member_id INT NOT NULL,
    member_name VARCHAR(200),
    member_card_id VARCHAR(30),
    
    -- Transaction details
    transaction_type ENUM('fine', 'payment', 'refund', 'waiver', 'deposit', 'fee') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    
    -- Related entities
    related_transaction_id INT,  -- PostgreSQL transactions.id
    related_book_id INT,
    related_book_title VARCHAR(500),
    
    -- Description
    description TEXT,
    
    -- Processing
    processed_by VARCHAR(255),  -- Staff email
    processed_by_id INT,
    payment_method VARCHAR(50),  -- cash, card, upi, online
    receipt_number VARCHAR(100),
    
    -- Timestamps (IST timezone)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_financial_member_id (member_id),
    INDEX idx_financial_type (transaction_type),
    INDEX idx_financial_created_at (created_at DESC),
    INDEX idx_financial_processed_by (processed_by)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. TRANSACTION_AUDIT TABLE (Checkout/Return Audit)
-- ============================================================
CREATE TABLE transaction_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Transaction reference
    pg_transaction_id INT NOT NULL,  -- PostgreSQL transactions.id
    
    -- Book info (denormalized)
    book_id INT NOT NULL,
    book_title VARCHAR(500),
    book_isbn VARCHAR(20),
    book_author VARCHAR(300),
    
    -- Member info (denormalized)
    member_id INT NOT NULL,
    member_name VARCHAR(200),
    member_card_id VARCHAR(30),
    member_email VARCHAR(255),
    
    -- Action
    action ENUM('CHECKOUT', 'CHECKIN', 'RENEWAL', 'LOST', 'OVERDUE_MARKED') NOT NULL,
    
    -- Details
    checkout_date DATETIME,
    due_date DATETIME,
    return_date DATETIME,
    fine_amount DECIMAL(10, 2) DEFAULT 0.00,
    book_condition VARCHAR(50),
    
    -- Who processed
    processed_by VARCHAR(255),
    processed_by_id INT,
    
    -- When (IST timezone)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Context
    notes TEXT,
    metadata JSON,
    
    -- Indexes
    INDEX idx_txn_audit_pg_id (pg_transaction_id),
    INDEX idx_txn_audit_book_id (book_id),
    INDEX idx_txn_audit_member_id (member_id),
    INDEX idx_txn_audit_action (action),
    INDEX idx_txn_audit_created_at (created_at DESC)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- USEFUL QUERIES (Reference)
-- ============================================================

-- All changes for a specific book
-- SELECT * FROM audit_trail WHERE book_id = 1 ORDER BY changed_at DESC;

-- Get full audit history with field changes
-- SELECT 
--     book_title,
--     action,
--     field_name,
--     old_value,
--     new_value,
--     changed_by,
--     DATE_FORMAT(changed_at, '%d/%m/%Y, %H:%i:%s') as changed_at_ist
-- FROM audit_trail 
-- WHERE book_id = 1 
-- ORDER BY changed_at DESC;

-- All deletions
-- SELECT * FROM audit_trail WHERE action = 'DELETE' ORDER BY changed_at DESC;

-- Outstanding fines per member
-- SELECT 
--     member_id,
--     member_name,
--     SUM(CASE WHEN transaction_type = 'fine' THEN amount ELSE 0 END) AS total_fined,
--     SUM(CASE WHEN transaction_type = 'payment' THEN amount ELSE 0 END) AS total_paid,
--     SUM(CASE WHEN transaction_type = 'fine' THEN amount ELSE 0 END) - 
--     SUM(CASE WHEN transaction_type = 'payment' THEN amount ELSE 0 END) AS balance
-- FROM financial_records 
-- GROUP BY member_id, member_name;

-- Financial summary for a month
-- SELECT 
--     transaction_type, 
--     COUNT(*) as count, 
--     SUM(amount) as total
-- FROM financial_records
-- WHERE YEAR(created_at) = 2026 AND MONTH(created_at) = 3
-- GROUP BY transaction_type;

-- Recent transaction audit
-- SELECT 
--     action,
--     book_title,
--     member_name,
--     DATE_FORMAT(created_at, '%d/%m/%Y, %H:%i:%s') as created_at_ist
-- FROM transaction_audit 
-- ORDER BY created_at DESC 
-- LIMIT 20;

-- ============================================================
-- SET TIMEZONE TO IST (Run this before inserting data)
-- ============================================================
SET time_zone = '+05:30';

-- ============================================================
-- VERIFY SETUP
-- ============================================================
-- Show all tables (should have exactly 4 tables)
SHOW TABLES;

-- Verify table structures
-- DESCRIBE audit_trail;
-- DESCRIBE member_audit_log;
-- DESCRIBE financial_records;
-- DESCRIBE transaction_audit;

-- ============================================================
-- SUMMARY
-- ============================================================
-- Tables created:
--   1. audit_trail           - Field-level book changes
--   2. member_audit_log      - Field-level member changes
--   3. financial_records     - Fines, payments, refunds
--   4. transaction_audit     - Checkout/return audit trail
--
-- Note: activity_logs and analytics belong in MongoDB, not MySQL!
--       If they exist in MySQL, they were cleaned up by this script.
-- ============================================================

-- ============================================================
-- DONE! ✅
-- ============================================================
