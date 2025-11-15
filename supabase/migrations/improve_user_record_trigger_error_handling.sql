-- Migration: Improve user record trigger error handling
-- This makes the trigger more robust by catching errors and logging them
-- without preventing user creation in auth.users

-- Function to create user record when auth user is created
-- Improved version with error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to insert user record with data from auth.users
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
    
    -- If insert succeeds, log success (optional, can be removed in production)
    -- RAISE NOTICE 'User record created successfully for user %', NEW.id;
    
  EXCEPTION
    WHEN unique_violation THEN
      -- Record already exists (from a previous attempt or race condition)
      -- This is fine, just continue
      RAISE WARNING 'User record already exists for user %, skipping insert', NEW.id;
    WHEN OTHERS THEN
      -- Catch any other errors and log them, but don't fail the trigger
      -- This ensures auth user creation succeeds even if users table insert fails
      RAISE WARNING 'Error creating user record for user %: %', NEW.id, SQLERRM;
      -- Log to a table if you have one, or just continue
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment for documentation
COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates a user record in the users table when a new user is created in auth.users. Includes error handling to prevent trigger failures from blocking user creation.';
