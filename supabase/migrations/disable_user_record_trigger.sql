-- Migration: Disable automatic user record trigger
-- This disables the trigger that automatically creates user records
-- User creation will be handled by application code instead for better error handling
-- 
-- WHY: The trigger was causing "Database error saving new user" during OAuth sign-in
--      This prevents new users from signing in. By disabling the trigger and handling
--      user creation in application code, we have better error handling and control.

-- Drop the trigger (but keep the function in case we need it later)
DROP TRIGGER IF EXISTS on_auth_user_created_user_record ON auth.users;

-- Comment explaining why it's disabled
COMMENT ON FUNCTION handle_new_user() IS 'Function disabled - user record creation is now handled by application code (AuthContext.js and callback route) for better error handling and control. The trigger was causing OAuth sign-in failures.';
