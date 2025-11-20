-- Migration: Create user_analytics_cache table
-- Created: 2025-01-XX
-- Purpose: Cache computed analytics and AI context for Claude API optimization
-- Related: CLAUDE_AI_OPTIMIZATION_STRATEGY.md, ANALYTICS_DATA_FLOW_STRATEGY.md

-- Analytics cache table
CREATE TABLE IF NOT EXISTS user_analytics_cache (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Computed analytics (stored as JSONB)
  -- Contains full analytics object from analyzeData() function
  analytics_data JSONB NOT NULL,
  
  -- Structured context for AI (pre-formatted)
  -- Contains formatted context from formatStructuredContext() function
  ai_context JSONB NOT NULL,
  
  -- Metadata
  total_trades INTEGER NOT NULL DEFAULT 0,
  last_trade_timestamp TIMESTAMP WITH TIME ZONE,
  
  -- Cache management
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour',
  
  -- Hash of trades for cache invalidation
  -- Computed from: trades.map(t => `${t.id}-${t.trade_time}-${t.updated_at}`)
  trades_hash TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_analytics_expires ON user_analytics_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_analytics_user ON user_analytics_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_computed_at ON user_analytics_cache(computed_at DESC);

-- Enable RLS
ALTER TABLE user_analytics_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own analytics cache
CREATE POLICY "Users can view their own analytics cache" ON user_analytics_cache
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own analytics cache (via API)
CREATE POLICY "Users can insert their own analytics cache" ON user_analytics_cache
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own analytics cache (via API)
CREATE POLICY "Users can update their own analytics cache" ON user_analytics_cache
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own analytics cache
CREATE POLICY "Users can delete their own analytics cache" ON user_analytics_cache
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_analytics_cache_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_analytics_cache_updated_at
  BEFORE UPDATE ON user_analytics_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_user_analytics_cache_timestamp();

-- Comments for documentation
COMMENT ON TABLE user_analytics_cache IS 'Caches computed analytics and AI context for Claude API optimization';
COMMENT ON COLUMN user_analytics_cache.analytics_data IS 'Full analytics object from analyzeData() function';
COMMENT ON COLUMN user_analytics_cache.ai_context IS 'Pre-formatted context from formatStructuredContext() for Claude API';
COMMENT ON COLUMN user_analytics_cache.trades_hash IS 'SHA256 hash of trades for cache invalidation - recompute if hash changes';
COMMENT ON COLUMN user_analytics_cache.expires_at IS 'Cache expires after 1 hour - refresh if hash matches, recompute if hash differs';
