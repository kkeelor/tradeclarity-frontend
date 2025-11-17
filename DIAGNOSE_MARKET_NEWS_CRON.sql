-- Diagnostic queries for market_context_news cron job issue
-- Run these in Supabase SQL Editor to diagnose why cron isn't updating

-- 1. Check if table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'market_context_news'
ORDER BY ordinal_position;

-- 2. Check latest news entries and their dates
-- Using only common columns (published_at may not exist)
SELECT 
    id,
    title,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_ago,
    EXTRACT(EPOCH FROM (NOW() - created_at))/86400 as days_ago
FROM market_context_news
ORDER BY created_at DESC
LIMIT 20;

-- If you want to include published_at (run query 1 first to check if it exists):
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

-- 3. Count news entries by date
SELECT 
    DATE(created_at) as date,
    COUNT(*) as count
FROM market_context_news
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 10;

-- 4. Check for any constraints or indexes that might be blocking inserts
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'market_context_news'::regclass;

-- 5. Check RLS policies on the table
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

-- 6. Check if there are any triggers on the table
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'market_context_news';

-- 7. Check table size and row count
SELECT 
    pg_size_pretty(pg_total_relation_size('market_context_news')) as total_size,
    COUNT(*) as total_rows
FROM market_context_news;
