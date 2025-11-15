-- Simplified OAuth Issue Diagnosis
-- Run these queries one at a time in Supabase SQL Editor

-- ============================================
-- 1. CHECK IF TRIGGER EXISTS (Most Important)
-- ============================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users'
ORDER BY trigger_name;

-- ============================================
-- 2. CHECK users TABLE STRUCTURE
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;

-- ============================================
-- 3. CHECK RLS POLICIES ON users TABLE
-- ============================================
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users';

-- ============================================
-- 4. CHECK IF RLS IS ENABLED
-- ============================================
SELECT 
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'users';

-- ============================================
-- 5. CHECK RECENT USER CREATIONS (last 24 hours)
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
-- 6. CHECK FOR AUTH USERS WITHOUT users TABLE RECORDS
-- ============================================
SELECT 
    au.id AS auth_user_id,
    au.email AS auth_email,
    au.created_at AS auth_created_at,
    CASE WHEN u.id IS NULL THEN 'MISSING' ELSE 'EXISTS' END AS users_table_status
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE au.created_at > NOW() - INTERVAL '24 hours'
ORDER BY au.created_at DESC
LIMIT 10;
