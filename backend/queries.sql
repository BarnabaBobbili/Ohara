-- ============================================================================
-- Library Management System - SQL Queries Documentation
-- ============================================================================
-- This file documents all SQL queries used in the application
-- All queries use named parameters (:param) for PostgreSQL compatibility
-- ============================================================================

-- ============================================================================
-- BOOKS MODULE
-- ============================================================================

-- Get all books with optional filtering
-- Supports: category filter, search (title/author/ISBN), pagination
SELECT * FROM books 
WHERE 1=1
  AND category = :category  -- Optional
  AND (title LIKE :search OR author LIKE :search OR isbn LIKE :search)  -- Optional
LIMIT :limit OFFSET :skip;

-- Get a specific book by ID
SELECT * FROM books WHERE id = :book_id;

-- Check if ISBN already exists
SELECT id FROM books WHERE isbn = :isbn;

-- Create a new book
INSERT INTO books (
    isbn, title, author, publisher, publication_year, category, 
    language, pages, description, cover_image_url, total_copies, 
    available_copies, location, created_at, updated_at
) VALUES (
    :isbn, :title, :author, :publisher, :publication_year, :category,
    :language, :pages, :description, :cover_image_url, :total_copies,
    :available_copies, :location, :created_at, :updated_at
);

-- Update a book (dynamic fields)
UPDATE books 
SET field1 = :field1, field2 = :field2, updated_at = :updated_at
WHERE id = :book_id;

-- Check for active transactions before deleting book
SELECT id FROM transactions 
WHERE book_id = :book_id AND status = 'checked_out'
LIMIT 1;

-- Delete a book
DELETE FROM books WHERE id = :book_id;

-- Get book by ISBN
SELECT * FROM books WHERE isbn = :isbn;


-- ============================================================================
-- MEMBERS MODULE
-- ============================================================================

-- Get all members with optional filtering
-- Supports: member_type filter, status filter, search (name/email/card_id), pagination
SELECT * FROM members 
WHERE 1=1
  AND member_type = :member_type  -- Optional
  AND status = :status  -- Optional
  AND (name LIKE :search OR email LIKE :search OR card_id LIKE :search)  -- Optional
LIMIT :limit OFFSET :skip;

-- Get a specific member by ID
SELECT * FROM members WHERE id = :member_id;

-- Check if email already exists
SELECT id FROM members WHERE email = :email;

-- Check if card_id already exists
SELECT id FROM members WHERE card_id = :card_id;

-- Create a new member
INSERT INTO members (
    card_id, name, email, phone, address, password_hash,
    member_type, status, fines, joined_date, expiry_date, last_visit
) VALUES (
    :card_id, :name, :email, :phone, :address, :password_hash,
    :member_type, :status, :fines, :joined_date, :expiry_date, :last_visit
);

-- Update a member (dynamic fields)
UPDATE members 
SET field1 = :field1, field2 = :field2
WHERE id = :member_id;

-- Check for active transactions before deleting member
SELECT id FROM transactions 
WHERE member_id = :member_id AND status = 'checked_out'
LIMIT 1;

-- Delete a member
DELETE FROM members WHERE id = :member_id;

-- Get member by card ID
SELECT * FROM members WHERE card_id = :card_id;


-- ============================================================================
-- CIRCULATION MODULE
-- ============================================================================

-- Verify book exists and is available
SELECT * FROM books WHERE id = :book_id;

-- Verify member exists and is active
SELECT * FROM members WHERE id = :member_id;

-- Check if member has overdue books
SELECT id FROM transactions 
WHERE member_id = :member_id AND status = 'overdue'
LIMIT 1;

-- Create a checkout transaction
INSERT INTO transactions (
    book_id, member_id, staff_id, checkout_date, due_date, return_date,
    status, checkout_condition, return_condition, fine_amount, fine_paid, notes
) VALUES (
    :book_id, :member_id, :staff_id, :checkout_date, :due_date, :return_date,
    :status, :checkout_condition, :return_condition, :fine_amount, :fine_paid, :notes
);

-- Update book availability (decrement on checkout)
UPDATE books 
SET available_copies = available_copies - 1 
WHERE id = :book_id;

-- Update book availability (increment on return)
UPDATE books 
SET available_copies = available_copies + 1 
WHERE id = :book_id;

-- Update member last visit
UPDATE members 
SET last_visit = :last_visit 
WHERE id = :member_id;

-- Get a specific transaction
SELECT * FROM transactions WHERE id = :transaction_id;

-- Get latest transaction for a book and member
SELECT * FROM transactions 
WHERE book_id = :book_id AND member_id = :member_id 
ORDER BY checkout_date DESC 
LIMIT 1;

-- Update transaction on return
UPDATE transactions 
SET return_date = :return_date, 
    return_condition = :return_condition,
    status = 'returned',
    fine_amount = :fine_amount,
    notes = :notes
WHERE id = :transaction_id;

-- Add fine to member's total fines
UPDATE members 
SET fines = fines + :fine_amount 
WHERE id = :member_id;

-- Get all active transactions
SELECT * FROM transactions 
WHERE status IN ('checked_out', 'overdue')
LIMIT :limit OFFSET :skip;

-- Update overdue transactions
UPDATE transactions 
SET status = 'overdue' 
WHERE status = 'checked_out' AND due_date < :now;

-- Get all overdue transactions
SELECT * FROM transactions WHERE status = 'overdue';

-- Get transaction history for a member
SELECT * FROM transactions 
WHERE member_id = :member_id 
ORDER BY checkout_date DESC;


-- ============================================================================
-- AUTHENTICATION MODULE
-- ============================================================================

-- Find user by email
SELECT * FROM members WHERE email = :email;

-- Find user by ID
SELECT * FROM members WHERE id = :user_id;

-- Create a new user (signup)
INSERT INTO members (
    card_id, name, email, phone, address, member_type,
    password_hash, status, fines, joined_date
) VALUES (
    :card_id, :name, :email, :phone, :address, :member_type,
    :password_hash, :status, :fines, :joined_date
);

-- Update last visit on login
UPDATE members 
SET last_visit = :last_visit 
WHERE id = :user_id;


-- ============================================================================
-- REPORTS MODULE
-- ============================================================================

-- Today's checkouts count
SELECT COUNT(*) as count 
FROM transactions 
WHERE checkout_date >= :today_start;

-- This week's checkouts count
SELECT COUNT(*) as count 
FROM transactions 
WHERE checkout_date >= :week_start;

-- This month's checkouts count
SELECT COUNT(*) as count 
FROM transactions 
WHERE checkout_date >= :month_start;

-- Average checkout duration (SQLite)
SELECT AVG(JULIANDAY(return_date) - JULIANDAY(checkout_date)) as avg_duration
FROM transactions 
WHERE return_date IS NOT NULL;

-- Average checkout duration (PostgreSQL)
SELECT AVG(EXTRACT(EPOCH FROM (return_date - checkout_date))/86400) as avg_duration
FROM transactions 
WHERE return_date IS NOT NULL;

-- Most borrowed books
SELECT 
    b.id,
    b.title,
    b.author,
    COUNT(t.id) as borrow_count
FROM books b
JOIN transactions t ON b.id = t.book_id
GROUP BY b.id, b.title, b.author
ORDER BY borrow_count DESC
LIMIT :limit;

-- Book distribution by category
SELECT 
    category,
    COUNT(id) as count
FROM books
GROUP BY category;

-- Member statistics by type
SELECT 
    member_type,
    COUNT(id) as count
FROM members
GROUP BY member_type;

-- Active members count
SELECT COUNT(*) as count 
FROM members 
WHERE status = 'active';

-- Total outstanding fines
SELECT SUM(fines) as total FROM members;

-- Collected fines (paid transactions)
SELECT SUM(fine_amount) as total 
FROM transactions 
WHERE fine_paid = 1;  -- SQLite uses 1 for TRUE

-- Collected fines (paid transactions) - PostgreSQL
SELECT SUM(fine_amount) as total 
FROM transactions 
WHERE fine_paid = TRUE;

-- Unpaid fines
SELECT SUM(fine_amount) as total 
FROM transactions 
WHERE fine_paid = 0 AND fine_amount > 0;  -- SQLite

-- Unpaid fines - PostgreSQL
SELECT SUM(fine_amount) as total 
FROM transactions 
WHERE fine_paid = FALSE AND fine_amount > 0;

-- Members with fines count
SELECT COUNT(*) as count 
FROM members 
WHERE fines > 0;

-- Monthly checkout trend (SQLite)
SELECT 
    CAST(strftime('%Y', checkout_date) AS INTEGER) as year,
    CAST(strftime('%m', checkout_date) AS INTEGER) as month,
    COUNT(id) as count
FROM transactions
WHERE checkout_date >= :six_months_ago
GROUP BY year, month
ORDER BY year, month;

-- Monthly checkout trend (PostgreSQL)
SELECT 
    EXTRACT(YEAR FROM checkout_date) as year,
    EXTRACT(MONTH FROM checkout_date) as month,
    COUNT(id) as count
FROM transactions
WHERE checkout_date >= :six_months_ago
GROUP BY year, month
ORDER BY year, month;


-- ============================================================================
-- NOTES FOR POSTGRESQL MIGRATION
-- ============================================================================

-- 1. Boolean values:
--    SQLite: Use 0/1 (fine_paid = 1)
--    PostgreSQL: Use TRUE/FALSE (fine_paid = TRUE)

-- 2. Date functions:
--    SQLite: JULIANDAY(), strftime()
--    PostgreSQL: EXTRACT(), NOW(), CURRENT_DATE

-- 3. Auto-increment:
--    SQLite: INTEGER PRIMARY KEY (automatic)
--    PostgreSQL: SERIAL or BIGSERIAL

-- 4. String concatenation:
--    Both: Use || operator (same in both)

-- 5. LIMIT/OFFSET:
--    Both: Same syntax (LIMIT :limit OFFSET :skip)

-- 6. Named parameters with SQLAlchemy text():
--    Both: Use :param_name (SQLAlchemy handles conversion)

-- ============================================================================
