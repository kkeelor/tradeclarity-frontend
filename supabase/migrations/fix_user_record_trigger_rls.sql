-- Migration: Fix user record trigger to work with RLS
-- This ensures the trigger can create user records even with RLS enabled

-- First, ensure the users table has proper RLS policies for the trigger
-- The trigger uses SECURITY DEFINER, but we need to ensure policies allow inserts

-- Check if users table exists and has RLS enabled
-- If RLS is blocking the trigger, we need to add a policy or disable RLS for trigger operations

-- Option 1: Add a policy that allows the trigger function to insert users
-- This policy allows service role (which SECURITY DEFINER functions run as) to insert
DO $$
BEGIN
  -- Check if policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Allow trigger to create users'
  ) THEN
    -- Create policy that allows service role to insert (for trigger)
    EXECUTE 'CREATE POLICY "Allow trigger to create users" ON public.users
      FOR INSERT
      WITH CHECK (auth.role() = ''service_role'');';
  END IF;
END $$;

-- Option 2: Improve the trigger function to handle errors gracefully
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Wrap in exception handling so trigger failures don't prevent auth user creation
  BEGIN
    INSERT INTO public.users (
      id,
      email,
      name,
      auth_provider,
      email_verified,
      google_id,
      created_at,
      last_login
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        SPLIT_PART(NEW.email, '@', 1)
      ),
      COALESCE(
        NEW.raw_user_meta_data->>'auth_provider',
        CASE 
          WHEN NEW.app_metadata->>'provider' = 'google' THEN 'google'
          WHEN NEW.app_metadata->>'provider' = 'email' THEN 'email'
          ELSE 'email'
        END
      ),
      COALESCE((NEW.email_confirmed_at IS NOT NULL), false),
      NEW.raw_user_meta_data->>'sub',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING; -- Prevent duplicate inserts if record already exists
    
  EXCEPTION
    WHEN unique_violation THEN
      -- Record already exists - this is fine
      RAISE WARNING 'User record already exists for user %, skipping', NEW.id;
    WHEN insufficient_privilege THEN
      -- RLS or permission issue - log but don't fail
      RAISE WARNING 'Permission denied creating user record for user %: %', NEW.id, SQLERRM;
    WHEN OTHERS THEN
      -- Catch any other errors and log them, but don't fail the trigger
      -- This ensures auth user creation succeeds even if users table insert fails
      RAISE WARNING 'Error creating user record for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created_user_record ON auth.users;
CREATE TRIGGER on_auth_user_created_user_record
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Comment for documentation
COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates a user record in the users table when a new user is created in auth.users. Includes comprehensive error handling to prevent trigger failures from blocking user creation. Application code (AuthContext.js and callback route) will handle user creation if trigger fails.';
