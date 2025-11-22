-- Migration: Add role column to users table for admin access control
-- Created: 2025-01-XX
-- Purpose: Enable role-based access control (RBAC) for admin features

-- Add role column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'viewer'));

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Add comment for documentation
COMMENT ON COLUMN users.role IS 'User role: user (default), admin (full access), viewer (read-only access)';

-- Note: After running this migration, manually set admin users:
-- UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
