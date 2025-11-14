-- Migration: Create csv_uploads table
-- Created: 2025-01-XX

CREATE TABLE IF NOT EXISTS csv_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  label TEXT,
  account_type TEXT NOT NULL CHECK (account_type IN ('SPOT', 'FUTURES', 'BOTH')),
  exchange_connection_id UUID REFERENCES exchange_connections(id) ON DELETE SET NULL,
  exchange TEXT, -- For "Other" exchanges not linked to a connection
  size BIGINT NOT NULL,
  trades_count INTEGER DEFAULT 0,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_csv_uploads_user_id ON csv_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_csv_uploads_exchange_connection_id ON csv_uploads(exchange_connection_id);
CREATE INDEX IF NOT EXISTS idx_csv_uploads_uploaded_at ON csv_uploads(uploaded_at DESC);

-- Add comments for documentation
COMMENT ON TABLE csv_uploads IS 'Stores metadata about CSV files uploaded by users';
COMMENT ON COLUMN csv_uploads.exchange_connection_id IS 'Foreign key linking to exchange_connections table (null for "Other" exchanges)';
COMMENT ON COLUMN csv_uploads.exchange IS 'Exchange name (used for "Other" exchanges or as reference when connection exists)';
