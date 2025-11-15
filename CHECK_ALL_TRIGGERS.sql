-- Check ALL triggers on auth.users table
-- There might be multiple triggers causing issues

SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users'
ORDER BY trigger_name;

-- Check all functions that might be triggered
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
WHERE p.proname IN ('handle_new_user', 'create_default_subscription')
ORDER BY p.proname;
