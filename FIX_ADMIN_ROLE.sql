-- Fix admin role for kkeelor@gmail.com
-- Run this to set yourself as admin

-- First, check current status
SELECT 
  id,
  email,
  role,
  created_at
FROM users
WHERE email = 'kkeelor@gmail.com';

-- Set role to admin
UPDATE users
SET role = 'admin'
WHERE email = 'kkeelor@gmail.com';

-- Verify the update
SELECT 
  id,
  email,
  role,
  created_at
FROM users
WHERE email = 'kkeelor@gmail.com';

-- If the above doesn't work, try by user ID (get ID from auth.users first)
-- First, find the user ID:
-- SELECT id, email FROM auth.users WHERE email = 'kkeelor@gmail.com';

-- Then update by ID:
-- UPDATE users
-- SET role = 'admin'
-- WHERE id = 'YOUR_USER_ID_HERE';

-- Check all admin users
SELECT 
  id,
  email,
  role,
  created_at,
  last_login
FROM users
WHERE role = 'admin'
ORDER BY created_at DESC;
