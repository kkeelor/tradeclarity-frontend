-- Check if new entries were inserted after manual cron run
-- Run this to see the latest entries

-- Latest 5 entries with timestamps
SELECT 
    id,
    title,
    created_at,
    fetched_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_ago,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago
FROM market_context_news
ORDER BY created_at DESC
LIMIT 5;

-- Count entries by date (should show Nov 17 if cron worked)
SELECT 
    DATE(created_at) as date,
    DATE(fetched_at) as fetched_date,
    COUNT(*) as count
FROM market_context_news
GROUP BY DATE(created_at), DATE(fetched_at)
ORDER BY date DESC
LIMIT 10;

-- Check if any entries from today (Nov 17)
SELECT 
    COUNT(*) as entries_today,
    MIN(created_at) as earliest_today,
    MAX(created_at) as latest_today
FROM market_context_news
WHERE DATE(created_at) = CURRENT_DATE;
