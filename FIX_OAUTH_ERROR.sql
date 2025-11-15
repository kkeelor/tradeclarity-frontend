-- IMMEDIATE FIX: Run this in Supabase SQL Editor to fix OAuth sign-in errors
-- This disables the problematic trigger that's causing "Database error saving new user"

-- Step 1: Disable the trigger
DROP TRIGGER IF EXISTS on_auth_user_created_user_record ON auth.users;

-- Step 2: Verify it's disabled (should return 0 rows)
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created_user_record';

-- The application code (AuthContext.js and callback route) will handle user creation instead
-- This gives us better error handling and prevents OAuth failures
