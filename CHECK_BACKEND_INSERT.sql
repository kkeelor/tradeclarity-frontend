-- Test if service role can insert into market_context_news
-- Run this in Supabase SQL Editor with service role credentials
-- This will help verify if RLS is blocking inserts

-- Test insert with unique URL
INSERT INTO market_context_news (
    title,
    url,
    source,
    published_at,
    query_type,
    fetched_at,
    created_at
) VALUES (
    'Test Article - ' || NOW()::text,
    'https://example.com/test-' || gen_random_uuid()::text,
    'Test Source',
    NOW(),
    'crypto',
    NOW(),
    NOW()
) RETURNING id, title, created_at;

-- If successful, delete the test entry
-- DELETE FROM market_context_news WHERE source = 'Test Source';
