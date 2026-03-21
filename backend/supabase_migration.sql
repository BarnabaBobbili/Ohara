-- ============================================================
-- OHARA LIBRARY — SUPABASE MIGRATION
-- Run this entire file in Supabase SQL Editor
-- ============================================================


-- ============================================================
-- STEP 1: DROP TABLES NO LONGER NEEDED
-- ============================================================

DROP TABLE IF EXISTS public.external_book_cache CASCADE;


-- ============================================================
-- STEP 2: ADD supabase_uid TO STAFF (links Supabase Auth → staff)
-- ============================================================

ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS supabase_uid uuid UNIQUE;
CREATE INDEX IF NOT EXISTS idx_staff_supabase_uid ON public.staff (supabase_uid);


-- ============================================================
-- STEP 3: NEW TABLES
-- ============================================================

-- Site Settings: key-value config managed by admin
CREATE TABLE IF NOT EXISTS public.site_settings (
  id serial PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_site_settings_category ON public.site_settings (category);

-- Collections: curated book lists for landing page
CREATE TABLE IF NOT EXISTS public.collections (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL,
  description text,
  cover_image text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Collection Books: many-to-many
CREATE TABLE IF NOT EXISTS public.collection_books (
  id serial PRIMARY KEY,
  collection_id int NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  book_id int NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  display_order int NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, book_id)
);
CREATE INDEX IF NOT EXISTS idx_collection_books_collection ON public.collection_books (collection_id);

-- Ebooks: future online ebook metadata
CREATE TABLE IF NOT EXISTS public.ebooks (
  id serial PRIMARY KEY,
  book_id int REFERENCES public.books(id) ON DELETE SET NULL,
  title text NOT NULL,
  author text,
  file_path text NOT NULL,
  file_format text NOT NULL,
  file_size int,
  cover_path text,
  is_public boolean NOT NULL DEFAULT false,
  uploaded_by int,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ebooks_book_id ON public.ebooks (book_id);

-- Staff Board Posts: pinned announcements on admin dashboard
CREATE TABLE IF NOT EXISTS public.staff_board_posts (
  id serial PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'announcement',
  is_pinned boolean NOT NULL DEFAULT false,
  posted_by int REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

-- Library Events: for landing page display
CREATE TABLE IF NOT EXISTS public.library_events (
  id serial PRIMARY KEY,
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  location text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- STEP 4: PL/pgSQL FUNCTIONS & TRIGGERS
-- ============================================================

-- FUNCTION 1: Generic updated_at timestamp updater
CREATE OR REPLACE FUNCTION public.fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_books_updated_at ON public.books;
CREATE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_collections_updated_at ON public.collections;
CREATE TRIGGER trg_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER trg_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();


-- FUNCTION 2: Auto-update available_copies on checkout / return
CREATE OR REPLACE FUNCTION public.fn_update_available_copies()
RETURNS TRIGGER AS $$
BEGIN
  -- New checkout: decrement
  IF TG_OP = 'INSERT' AND NEW.status = 'checked_out' THEN
    UPDATE public.books
    SET available_copies = GREATEST(0, available_copies - 1)
    WHERE id = NEW.book_id;

  -- Return: increment
  ELSIF TG_OP = 'UPDATE'
    AND OLD.status = 'checked_out'
    AND NEW.status = 'returned' THEN
    UPDATE public.books
    SET available_copies = LEAST(total_copies, available_copies + 1)
    WHERE id = NEW.book_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_copies ON public.transactions;
CREATE TRIGGER trg_update_copies
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_available_copies();


-- FUNCTION 3: Auto-calculate fine on book return
CREATE OR REPLACE FUNCTION public.fn_calculate_fine()
RETURNS TRIGGER AS $$
DECLARE
  v_days_overdue int;
  v_daily_rate   numeric := 0.50;
  v_max_cap      numeric := 20.00;
  v_fine         numeric := 0;
  v_rate_setting text;
  v_cap_setting  text;
BEGIN
  -- Only fire when status changes to 'returned' from 'checked_out'
  IF NEW.status = 'returned'
     AND NEW.return_date IS NOT NULL
     AND OLD.status = 'checked_out' THEN

    -- Read configurable fine rates from site_settings (if set)
    SELECT value INTO v_rate_setting FROM public.site_settings WHERE key = 'daily_fine_rate';
    SELECT value INTO v_cap_setting  FROM public.site_settings WHERE key = 'max_fine_cap';
    IF v_rate_setting IS NOT NULL THEN v_daily_rate := v_rate_setting::numeric; END IF;
    IF v_cap_setting  IS NOT NULL THEN v_max_cap    := v_cap_setting::numeric;  END IF;

    v_days_overdue := GREATEST(0,
      EXTRACT(DAY FROM (NEW.return_date::timestamptz - NEW.due_date::timestamptz))::int
    );

    IF v_days_overdue > 0 THEN
      v_fine := LEAST(v_days_overdue * v_daily_rate, v_max_cap);
      NEW.fine_amount := v_fine;

      -- Update member running fine total
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
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_calculate_fine();


-- FUNCTION 4: Expire stale reservations (call manually or via cron)
CREATE OR REPLACE FUNCTION public.fn_expire_reservations()
RETURNS int AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.reservations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expiry_date IS NOT NULL
    AND expiry_date < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;


-- FUNCTION 5: Process fine payment (API-callable)
CREATE OR REPLACE FUNCTION public.fn_process_payment(
  p_member_id int,
  p_amount    numeric,
  p_processed_by text DEFAULT 'system'
)
RETURNS TABLE(remaining_balance numeric) AS $$
BEGIN
  UPDATE public.members
  SET fines = GREATEST(0, fines - p_amount)
  WHERE id = p_member_id;

  -- Mark oldest unpaid transaction fines as paid
  UPDATE public.transactions
  SET fine_paid = true
  WHERE id IN (
    SELECT id FROM public.transactions
    WHERE member_id = p_member_id
      AND fine_amount > 0
      AND fine_paid = false
    ORDER BY checkout_date ASC
    LIMIT 50
  )
  AND fine_amount <= p_amount;

  RETURN QUERY
  SELECT fines FROM public.members WHERE id = p_member_id;
END;
$$ LANGUAGE plpgsql;


-- FUNCTION 6: Single-call dashboard statistics
CREATE OR REPLACE FUNCTION public.fn_dashboard_stats()
RETURNS json AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'total_books',             (SELECT COUNT(*) FROM public.books),
    'books_available',         (SELECT COALESCE(SUM(available_copies), 0) FROM public.books),
    'total_members',           (SELECT COUNT(*) FROM public.members WHERE status = 'active'),
    'books_checked_out',       (SELECT COUNT(*) FROM public.transactions WHERE status = 'checked_out'),
    'books_overdue',           (SELECT COUNT(*) FROM public.transactions
                                WHERE status = 'checked_out' AND due_date < now()),
    'pending_reservations',    (SELECT COUNT(*) FROM public.reservations WHERE status = 'pending'),
    'total_fines_outstanding', (SELECT COALESCE(SUM(fines), 0) FROM public.members WHERE fines > 0),
    'new_members_this_month',  (SELECT COUNT(*) FROM public.members
                                WHERE joined_date >= date_trunc('month', now()))
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- STEP 5: RLS HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.staff
    WHERE supabase_uid = auth.uid()
      AND role = 'admin'
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff_member()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.staff
    WHERE supabase_uid = auth.uid()
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- STEP 6: ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.books              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_uploaded_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_books   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebooks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_board_posts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_events     ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 7: RLS POLICIES
-- ============================================================

-- BOOKS: public read, admin write
DROP POLICY IF EXISTS "books_public_read"   ON public.books;
DROP POLICY IF EXISTS "books_admin_insert"  ON public.books;
DROP POLICY IF EXISTS "books_admin_update"  ON public.books;
DROP POLICY IF EXISTS "books_admin_delete"  ON public.books;

CREATE POLICY "books_public_read"  ON public.books FOR SELECT USING (true);
CREATE POLICY "books_admin_insert" ON public.books FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "books_admin_update" ON public.books FOR UPDATE USING (public.is_admin());
CREATE POLICY "books_admin_delete" ON public.books FOR DELETE USING (public.is_admin());

-- MEMBERS: own data or staff
DROP POLICY IF EXISTS "members_self_read"   ON public.members;
DROP POLICY IF EXISTS "members_admin_insert" ON public.members;
DROP POLICY IF EXISTS "members_admin_update" ON public.members;
DROP POLICY IF EXISTS "members_admin_delete" ON public.members;

CREATE POLICY "members_self_read" ON public.members
  FOR SELECT USING (email = auth.jwt()->>'email' OR public.is_staff_member());
CREATE POLICY "members_admin_insert" ON public.members
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "members_admin_update" ON public.members
  FOR UPDATE USING (email = auth.jwt()->>'email' OR public.is_admin());
CREATE POLICY "members_admin_delete" ON public.members
  FOR DELETE USING (public.is_admin());

-- TRANSACTIONS: own data or staff
DROP POLICY IF EXISTS "transactions_self_read"    ON public.transactions;
DROP POLICY IF EXISTS "transactions_staff_insert" ON public.transactions;
DROP POLICY IF EXISTS "transactions_staff_update" ON public.transactions;

CREATE POLICY "transactions_self_read" ON public.transactions
  FOR SELECT USING (
    member_id IN (SELECT id FROM public.members WHERE email = auth.jwt()->>'email')
    OR public.is_staff_member()
  );
CREATE POLICY "transactions_staff_insert" ON public.transactions
  FOR INSERT WITH CHECK (public.is_staff_member());
CREATE POLICY "transactions_staff_update" ON public.transactions
  FOR UPDATE USING (public.is_staff_member());

-- RESERVATIONS: own data or staff
DROP POLICY IF EXISTS "reservations_self_read"   ON public.reservations;
DROP POLICY IF EXISTS "reservations_self_insert" ON public.reservations;
DROP POLICY IF EXISTS "reservations_staff_update" ON public.reservations;

CREATE POLICY "reservations_self_read" ON public.reservations
  FOR SELECT USING (
    member_id IN (SELECT id FROM public.members WHERE email = auth.jwt()->>'email')
    OR public.is_staff_member()
  );
CREATE POLICY "reservations_self_insert" ON public.reservations
  FOR INSERT WITH CHECK (
    member_id IN (SELECT id FROM public.members WHERE email = auth.jwt()->>'email')
    OR public.is_staff_member()
  );
CREATE POLICY "reservations_staff_update" ON public.reservations
  FOR UPDATE USING (public.is_staff_member());

-- STAFF: self-read or admin
DROP POLICY IF EXISTS "staff_self_read" ON public.staff;
DROP POLICY IF EXISTS "staff_admin_all" ON public.staff;

CREATE POLICY "staff_self_read" ON public.staff
  FOR SELECT USING (supabase_uid = auth.uid() OR public.is_admin());
CREATE POLICY "staff_admin_all" ON public.staff
  FOR ALL USING (public.is_admin());

-- SITE SETTINGS: public read, admin write
DROP POLICY IF EXISTS "settings_public_read" ON public.site_settings;
DROP POLICY IF EXISTS "settings_admin_all"   ON public.site_settings;

CREATE POLICY "settings_public_read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "settings_admin_all"   ON public.site_settings FOR ALL USING (public.is_admin());

-- COLLECTIONS: public read, admin write
DROP POLICY IF EXISTS "collections_public_read" ON public.collections;
DROP POLICY IF EXISTS "collections_admin_all"   ON public.collections;
DROP POLICY IF EXISTS "coll_books_public_read"  ON public.collection_books;
DROP POLICY IF EXISTS "coll_books_admin_all"    ON public.collection_books;

CREATE POLICY "collections_public_read" ON public.collections   FOR SELECT USING (true);
CREATE POLICY "collections_admin_all"   ON public.collections   FOR ALL USING (public.is_admin());
CREATE POLICY "coll_books_public_read"  ON public.collection_books FOR SELECT USING (true);
CREATE POLICY "coll_books_admin_all"    ON public.collection_books FOR ALL USING (public.is_admin());

-- EBOOKS: public only if is_public, admin always
DROP POLICY IF EXISTS "ebooks_read"      ON public.ebooks;
DROP POLICY IF EXISTS "ebooks_admin_all" ON public.ebooks;

CREATE POLICY "ebooks_read"      ON public.ebooks FOR SELECT USING (is_public = true OR public.is_staff_member());
CREATE POLICY "ebooks_admin_all" ON public.ebooks FOR ALL    USING (public.is_admin());

-- STAFF BOARD POSTS: staff read, admin write
DROP POLICY IF EXISTS "board_staff_read" ON public.staff_board_posts;
DROP POLICY IF EXISTS "board_admin_all"  ON public.staff_board_posts;

CREATE POLICY "board_staff_read" ON public.staff_board_posts FOR SELECT USING (public.is_staff_member());
CREATE POLICY "board_admin_all"  ON public.staff_board_posts FOR ALL    USING (public.is_admin());

-- LIBRARY EVENTS: public read, admin write
DROP POLICY IF EXISTS "events_public_read" ON public.library_events;
DROP POLICY IF EXISTS "events_admin_all"   ON public.library_events;

CREATE POLICY "events_public_read" ON public.library_events FOR SELECT USING (true);
CREATE POLICY "events_admin_all"   ON public.library_events FOR ALL    USING (public.is_admin());

-- READING PROGRESS: own data or staff
DROP POLICY IF EXISTS "progress_self_access" ON public.reading_progress;

CREATE POLICY "progress_self_access" ON public.reading_progress
  FOR ALL USING (
    member_id IN (SELECT id FROM public.members WHERE email = auth.jwt()->>'email')
    OR public.is_staff_member()
  );

-- USER UPLOADED BOOKS: own data or staff
DROP POLICY IF EXISTS "uploads_self_access" ON public.user_uploaded_books;

CREATE POLICY "uploads_self_access" ON public.user_uploaded_books
  FOR ALL USING (
    member_id IN (SELECT id FROM public.members WHERE email = auth.jwt()->>'email')
    OR public.is_staff_member()
  );


-- ============================================================
-- STEP 8: SEED DEFAULT SITE SETTINGS
-- ============================================================

INSERT INTO public.site_settings (key, value, category) VALUES
  ('library_name',        'Ohara Library',                      'general'),
  ('library_tagline',     'A sanctuary for the discerning reader', 'general'),
  ('contact_email',       'contact@oharalibrary.com',           'general'),
  ('contact_phone',       '',                                   'general'),
  ('library_address',     '',                                   'general'),
  ('copyright_text',      '© 2025 Ohara Library. All rights reserved.', 'general'),
  ('daily_fine_rate',     '0.50',                               'fiscal'),
  ('max_fine_cap',        '20.00',                              'fiscal'),
  ('loan_period_days',    '21',                                 'circulation'),
  ('max_books_per_member','5',                                  'circulation'),
  ('reservation_expiry_days', '3',                              'circulation'),
  ('hero_headline',       'Find the book that''s been waiting for you.', 'hero'),
  ('hero_subtitle',       'Browse 50,000+ titles. Reserve instantly. Your reading journey, organized.', 'hero'),
  ('hero_stats_readers',  '12847',                              'hero'),
  ('hero_stats_rating',   '4.9',                                'hero'),
  ('hero_stats_reviews',  '2340',                               'hero'),
  ('membership_headline', 'Begin your journey.',                'membership'),
  ('membership_subtitle', 'Unlock intelligent cataloging and rediscover the art of your collection.', 'membership'),
  ('membership_cta_text', 'Request Access',                     'membership'),
  ('philosophy_headline', 'Ohara Philosophy',                   'philosophy'),
  ('philosophy_body_1',   'In an era defined by algorithmic noise and infinite scrolling, we built a sanctuary. Ohara is not just a feature; it is a commitment to the preservation of attention.', 'philosophy'),
  ('philosophy_body_2',   'We believe that the act of cataloging one''s library is a form of meditation.', 'philosophy'),
  ('philosophy_body_3',   'There are no notifications here. No social feeds clamoring for your engagement.', 'philosophy'),
  ('footer_newsletter_label', 'Join the Registry',             'footer')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- STEP 9: SEED DEFAULT COLLECTIONS
-- ============================================================

INSERT INTO public.collections (name, description, display_order, is_active) VALUES
  ('The Classics',        'Timeless tales that shaped the world.', 1, true),
  ('Modern Wonders',      'New voices defining our generation.',    2, true),
  ('The Librarian''s Choice', 'Hidden gems found in the stacks.',  3, true)
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- STEP 10: SEED DEFAULT STAFF BOARD POST
-- ============================================================

INSERT INTO public.staff_board_posts (title, content, category, is_pinned) VALUES
  ('Welcome to the Staff Board',
   'This board is managed by admins. Pin announcements, memos, and alerts for the team.',
   'announcement', true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- DONE — run this entire file in Supabase SQL Editor
-- ============================================================
