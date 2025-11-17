-- Migration: Remove individual messages table, keep only conversation summaries
-- Created: 2025-01-XX
-- This migration removes the messages table and updates conversations to store summaries only
-- This is essential for free tier database limits - we only store conversation summaries, not individual messages

-- Step 1: Drop triggers that depend on messages table
DROP TRIGGER IF EXISTS update_conversation_on_message ON ai_messages;
DROP TRIGGER IF EXISTS update_conversation_token_counts ON ai_messages;

-- Step 2: Drop functions that depend on messages table
DROP FUNCTION IF EXISTS update_conversation_timestamp();
DROP FUNCTION IF EXISTS update_conversation_token_counts();

-- Step 3: Drop the messages table entirely
DROP TABLE IF EXISTS ai_messages CASCADE;

-- Step 4: Update conversations table structure
-- Remove compression-related columns (no longer needed since we only store summaries)
ALTER TABLE ai_conversations 
  DROP COLUMN IF EXISTS is_compressed,
  DROP COLUMN IF EXISTS compressed_at,
  DROP COLUMN IF EXISTS original_message_count;

-- Keep summary column (this is what we'll store)
-- Keep token tracking (useful for cost monitoring)
-- Keep timestamps for sorting

-- Step 5: Add new columns for better summary management
ALTER TABLE ai_conversations
  ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0, -- Number of messages in this conversation (for reference)
  ADD COLUMN IF NOT EXISTS last_summarized_at TIMESTAMP WITH TIME ZONE; -- When summary was last updated

-- Step 6: Update comments
COMMENT ON TABLE ai_conversations IS 'Stores AI chat conversations - only summaries are saved, not individual messages';
COMMENT ON COLUMN ai_conversations.summary IS 'Complete summary of the conversation - this is what gets loaded for context in future chats';
COMMENT ON COLUMN ai_conversations.message_count IS 'Total number of messages that were in this conversation (for analytics)';
COMMENT ON COLUMN ai_conversations.last_summarized_at IS 'Timestamp when the conversation was last summarized';

-- Step 7: Create index for loading user's conversation summaries efficiently
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_updated ON ai_conversations(user_id, updated_at DESC);

-- Note: Individual messages are kept in memory during active chat sessions only
-- When conversation ends (timeout, user closes, or after N exchanges), summary is generated and saved
-- This dramatically reduces database storage requirements
