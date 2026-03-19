-- ============================================
-- MYSQL AUDIT TRAIL SCHEMA
-- Tracks all changes to books in PostgreSQL
-- ============================================

CREATE TABLE IF NOT EXISTS audit_trail (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'UPDATE' or 'DELETE'
    field_name VARCHAR(100), -- Which field changed (for updates)
    old_value TEXT, -- Previous value
    new_value TEXT, -- New value
    changed_by VARCHAR(100), -- User/admin who made the change
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON, -- Additional context (IP, user agent, etc.)
    INDEX idx_book_id (book_id),
    INDEX idx_action (action),
    INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Sample Queries
-- ============================================

-- Get all changes for a specific book
-- SELECT * FROM audit_trail WHERE book_id = 1 ORDER BY changed_at DESC;

-- Get all deletions
-- SELECT * FROM audit_trail WHERE action = 'DELETE' ORDER BY changed_at DESC;

-- Get changes in last 7 days
-- SELECT * FROM audit_trail WHERE changed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) ORDER BY changed_at DESC;

-- Get field-specific changes
-- SELECT * FROM audit_trail WHERE field_name = 'title' ORDER BY changed_at DESC;
