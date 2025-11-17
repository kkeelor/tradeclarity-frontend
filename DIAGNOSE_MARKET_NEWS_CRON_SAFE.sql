-- Diagnostic queries for market_context_news cron job issue
-- Run these queries ONE AT A TIME in Supabase SQL Editor
-- Start with query 1 to see what columns exist, then run the others

-- ============================================
-- QUERY 1: Check table structure (RUN THIS FIRST)
-- ============================================
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'market_context_news'
ORDER BY ordinal_position;

-- ============================================
-- QUERY 2: Check latest news entries and their dates
-- ============================================
-- This query uses only common columns that should exist
SELECT 
    id,
    title,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_ago,
    EXTRACT(EPOCH FROM (NOW() - created_at))/86400 as days_ago
FROM market_context_news
ORDER BY created_at DESC
LIMIT 20;

-- If published_at exists, use this instead:
-- SELECT 
--     id,
--     title,
--     published_at,
--     created_at,
--     EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_ago,
--     EXTRACT(EPOCH FROM (NOW() - created_at))/86400 as days_ago
-- FROM market_context_news
-- ORDER BY created_at DESC
-- LIMIT 20;

-- ============================================
-- QUERY 3: Count news entries by date
-- ============================================
SELECT 
    DATE(created_at) as date,
    COUNT(*) as count
FROM market_context_news
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 10;

-- ============================================
-- QUERY 4: Check for constraints that might block inserts
-- ============================================
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'market_context_news'::regclass;

-- ============================================
-- QUERY 5: Check RLS policies (CRITICAL - might be blocking inserts!)
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
WHERE tablename = 'market_context_news';

-- ============================================
-- QUERY 6: Check triggers on the table
-- ============================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'market_context_news';

-- ============================================
-- QUERY 7: Check table size and row count
-- ============================================
SELECT 
    pg_size_pretty(pg_total_relation_size('market_context_news')) as total_size,
    COUNT(*) as total_rows
FROM market_context_news;

-- ============================================
-- QUERY 8: Check most recent entry details
-- ============================================
SELECT 
    *,
    EXTRACT(EPOCH FROM (NOW() - created_at))/86400 as days_ago
FROM market_context_news
ORDER BY created_at DESC
LIMIT 1;
