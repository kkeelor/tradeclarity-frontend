-- Check RLS Policies on users table
-- Run this to see what policies currently exist

SELECT 
    policyname AS policy_name,
    cmd AS command,
    roles,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
ORDER BY policyname;

-- Also check if there are any policies that allow INSERT
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN cmd = 'INSERT' THEN '✅ Allows INSERT'
        WHEN cmd = 'ALL' THEN '✅ Allows ALL (including INSERT)'
        ELSE '❌ Does not allow INSERT'
    END AS insert_status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
AND (cmd = 'INSERT' OR cmd = 'ALL');
