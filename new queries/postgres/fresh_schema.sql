-- ============================================================
-- POSTGRESQL FRESH SCHEMA — OHARA LIBRARY
-- Supabase PostgreSQL — Complete Schema
-- Run in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- DROP EXISTING TABLES (Careful - this removes all data!)
-- ============================================================
DROP TABLE IF EXISTS public.collection_books CASCADE;
DROP TABLE IF EXISTS public.collections CASCADE;
DROP TABLE IF EXISTS public.reading_progress CASCADE;
DROP TABLE IF EXISTS public.user_uploaded_books CASCADE;
DROP TABLE IF EXISTS public.staff_board_posts CASCADE;
DROP TABLE IF EXISTS public.library_events CASCADE;
DROP TABLE IF EXISTS public.ebooks CASCADE;
DROP TABLE IF EXISTS public.site_settings CASCADE;
DROP TABLE IF EXISTS public.reservations CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.members CASCADE;
DROP TABLE IF EXISTS public.staff CASCADE;
DROP TABLE IF EXISTS public.books CASCADE;
DROP TABLE IF EXISTS public.external_book_cache CASCADE;

-- ============================================================
-- 1. BOOKS TABLE
-- ============================================================
CREATE TABLE public.books (
    id SERIAL PRIMARY KEY,
    isbn VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    author VARCHAR(300) NOT NULL,
    publisher VARCHAR(300),
    publication_year INTEGER CHECK (publication_year >= 1000 AND publication_year <= 2100),
    category VARCHAR(100),
    genre VARCHAR(100),
    language VARCHAR(50) DEFAULT 'English',
    pages INTEGER CHECK (pages IS NULL OR pages > 0),
    description TEXT,
    cover_image_url TEXT,
    total_copies INTEGER NOT NULL DEFAULT 1 CHECK (total_copies >= 0),
    available_copies INTEGER NOT NULL DEFAULT 1 CHECK (available_copies >= 0),
    location VARCHAR(100),  -- Shelf location (e.g., "Section A, Shelf 3")
    edition VARCHAR(50),
    format VARCHAR(30) DEFAULT 'Hardcover',  -- Hardcover, Paperback, etc.
    dimensions VARCHAR(50),  -- e.g., "21 x 14 x 2 cm"
    weight_grams INTEGER,
    tags TEXT[],  -- Array of tags for searching
    is_reference_only BOOLEAN DEFAULT FALSE,  -- Can't be borrowed
    is_active BOOLEAN DEFAULT TRUE,  -- Soft delete flag
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_available_copies CHECK (available_copies <= total_copies)
);

-- Indexes for books
CREATE INDEX idx_books_title ON public.books USING btree (title);
CREATE INDEX idx_books_author ON public.books USING btree (author);
CREATE INDEX idx_books_category ON public.books USING btree (category);
CREATE INDEX idx_books_genre ON public.books USING btree (genre);
CREATE INDEX idx_books_publication_year ON public.books USING btree (publication_year);
CREATE INDEX idx_books_language ON public.books USING btree (language);
CREATE INDEX idx_books_updated_at ON public.books USING btree (updated_at DESC);
CREATE INDEX idx_books_available ON public.books USING btree (available_copies) WHERE available_copies > 0;
CREATE INDEX idx_books_is_active ON public.books USING btree (is_active) WHERE is_active = true;

-- Full-text search indexes
CREATE INDEX idx_books_title_trgm ON public.books USING gin (title gin_trgm_ops);
CREATE INDEX idx_books_author_trgm ON public.books USING gin (author gin_trgm_ops);
CREATE INDEX idx_books_isbn_trgm ON public.books USING gin (isbn gin_trgm_ops);

-- ============================================================
-- 2. MEMBERS TABLE
-- ============================================================
CREATE TABLE public.members (
    id SERIAL PRIMARY KEY,
    card_id VARCHAR(30) NOT NULL UNIQUE,  -- Library card number
    supabase_uid UUID UNIQUE,  -- Link to Supabase Auth
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    date_of_birth DATE,
    gender VARCHAR(20),
    profile_image_url TEXT,
    password_hash VARCHAR(255),  -- For legacy auth
    member_type VARCHAR(30) NOT NULL DEFAULT 'regular',  -- regular, student, senior, premium
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, suspended, expired, inactive
    fines DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    max_books_allowed INTEGER NOT NULL DEFAULT 5,
    loan_period_days INTEGER NOT NULL DEFAULT 14,
    joined_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expiry_date DATE,  -- Membership expiry
    last_visit TIMESTAMPTZ,
    notes TEXT,  -- Admin notes
    is_verified BOOLEAN DEFAULT FALSE,
    emergency_contact VARCHAR(200),
    emergency_phone VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for members
CREATE INDEX idx_members_card_id ON public.members USING btree (card_id);
CREATE INDEX idx_members_email ON public.members USING btree (email);
CREATE INDEX idx_members_member_type ON public.members USING btree (member_type);
CREATE INDEX idx_members_status ON public.members USING btree (status);
CREATE INDEX idx_members_joined_date ON public.members USING btree (joined_date DESC);
CREATE INDEX idx_members_expiry_date ON public.members USING btree (expiry_date);
CREATE INDEX idx_members_supabase_uid ON public.members USING btree (supabase_uid);
CREATE INDEX idx_members_name_trgm ON public.members USING gin (name gin_trgm_ops);

-- ============================================================
-- 3. STAFF TABLE
-- ============================================================
CREATE TABLE public.staff (
    id SERIAL PRIMARY KEY,
    staff_id VARCHAR(30) NOT NULL UNIQUE,  -- Employee ID
    supabase_uid UUID UNIQUE,  -- Link to Supabase Auth
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'librarian',  -- admin, librarian, assistant
    department VARCHAR(100),
    permissions JSONB DEFAULT '{}',  -- Granular permissions
    status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, inactive, suspended
    hired_date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_login TIMESTAMPTZ,
    profile_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for staff
CREATE INDEX idx_staff_staff_id ON public.staff USING btree (staff_id);
CREATE INDEX idx_staff_email ON public.staff USING btree (email);
CREATE INDEX idx_staff_role ON public.staff USING btree (role);
CREATE INDEX idx_staff_status ON public.staff USING btree (status);
CREATE INDEX idx_staff_supabase_uid ON public.staff USING btree (supabase_uid);

-- ============================================================
-- 4. TRANSACTIONS TABLE (Checkouts/Returns)
-- ============================================================
CREATE TABLE public.transactions (
    id SERIAL PRIMARY KEY,
    book_id INTEGER NOT NULL REFERENCES public.books(id) ON DELETE RESTRICT,
    member_id INTEGER NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
    staff_id INTEGER REFERENCES public.staff(id) ON DELETE SET NULL,  -- Who processed
    checkout_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ NOT NULL,
    return_date TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'checked_out',  -- checked_out, returned, overdue, lost, renewed
    checkout_condition VARCHAR(30) DEFAULT 'good',  -- good, fair, poor
    return_condition VARCHAR(30),
    fine_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    fine_paid BOOLEAN NOT NULL DEFAULT FALSE,
    fine_paid_date TIMESTAMPTZ,
    renewal_count INTEGER NOT NULL DEFAULT 0,
    max_renewals INTEGER NOT NULL DEFAULT 2,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for transactions
CREATE INDEX idx_transactions_book_id ON public.transactions USING btree (book_id);
CREATE INDEX idx_transactions_member_id ON public.transactions USING btree (member_id);
CREATE INDEX idx_transactions_staff_id ON public.transactions USING btree (staff_id);
CREATE INDEX idx_transactions_status ON public.transactions USING btree (status);
CREATE INDEX idx_transactions_checkout_date ON public.transactions USING btree (checkout_date DESC);
CREATE INDEX idx_transactions_due_date ON public.transactions USING btree (due_date);
CREATE INDEX idx_transactions_member_status ON public.transactions USING btree (member_id, status);
CREATE INDEX idx_transactions_overdue ON public.transactions USING btree (due_date) 
    WHERE status = 'checked_out' AND return_date IS NULL;

-- ============================================================
-- 5. RESERVATIONS TABLE
-- ============================================================
CREATE TABLE public.reservations (
    id SERIAL PRIMARY KEY,
    book_id INTEGER NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    reservation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expiry_date TIMESTAMPTZ,  -- When reservation expires
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, fulfilled, cancelled, expired
    notified BOOLEAN NOT NULL DEFAULT FALSE,
    notified_at TIMESTAMPTZ,
    position_in_queue INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for reservations
CREATE INDEX idx_reservations_book_id ON public.reservations USING btree (book_id);
CREATE INDEX idx_reservations_member_id ON public.reservations USING btree (member_id);
CREATE INDEX idx_reservations_status ON public.reservations USING btree (status);
CREATE INDEX idx_reservations_expiry ON public.reservations USING btree (expiry_date) WHERE status = 'pending';

-- ============================================================
-- 6. COLLECTIONS TABLE (Curated book lists for landing page)
-- ============================================================
CREATE TABLE public.collections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    slug VARCHAR(200) NOT NULL UNIQUE,  -- URL-friendly name
    description TEXT,
    cover_image TEXT,  -- Collection cover image URL
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,  -- Show on landing page (max 3)
    created_by INTEGER REFERENCES public.staff(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_collections_display_order ON public.collections (display_order);
CREATE INDEX idx_collections_is_pinned ON public.collections (is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_collections_is_active ON public.collections (is_active) WHERE is_active = TRUE;

-- ============================================================
-- 7. COLLECTION_BOOKS TABLE (Many-to-Many)
-- ============================================================
CREATE TABLE public.collection_books (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    book_id INTEGER NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL DEFAULT 0,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    added_by INTEGER REFERENCES public.staff(id),
    UNIQUE(collection_id, book_id)
);

CREATE INDEX idx_collection_books_collection ON public.collection_books (collection_id, display_order);

-- ============================================================
-- 8. SITE_SETTINGS TABLE
-- ============================================================
CREATE TABLE public.site_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,  -- JSON for complex values
    category VARCHAR(50) NOT NULL DEFAULT 'general',  -- general, circulation, fines, display
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by INTEGER REFERENCES public.staff(id)
);

-- ============================================================
-- 9. EBOOKS TABLE
-- ============================================================
CREATE TABLE public.ebooks (
    id SERIAL PRIMARY KEY,
    book_id INTEGER REFERENCES public.books(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    author VARCHAR(300),
    file_path TEXT NOT NULL,
    file_format VARCHAR(20) NOT NULL,  -- pdf, epub, mobi
    file_size_bytes BIGINT,
    cover_path TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    download_count INTEGER NOT NULL DEFAULT 0,
    uploaded_by INTEGER REFERENCES public.staff(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ebooks_book_id ON public.ebooks (book_id);
CREATE INDEX idx_ebooks_is_public ON public.ebooks (is_public) WHERE is_public = TRUE;

-- ============================================================
-- 10. LIBRARY_EVENTS TABLE
-- ============================================================
CREATE TABLE public.library_events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    location VARCHAR(200),
    event_type VARCHAR(50),  -- workshop, reading, meetup, exhibition
    max_attendees INTEGER,
    current_attendees INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    cover_image_url TEXT,
    created_by INTEGER REFERENCES public.staff(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_library_events_date ON public.library_events (event_date);
CREATE INDEX idx_library_events_active ON public.library_events (is_active) WHERE is_active = TRUE;

-- ============================================================
-- 11. STAFF_BOARD_POSTS TABLE
-- ============================================================
CREATE TABLE public.staff_board_posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'announcement',  -- announcement, memo, alert, task
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'normal',  -- low, normal, high, urgent
    posted_by INTEGER REFERENCES public.staff(id),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_board_created ON public.staff_board_posts (created_at DESC);
CREATE INDEX idx_staff_board_pinned ON public.staff_board_posts (is_pinned) WHERE is_pinned = TRUE;

-- ============================================================
-- 12. READING_PROGRESS TABLE (for ebook readers)
-- ============================================================
CREATE TABLE public.reading_progress (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    book_type VARCHAR(20) NOT NULL,  -- 'physical', 'ebook'
    book_id VARCHAR(50) NOT NULL,  -- Can be ebook ID or book ID
    current_location TEXT,  -- Page number or CFI for ebooks
    progress_percent DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(member_id, book_type, book_id)
);

CREATE INDEX idx_reading_progress_member ON public.reading_progress (member_id);

-- ============================================================
-- 13. USER_UPLOADED_BOOKS TABLE
-- ============================================================
CREATE TABLE public.user_uploaded_books (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    author VARCHAR(300),
    file_path TEXT NOT NULL,
    file_format VARCHAR(20),
    file_size_bytes BIGINT,
    cover_path TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_uploaded_member ON public.user_uploaded_books (member_id);

-- ============================================================
-- PL/pgSQL FUNCTIONS & TRIGGERS
-- ============================================================

-- Function: Auto-update timestamp
CREATE OR REPLACE FUNCTION public.fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers to all tables with updated_at
DROP TRIGGER IF EXISTS trg_books_updated_at ON public.books;
CREATE TRIGGER trg_books_updated_at BEFORE UPDATE ON public.books
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_members_updated_at ON public.members;
CREATE TRIGGER trg_members_updated_at BEFORE UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_staff_updated_at ON public.staff;
CREATE TRIGGER trg_staff_updated_at BEFORE UPDATE ON public.staff
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_reservations_updated_at ON public.reservations;
CREATE TRIGGER trg_reservations_updated_at BEFORE UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_collections_updated_at ON public.collections;
CREATE TRIGGER trg_collections_updated_at BEFORE UPDATE ON public.collections
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER trg_site_settings_updated_at BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_staff_board_updated_at ON public.staff_board_posts;
CREATE TRIGGER trg_staff_board_updated_at BEFORE UPDATE ON public.staff_board_posts
FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

-- Function: Auto-update available_copies on checkout/return
CREATE OR REPLACE FUNCTION public.fn_update_available_copies()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'checked_out' THEN
        UPDATE public.books 
        SET available_copies = GREATEST(0, available_copies - 1)
        WHERE id = NEW.book_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'checked_out' AND NEW.status = 'returned' THEN
            UPDATE public.books 
            SET available_copies = LEAST(total_copies, available_copies + 1)
            WHERE id = NEW.book_id;
        ELSIF OLD.status = 'returned' AND NEW.status = 'checked_out' THEN
            UPDATE public.books 
            SET available_copies = GREATEST(0, available_copies - 1)
            WHERE id = NEW.book_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_copies ON public.transactions;
CREATE TRIGGER trg_update_copies
AFTER INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_update_available_copies();

-- Function: Calculate fine on return
CREATE OR REPLACE FUNCTION public.fn_calculate_fine()
RETURNS TRIGGER AS $$
DECLARE
    v_days_overdue INTEGER;
    v_daily_rate DECIMAL := 0.50;
    v_max_fine DECIMAL := 25.00;
    v_fine DECIMAL;
    v_setting_rate TEXT;
    v_setting_cap TEXT;
BEGIN
    IF NEW.status = 'returned' AND NEW.return_date IS NOT NULL AND OLD.status = 'checked_out' THEN
        -- Try to get configurable rates from site_settings
        SELECT value INTO v_setting_rate FROM public.site_settings WHERE key = 'daily_fine_rate';
        SELECT value INTO v_setting_cap FROM public.site_settings WHERE key = 'max_fine_cap';
        IF v_setting_rate IS NOT NULL THEN v_daily_rate := v_setting_rate::DECIMAL; END IF;
        IF v_setting_cap IS NOT NULL THEN v_max_fine := v_setting_cap::DECIMAL; END IF;
        
        v_days_overdue := GREATEST(0, EXTRACT(DAY FROM (NEW.return_date - NEW.due_date))::INTEGER);
        
        IF v_days_overdue > 0 THEN
            v_fine := LEAST(v_days_overdue * v_daily_rate, v_max_fine);
            NEW.fine_amount := v_fine;
            
            -- Update member's total fines
            UPDATE public.members
            SET fines = fines + v_fine
            WHERE id = NEW.member_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_fine ON public.transactions;
CREATE TRIGGER trg_calculate_fine
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_calculate_fine();

-- Function: Dashboard statistics
CREATE OR REPLACE FUNCTION public.fn_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_books', (SELECT COUNT(*) FROM public.books WHERE is_active = TRUE),
        'total_copies', (SELECT COALESCE(SUM(total_copies), 0) FROM public.books WHERE is_active = TRUE),
        'available_copies', (SELECT COALESCE(SUM(available_copies), 0) FROM public.books WHERE is_active = TRUE),
        'total_members', (SELECT COUNT(*) FROM public.members WHERE status = 'active'),
        'books_checked_out', (SELECT COUNT(*) FROM public.transactions WHERE status = 'checked_out'),
        'books_overdue', (SELECT COUNT(*) FROM public.transactions 
                          WHERE status = 'checked_out' AND due_date < NOW()),
        'pending_reservations', (SELECT COUNT(*) FROM public.reservations WHERE status = 'pending'),
        'total_fines_outstanding', (SELECT COALESCE(SUM(fines), 0) FROM public.members WHERE fines > 0),
        'new_members_this_month', (SELECT COUNT(*) FROM public.members 
                                   WHERE joined_date >= date_trunc('month', NOW())),
        'transactions_today', (SELECT COUNT(*) FROM public.transactions 
                               WHERE DATE(checkout_date) = CURRENT_DATE)
    ) INTO v_result;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function: Expire old reservations
CREATE OR REPLACE FUNCTION public.fn_expire_reservations()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.reservations
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending'
      AND expiry_date IS NOT NULL
      AND expiry_date < NOW();
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Process fine payment
CREATE OR REPLACE FUNCTION public.fn_process_payment(
    p_member_id INTEGER,
    p_amount DECIMAL,
    p_processed_by TEXT DEFAULT 'system'
)
RETURNS TABLE(remaining_balance DECIMAL) AS $$
BEGIN
    -- Deduct from member fines
    UPDATE public.members
    SET fines = GREATEST(0, fines - p_amount)
    WHERE id = p_member_id;
    
    -- Mark transaction fines as paid (oldest first)
    UPDATE public.transactions
    SET fine_paid = TRUE, fine_paid_date = NOW()
    WHERE id IN (
        SELECT id FROM public.transactions
        WHERE member_id = p_member_id AND fine_amount > 0 AND fine_paid = FALSE
        ORDER BY checkout_date ASC
        LIMIT CEIL(p_amount / 0.50)::INTEGER
    );
    
    RETURN QUERY SELECT fines FROM public.members WHERE id = p_member_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- INSERT DEFAULT SITE SETTINGS
-- ============================================================
INSERT INTO public.site_settings (key, value, category, description) VALUES
('library_name', 'Ohara Library', 'general', 'Name of the library'),
('contact_email', 'contact@oharalibrary.com', 'general', 'Contact email address'),
('contact_phone', '+91 1234567890', 'general', 'Contact phone number'),
('address', '123 Library Street, City, State 123456', 'general', 'Library address'),
('daily_fine_rate', '0.50', 'fines', 'Fine per day for overdue books (in currency)'),
('max_fine_cap', '25.00', 'fines', 'Maximum fine cap per book'),
('default_loan_days', '14', 'circulation', 'Default loan period in days'),
('max_renewals', '2', 'circulation', 'Maximum number of renewals allowed'),
('max_books_regular', '5', 'circulation', 'Max books for regular members'),
('max_books_premium', '10', 'circulation', 'Max books for premium members'),
('timezone', 'Asia/Kolkata', 'general', 'Default timezone for the library')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_board_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_uploaded_books ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================

-- Check if user is admin/staff (via Supabase role or staff table)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user has 'admin' or 'librarian' role in Supabase auth metadata
    RETURN (
        COALESCE(
            (current_setting('request.jwt.claims', true)::json->>'role')::text = 'admin',
            false
        ) OR
        EXISTS (
            SELECT 1 FROM public.staff
            WHERE supabase_uid = auth.uid()
            AND role IN ('admin', 'librarian')
            AND status = 'active'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is the member themselves
CREATE OR REPLACE FUNCTION public.is_member_self(member_uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid() = member_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current member ID from Supabase UID
CREATE OR REPLACE FUNCTION public.current_member_id()
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT id FROM public.members WHERE supabase_uid = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RLS POLICIES: BOOKS
-- ============================================================

-- Public: Can view active books
CREATE POLICY "books_select_public" ON public.books
FOR SELECT USING (is_active = true);

-- Admin: Full access to all books
CREATE POLICY "books_all_admin" ON public.books
FOR ALL USING (public.is_admin());

-- ============================================================
-- RLS POLICIES: MEMBERS
-- ============================================================

-- Members: Can view their own profile
CREATE POLICY "members_select_self" ON public.members
FOR SELECT USING (public.is_member_self(supabase_uid));

-- Members: Can update their own profile (limited fields)
CREATE POLICY "members_update_self" ON public.members
FOR UPDATE USING (public.is_member_self(supabase_uid))
WITH CHECK (public.is_member_self(supabase_uid));

-- Admin: Full access to all members
CREATE POLICY "members_all_admin" ON public.members
FOR ALL USING (public.is_admin());

-- ============================================================
-- RLS POLICIES: STAFF
-- ============================================================

-- Staff: Can view their own profile
CREATE POLICY "staff_select_self" ON public.staff
FOR SELECT USING (supabase_uid = auth.uid());

-- Admin only: Full access to staff
CREATE POLICY "staff_all_admin" ON public.staff
FOR ALL USING (public.is_admin());

-- ============================================================
-- RLS POLICIES: TRANSACTIONS
-- ============================================================

-- Members: Can view their own transactions
CREATE POLICY "transactions_select_self" ON public.transactions
FOR SELECT USING (member_id = public.current_member_id());

-- Admin: Full access to all transactions
CREATE POLICY "transactions_all_admin" ON public.transactions
FOR ALL USING (public.is_admin());

-- ============================================================
-- RLS POLICIES: RESERVATIONS
-- ============================================================

-- Members: Can view their own reservations
CREATE POLICY "reservations_select_self" ON public.reservations
FOR SELECT USING (member_id = public.current_member_id());

-- Members: Can create reservations for themselves
CREATE POLICY "reservations_insert_self" ON public.reservations
FOR INSERT WITH CHECK (member_id = public.current_member_id());

-- Members: Can cancel their own pending reservations
CREATE POLICY "reservations_update_self" ON public.reservations
FOR UPDATE USING (member_id = public.current_member_id() AND status = 'pending')
WITH CHECK (member_id = public.current_member_id() AND status IN ('pending', 'cancelled'));

-- Admin: Full access to all reservations
CREATE POLICY "reservations_all_admin" ON public.reservations
FOR ALL USING (public.is_admin());

-- ============================================================
-- RLS POLICIES: COLLECTIONS
-- ============================================================

-- Public: Can view active collections
CREATE POLICY "collections_select_public" ON public.collections
FOR SELECT USING (is_active = true);

-- Admin: Full access to collections
CREATE POLICY "collections_all_admin" ON public.collections
FOR ALL USING (public.is_admin());

-- ============================================================
-- RLS POLICIES: COLLECTION_BOOKS
-- ============================================================

-- Public: Can view all collection books
CREATE POLICY "collection_books_select_public" ON public.collection_books
FOR SELECT USING (true);

-- Admin: Full access
CREATE POLICY "collection_books_all_admin" ON public.collection_books
FOR ALL USING (public.is_admin());

-- ============================================================
-- RLS POLICIES: SITE_SETTINGS
-- ============================================================

-- Public: Can view general settings only
CREATE POLICY "site_settings_select_public" ON public.site_settings
FOR SELECT USING (category = 'general');

-- Admin: Full access to all settings
CREATE POLICY "site_settings_all_admin" ON public.site_settings
FOR ALL USING (public.is_admin());

-- ============================================================
-- RLS POLICIES: EBOOKS
-- ============================================================

-- Public: Can view public ebooks
CREATE POLICY "ebooks_select_public" ON public.ebooks
FOR SELECT USING (is_public = true);

-- Members: Can view all ebooks
CREATE POLICY "ebooks_select_members" ON public.ebooks
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Admin: Full access
CREATE POLICY "ebooks_all_admin" ON public.ebooks
FOR ALL USING (public.is_admin());

-- ============================================================
-- RLS POLICIES: LIBRARY_EVENTS
-- ============================================================

-- Public: Can view active events
CREATE POLICY "events_select_public" ON public.library_events
FOR SELECT USING (is_active = true);

-- Admin: Full access
CREATE POLICY "events_all_admin" ON public.library_events
FOR ALL USING (public.is_admin());

-- ============================================================
-- RLS POLICIES: STAFF_BOARD_POSTS
-- ============================================================

-- Staff only: Can view posts
CREATE POLICY "staff_board_select_staff" ON public.staff_board_posts
FOR SELECT USING (public.is_admin());

-- Admin: Full access
CREATE POLICY "staff_board_all_admin" ON public.staff_board_posts
FOR ALL USING (public.is_admin());

-- ============================================================
-- RLS POLICIES: READING_PROGRESS
-- ============================================================

-- Members: Can view/update their own reading progress
CREATE POLICY "reading_progress_self" ON public.reading_progress
FOR ALL USING (member_id = public.current_member_id())
WITH CHECK (member_id = public.current_member_id());

-- Admin: Full access
CREATE POLICY "reading_progress_admin" ON public.reading_progress
FOR ALL USING (public.is_admin());

-- ============================================================
-- RLS POLICIES: USER_UPLOADED_BOOKS
-- ============================================================

-- Members: Can manage their own uploads
CREATE POLICY "user_uploads_self" ON public.user_uploaded_books
FOR ALL USING (member_id = public.current_member_id())
WITH CHECK (member_id = public.current_member_id());

-- Admin: Full access
CREATE POLICY "user_uploads_admin" ON public.user_uploaded_books
FOR ALL USING (public.is_admin());

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant select on all tables to authenticated users (RLS will filter)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant select on public data to anonymous users (RLS will filter)
GRANT SELECT ON public.books TO anon;
GRANT SELECT ON public.collections TO anon;
GRANT SELECT ON public.collection_books TO anon;
GRANT SELECT ON public.library_events TO anon;
GRANT SELECT ON public.ebooks TO anon;

-- Grant insert/update/delete to authenticated users (RLS will filter)
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant sequence usage
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================
-- CREATE ADMIN USER SETUP FUNCTION
-- ============================================================

-- Function to set admin role in Supabase auth metadata
-- Run this after creating your first admin user in Supabase Auth
-- Example: SELECT public.set_user_role('your-admin-uuid', 'admin');
CREATE OR REPLACE FUNCTION public.set_user_role(
    user_uid UUID,
    new_role TEXT
)
RETURNS VOID AS $$
BEGIN
    -- This function should be called via Supabase Dashboard or CLI
    -- to set user metadata: { "role": "admin" }
    -- You can also use Supabase Auth admin API for this
    RAISE NOTICE 'To set user role, use Supabase Dashboard or Auth API';
    RAISE NOTICE 'Set user metadata: { "role": "%" }', new_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- DONE! 🎉
-- ============================================================

-- Next steps:
-- 1. Create your first admin user in Supabase Auth Dashboard
-- 2. Set their role metadata to { "role": "admin" } in Auth settings
-- 3. OR create a staff record with their supabase_uid and role='admin'
-- 4. Test RLS policies with different user contexts
