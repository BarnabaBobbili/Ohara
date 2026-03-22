-- ============================================================
-- FIX ADMIN ACCESS - Add role column to members table
-- ============================================================
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Add role column to members table (if not exists)
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS role VARCHAR(30) NOT NULL DEFAULT 'member';

-- Step 2: Create index for role column
CREATE INDEX IF NOT EXISTS idx_members_role ON public.members (role);

-- Step 3: Make your user an admin
UPDATE public.members 
SET role = 'admin'
WHERE email = 'barnababobbili098@gmail.com';

-- Step 4: Verify
SELECT id, card_id, name, email, role, status 
FROM public.members 
WHERE email = 'barnababobbili098@gmail.com';

-- Expected output:
-- role should now be 'admin'
