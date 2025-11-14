-- Migration: Add exchange column to csv_uploads table
-- This allows storing exchange name for "Other" exchanges not linked to a connection
-- Created: 2025-01-XX

-- Add exchange column (nullable, for "Other" exchanges)
ALTER TABLE csv_uploads
ADD COLUMN IF NOT EXISTS exchange TEXT;

-- Add comment for documentation
COMMENT ON COLUMN csv_uploads.exchange IS 'Exchange name (used for "Other" exchanges or as reference when connection exists)';

-- Optional: Add index if you'll be querying by exchange name frequently
-- CREATE INDEX IF NOT EXISTS idx_csv_uploads_exchange ON csv_uploads(exchange);
