-- Quick Database Check - Run this first for a quick overview
-- This shows the most important information quickly

-- ============================================
-- QUICK OVERVIEW: All Tables
-- ============================================
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.tablename AND table_schema = 'public') AS column_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- CHECK: Does csv_uploads table exist?
-- ============================================
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'csv_uploads'
) AS csv_uploads_exists;

-- If csv_uploads exists, show its structure:
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'csv_uploads'
ORDER BY ordinal_position;

-- ============================================
-- FULL COLUMN DETAILS FOR csv_uploads (with all info)
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'csv_uploads'
ORDER BY ordinal_position;

-- ============================================
-- CHECK: exchange_connections table structure
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'exchange_connections'
ORDER BY ordinal_position;

-- ============================================
-- CHECK: trades table structure
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'trades'
ORDER BY ordinal_position;

-- ============================================
-- CHECK: Foreign keys involving csv_uploads
-- ============================================
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND (tc.table_name = 'csv_uploads' OR ccu.table_name = 'csv_uploads')
ORDER BY tc.table_name, kcu.column_name;
