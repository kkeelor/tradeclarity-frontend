-- Fix ALL triggers that might be causing OAuth failures
-- There are TWO triggers on auth.users that could fail

-- ============================================
-- STEP 1: Check what triggers exist
-- ============================================
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users'
ORDER BY trigger_name;

-- ============================================
-- STEP 2: Disable BOTH triggers
-- ============================================

-- Disable user record trigger
DROP TRIGGER IF EXISTS on_auth_user_created_user_record ON auth.users;

-- Disable subscription trigger (this might be the real culprit!)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================
-- STEP 3: Verify triggers are disabled
-- ============================================
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users'
ORDER BY trigger_name;
-- Should return 0 rows if both triggers are disabled

-- ============================================
-- ALTERNATIVE: Fix subscription trigger with RLS policy
-- ============================================
-- If you want to keep the subscription trigger, add this policy:

-- First check if subscriptions table has RLS
SELECT 
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'subscriptions';

-- Add policy to allow service role (trigger) to insert subscriptions
-- CREATE POLICY IF NOT EXISTS "Allow trigger to create subscriptions" 
-- ON public.subscriptions
-- FOR INSERT
-- WITH CHECK (auth.role() = 'service_role');
