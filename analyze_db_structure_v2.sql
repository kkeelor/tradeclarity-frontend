-- TradeClarity Database Structure Analysis Query v2
-- Simple, safe query that only uses standard PostgreSQL information_schema
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: List ALL tables
-- ============================================================================
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================================================
-- STEP 2: Get EVERY column from EVERY table
-- ============================================================================
SELECT
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
