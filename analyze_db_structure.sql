-- TradeClarity Database Structure Analysis Query
-- Run this in Supabase SQL Editor to get complete DB information
-- This will help understand data formats, relationships, and structure

-- ============================================================================
-- SECTION 1: All Tables and Their Columns
-- ============================================================================
SELECT
  '=== TABLE STRUCTURES ===' as section,
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name NOT LIKE 'pg_%'
  AND table_name NOT LIKE 'sql_%'
ORDER BY table_name, ordinal_position;

-- ============================================================================
-- SECTION 2: Primary Keys and Unique Constraints
-- ============================================================================
SELECT
  '=== PRIMARY KEYS & CONSTRAINTS ===' as section,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
ORDER BY tc.table_name, tc.constraint_type;

-- ============================================================================
-- SECTION 3: Foreign Key Relationships
-- ============================================================================
SELECT
  '=== FOREIGN KEY RELATIONSHIPS ===' as section,
  tc.table_name as from_table,
  kcu.column_name as from_column,
  ccu.table_name AS to_table,
  ccu.column_name AS to_column,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================================================
-- SECTION 4: Indexes
-- ============================================================================
SELECT
  '=== INDEXES ===' as section,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- SECTION 5: Table Row Counts
-- ============================================================================
SELECT
  '=== TABLE ROW COUNTS ===' as section,
  schemaname,
  relname as table_name,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- ============================================================================
-- SECTION 6: Sample Data from Critical Tables (with data format examples)
-- ============================================================================

-- Users table (if exists)
SELECT '=== USERS SAMPLE ===' as section, * FROM users LIMIT 2;

-- Subscriptions
SELECT '=== SUBSCRIPTIONS SAMPLE ===' as section, * FROM subscriptions LIMIT 2;

-- Trades table (CRITICAL - to see winRate format!)
SELECT '=== TRADES SAMPLE ===' as section, * FROM trades LIMIT 5;

-- Analytics table (CRITICAL - to see analytics.winRate format!)
SELECT '=== ANALYTICS SAMPLE ===' as section, * FROM analytics LIMIT 3;

-- AI Conversations
SELECT '=== AI_CONVERSATIONS SAMPLE ===' as section, * FROM ai_conversations LIMIT 3;

-- Any other analytics/stats tables
SELECT
  '=== ALL TABLE NAMES ===' as section,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================================================
-- SECTION 7: Specific Analytics Data Format Check
-- ============================================================================

-- Check if analytics table exists and what columns it has
SELECT
  '=== ANALYTICS COLUMNS ===' as section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'analytics'
ORDER BY ordinal_position;

-- Sample analytics with focus on winRate format
SELECT
  '=== WIN_RATE FORMAT CHECK ===' as section,
  user_id,
  win_rate,
  profit_factor,
  total_pnl,
  total_trades,
  winning_trades,
  losing_trades,
  -- Calculate expected percentage to compare
  CASE
    WHEN total_trades > 0 THEN (winning_trades::float / total_trades::float) * 100
    ELSE 0
  END as calculated_win_rate_percentage,
  -- Show if current win_rate matches calculated percentage or decimal
  CASE
    WHEN win_rate IS NULL THEN 'NULL'
    WHEN win_rate >= 0 AND win_rate <= 1 THEN 'DECIMAL (0-1)'
    WHEN win_rate > 1 AND win_rate <= 100 THEN 'PERCENTAGE (0-100)'
    ELSE 'OUT_OF_RANGE'
  END as win_rate_format_detected
FROM analytics
WHERE total_trades > 0
LIMIT 10;

-- ============================================================================
-- SECTION 8: Trade Stats / Aggregation Tables
-- ============================================================================

-- Check for any trade_stats or similar tables
SELECT
  '=== TRADE STATS TABLES ===' as section,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name ILIKE '%stat%' OR table_name ILIKE '%aggregate%' OR table_name ILIKE '%summary%')
ORDER BY table_name;

-- ============================================================================
-- SECTION 9: Recent Migrations Applied
-- ============================================================================

-- Check if you have a migrations tracking table
SELECT
  '=== MIGRATION HISTORY ===' as section,
  *
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 20;

-- ============================================================================
-- SECTION 10: AI-Related Tables Structure
-- ============================================================================

-- Get detailed info on ai_conversations
SELECT
  '=== AI_CONVERSATIONS STRUCTURE ===' as section,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ai_conversations'
ORDER BY ordinal_position;

-- Check for ai_messages or ai_summaries tables
SELECT
  '=== AI RELATED TABLES ===' as section,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name ILIKE '%ai%'
ORDER BY table_name;

-- ============================================================================
-- END OF ANALYSIS
-- ============================================================================

SELECT '=== ANALYSIS COMPLETE ===' as final_message;
