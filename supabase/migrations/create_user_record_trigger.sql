-- Migration: Create trigger to automatically create user records
-- This ensures that whenever a user is created in auth.users, a corresponding
-- record is created in the users table with proper data, preventing empty records.

-- Function to create user record when auth user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user record with data from auth.users
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user record when auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created_user_record ON auth.users;
CREATE TRIGGER on_auth_user_created_user_record
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Comment for documentation
COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates a user record in the users table when a new user is created in auth.users. Prevents empty user records.';
