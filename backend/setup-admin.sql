-- ============================================================
-- ADMIN USER SETUP
-- ============================================================
-- Run this in Supabase SQL Editor to set up admin access
-- Replace the email and UUID with your actual values
-- ============================================================

-- Step 1: Update auth user metadata to add admin role
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'barnababobbili098@gmail.com';

-- Step 2: Create staff record for admin access
INSERT INTO public.staff (
    staff_id,
    supabase_uid,
    name,
    email,
    password_hash,
    role,
    department,
    status,
    hired_date
) VALUES (
    'ADMIN001',
    '4d113efb-7459-44f3-8605-070fdd1ccc8f',  -- Your Supabase UID
    'Barnaba Bobbili',
    'barnababobbili098@gmail.com',
    '',  -- Empty since using Supabase Auth
    'admin',
    'Administration',
    'active',
    CURRENT_DATE
);

-- Step 3: Verify the setup
SELECT 
    u.email,
    u.raw_user_meta_data->>'role' as jwt_role,
    s.staff_id,
    s.name,
    s.role as staff_role,
    s.status
FROM auth.users u
LEFT JOIN public.staff s ON s.supabase_uid = u.id
WHERE u.email = 'barnababobbili098@gmail.com';

-- Expected output:
-- email: barnababobbili098@gmail.com
-- jwt_role: admin
-- staff_id: ADMIN001
-- name: Barnaba Bobbili
-- staff_role: admin
-- status: active
