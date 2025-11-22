-- Migration: Create MCP tracking tables for monitoring and analytics
-- Created: 2025-01-XX
-- Purpose: Track MCP API usage, cache performance, errors, and key usage

-- Table: mcp_api_usage
-- Tracks every API call made to MCP tools
CREATE TABLE IF NOT EXISTS mcp_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_index INTEGER NOT NULL,
  tool_name TEXT NOT NULL,
  symbol TEXT,
  input_params JSONB,
  success BOOLEAN NOT NULL,
  error_type TEXT,
  error_message TEXT,
  duration_ms INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: mcp_cache_stats
-- Tracks cache hits and misses
CREATE TABLE IF NOT EXISTS mcp_cache_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name TEXT NOT NULL,
  symbol TEXT,
  cache_hit BOOLEAN NOT NULL,
  cache_age_seconds INTEGER,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: mcp_errors
-- Tracks errors with full context
CREATE TABLE IF NOT EXISTS mcp_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  api_key_index INTEGER,
  response_body TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: mcp_key_usage
-- Tracks current usage per API key (updated in real-time)
CREATE TABLE IF NOT EXISTS mcp_key_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_index INTEGER NOT NULL UNIQUE,
  requests_today INTEGER NOT NULL DEFAULT 0,
  last_reset TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mcp_api_usage_timestamp ON mcp_api_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_mcp_api_usage_tool_name ON mcp_api_usage(tool_name);
CREATE INDEX IF NOT EXISTS idx_mcp_api_usage_api_key_index ON mcp_api_usage(api_key_index);
CREATE INDEX IF NOT EXISTS idx_mcp_cache_stats_timestamp ON mcp_cache_stats(timestamp);
CREATE INDEX IF NOT EXISTS idx_mcp_cache_stats_tool_name ON mcp_cache_stats(tool_name);
CREATE INDEX IF NOT EXISTS idx_mcp_errors_timestamp ON mcp_errors(timestamp);
CREATE INDEX IF NOT EXISTS idx_mcp_errors_error_type ON mcp_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_mcp_errors_tool_name ON mcp_errors(tool_name);

-- RLS Policies (if needed - adjust based on your RLS requirements)
-- For now, we'll allow service role to insert/read (admin operations)
-- You may want to add RLS policies if users should see their own usage

-- Function to update key usage (upsert)
CREATE OR REPLACE FUNCTION update_mcp_key_usage(
  p_api_key_index INTEGER,
  p_requests_today INTEGER,
  p_last_reset TIMESTAMPTZ DEFAULT NOW()
)
RETURNS void AS $$
BEGIN
  INSERT INTO mcp_key_usage (api_key_index, requests_today, last_reset, updated_at)
  VALUES (p_api_key_index, p_requests_today, p_last_reset, NOW())
  ON CONFLICT (api_key_index) 
  DO UPDATE SET
    requests_today = p_requests_today,
    last_reset = p_last_reset,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
