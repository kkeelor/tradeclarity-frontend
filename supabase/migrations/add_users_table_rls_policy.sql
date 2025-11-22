-- Migration: Add RLS policy to allow users to read their own record from users table
-- Created: 2025-01-XX
-- Purpose: Enable users to query their own role and profile data

-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own record
-- This allows users to query their own role, email, and other profile data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Users can view their own record'
  ) THEN
    CREATE POLICY "Users can view their own record" ON users
      FOR SELECT 
      USING (auth.uid() = id);
  END IF;
END $$;

-- Policy: Users can update their own record (for profile updates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Users can update their own record'
  ) THEN
    CREATE POLICY "Users can update their own record" ON users
      FOR UPDATE 
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Comment for documentation
COMMENT ON POLICY "Users can view their own record" ON users IS 
  'Allows authenticated users to read their own user record, including role, email, and profile data. Required for role-based access control checks.';
