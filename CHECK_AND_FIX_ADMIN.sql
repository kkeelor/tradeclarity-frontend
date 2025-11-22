-- Step 1: Check current status of kkeelor@gmail.com
SELECT 
  id,
  email,
  role,
  COALESCE(role, 'NULL') as role_status,
  created_at,
  last_login
FROM users
WHERE email = 'kkeelor@gmail.com';

-- Step 2: Check if user exists in auth.users (to get the correct ID)
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE email = 'kkeelor@gmail.com';

-- Step 3: Set role to admin (run this if role is NULL or 'user')
UPDATE users
SET role = 'admin'
WHERE email = 'kkeelor@gmail.com'
RETURNING id, email, role;

-- Step 4: Verify the update worked
SELECT 
  id,
  email,
  role,
  created_at
FROM users
WHERE email = 'kkeelor@gmail.com';

-- Step 5: Check all admin users
SELECT 
  id,
  email,
  role,
  created_at
FROM users
WHERE role = 'admin'
ORDER BY created_at DESC;

-- Step 6: If UPDATE didn't work, check if user record exists
-- If no rows returned, the user record might not exist in users table
SELECT COUNT(*) as user_exists
FROM users
WHERE email = 'kkeelor@gmail.com';

-- Step 7: If user doesn't exist in users table, create it manually
-- First get the auth user ID:
-- SELECT id FROM auth.users WHERE email = 'kkeelor@gmail.com';
-- Then insert (replace YOUR_AUTH_USER_ID with actual ID):
/*
INSERT INTO users (id, email, role, created_at, last_login)
SELECT 
  id,
  email,
  'admin' as role,
  created_at,
  NOW()
FROM auth.users
WHERE email = 'kkeelor@gmail.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin';
*/
