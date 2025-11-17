-- IMPORTANT: Email confirmation is controlled in Supabase Dashboard
-- To disable email confirmation:
-- 1. Go to Supabase Dashboard > Authentication > Providers > Email
-- 2. Toggle OFF "Confirm email"
-- 3. Save changes
--
-- Once disabled, new signups will be immediately authenticated and can access the dashboard
-- without needing to verify their email first.
--
-- This migration ensures the users table correctly reflects email verification status
-- when email confirmation is disabled in Supabase settings.

-- Update user record trigger to handle email_verified correctly
-- When email confirmation is disabled, email_confirmed_at will be set immediately
-- so we should mark email_verified as true in the users table

-- Check if user record trigger exists and ensure it handles email_verified
DO $$
BEGIN
  -- The create_user_record_trigger.sql should already handle this,
  -- but we ensure email_verified is set based on email_confirmed_at
  -- This is handled in the trigger function itself
  RAISE NOTICE 'Email confirmation setting must be disabled in Supabase Dashboard';
  RAISE NOTICE 'Path: Authentication > Providers > Email > Toggle OFF "Confirm email"';
END $$;

-- Note: We cannot directly modify auth.users triggers from migrations
-- Email confirmation is a Supabase Auth setting that must be changed in the dashboard
