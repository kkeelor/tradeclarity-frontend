-- Fix RLS Policy for OAuth User Creation
-- The trigger fails because RLS is enabled but no policy allows inserts

-- ============================================
-- OPTION 1: Add policy to allow trigger inserts (RECOMMENDED)
-- ============================================
-- This allows the trigger function (running as service_role) to insert user records

-- Check existing policies first
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users';

-- Add policy to allow service role (trigger) to insert users
-- This policy allows the trigger function to create user records
CREATE POLICY IF NOT EXISTS "Allow trigger to create users" 
ON public.users
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- OPTION 2: Disable RLS on users table (Alternative)
-- ============================================
-- Only use this if you don't need RLS for other operations
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- ============================================
-- OPTION 3: Disable the trigger entirely (Safest)
-- ============================================
-- This is the safest option - let application code handle user creation
DROP TRIGGER IF EXISTS on_auth_user_created_user_record ON auth.users;
