-- Refresh Analytics Cache - SQL Commands
-- Use these SQL commands in Supabase SQL Editor to delete cache and force recomputation
-- Related: CLAUDE_AI_IMPLEMENTATION_PLAN.md

-- ============================================================================
-- OPTION 1: Delete cache for your specific user by email
-- ============================================================================
-- Replace 'your-email@example.com' with your actual email address

DELETE FROM user_analytics_cache 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email = 'your-email@example.com'
);

-- ============================================================================
-- OPTION 2: Find your user ID first, then delete cache
-- ============================================================================

-- Step 1: Find your user ID
SELECT id, email 
FROM auth.users 
WHERE email = 'your-email@example.com';

-- Step 2: Delete cache using the user_id from Step 1
-- Replace 'YOUR_USER_ID' with the UUID from Step 1
DELETE FROM user_analytics_cache 
WHERE user_id = 'YOUR_USER_ID';

-- ============================================================================
-- OPTION 3: Delete all caches (use with caution - affects all users!)
-- ============================================================================

DELETE FROM user_analytics_cache;

-- ============================================================================
-- VERIFICATION: Check if cache exists after deletion
-- ============================================================================

-- Check cache status for your user
SELECT 
  user_id, 
  total_trades, 
  computed_at, 
  expires_at,
  last_trade_timestamp
FROM user_analytics_cache 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email = 'your-email@example.com'
);

-- If this returns no rows, cache is deleted and will be recomputed on next request

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. After deleting the cache, the next request will automatically trigger
--    recomputation with the new portfolio data included
-- 2. Cache will be recomputed when you:
--    - Load the Dashboard page
--    - Send a message to AI Chat
--    - Visit the Analytics page
-- 3. The recomputation includes:
--    - Trade analytics
--    - Portfolio/holdings data (NEW!)
--    - AI context formatting
-- 4. Cache expires after 1 hour, but you can force refresh anytime with this SQL
