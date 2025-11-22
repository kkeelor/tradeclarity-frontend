-- Check if user is admin
-- Replace 'kkeelor@gmail.com' with your email if different

-- Check user role
SELECT 
  id,
  email,
  role,
  created_at,
  last_login
FROM users
WHERE email = 'kkeelor@gmail.com';

-- Check all admin users
SELECT 
  id,
  email,
  role,
  created_at,
  last_login
FROM users
WHERE role = 'admin';

-- Check if role column exists and its constraints
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name = 'role';

-- Check role constraint
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass
  AND conname LIKE '%role%';
