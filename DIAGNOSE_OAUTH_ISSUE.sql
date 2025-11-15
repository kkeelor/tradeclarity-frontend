-- Comprehensive OAuth Issue Diagnosis
-- Run this in Supabase SQL Editor to check database state

-- ============================================
-- 1. CHECK TRIGGERS ON auth.users
-- ============================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users'
ORDER BY trigger_name;

-- ============================================
-- 2. CHECK IF handle_new_user FUNCTION EXISTS
-- ============================================
SELECT 
    proname AS function_name,
    prosrc AS function_body,
    pg_get_functiondef(oid) AS full_definition
FROM pg_proc
WHERE proname = 'handle_new_user';

-- ============================================
-- 3. CHECK users TABLE STRUCTURE
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;

-- ============================================
-- 4. CHECK RLS POLICIES ON users TABLE
-- ============================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users';

-- ============================================
-- 5. CHECK IF RLS IS ENABLED ON users TABLE
-- ============================================
SELECT 
    schemaname,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'users';

-- ============================================
-- 6. CHECK RECENT USER CREATIONS (last 24 hours)
-- ============================================
SELECT 
    id,
    email,
    created_at,
    auth_provider,
    email_verified
FROM public.users
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 7. CHECK FOR AUTH USERS WITHOUT users TABLE RECORDS
-- ============================================
-- Note: app_metadata is not directly accessible in regular queries
-- This query checks for auth users and their corresponding user records
SELECT 
    au.id AS auth_user_id,
    au.email AS auth_email,
    au.created_at AS auth_created_at,
    CASE WHEN u.id IS NULL THEN 'MISSING' ELSE 'EXISTS' END AS users_table_status,
    u.created_at AS user_record_created_at
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE au.created_at > NOW() - INTERVAL '24 hours'
ORDER BY au.created_at DESC
LIMIT 10;

-- ============================================
-- 8. CHECK FOR ERRORS IN FUNCTION EXECUTION
-- ============================================
-- Note: This checks PostgreSQL logs if accessible
-- You may need to check Supabase dashboard logs instead

-- ============================================
-- 9. CHECK SUBSCRIPTION TRIGGER (might conflict)
-- ============================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users'
AND trigger_name LIKE '%subscription%';

-- ============================================
-- 10. CHECK ALL FUNCTIONS THAT REFERENCE users TABLE
-- ============================================
SELECT DISTINCT
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_depend d ON p.oid = d.objid
JOIN pg_rewrite r ON d.refobjid = r.oid
JOIN pg_class c ON r.ev_class = c.oid
WHERE c.relname = 'users'
AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY p.proname;
