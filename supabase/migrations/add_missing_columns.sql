-- Migration: Add missing columns to exchange_connections and trades tables
-- Created: 2025-10-25

-- Add last_synced column to exchange_connections
ALTER TABLE exchange_connections
ADD COLUMN IF NOT EXISTS last_synced TIMESTAMP WITH TIME ZONE;

-- Add missing columns to trades table
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS exchange_connection_id UUID REFERENCES exchange_connections(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS account_type TEXT CHECK (account_type IN ('SPOT', 'FUTURES'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_trades_exchange_connection ON trades(exchange_connection_id);
CREATE INDEX IF NOT EXISTS idx_trades_account_type ON trades(account_type);

-- Add comments for documentation
COMMENT ON COLUMN exchange_connections.last_synced IS 'Timestamp of the last successful data sync from this exchange';
COMMENT ON COLUMN trades.exchange_connection_id IS 'Foreign key linking trade to its exchange connection';
COMMENT ON COLUMN trades.account_type IS 'Type of trading account: SPOT or FUTURES';
