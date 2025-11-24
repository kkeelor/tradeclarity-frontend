-- Snaptrade Database Schema
-- Run this SQL in your Supabase SQL editor to create the snaptrade_users table

-- Table to store Snaptrade user credentials (1:1 with TradeClarity users)
CREATE TABLE IF NOT EXISTS snaptrade_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snaptrade_user_id TEXT NOT NULL UNIQUE, -- The userId used in Snaptrade (usually email)
  user_secret_encrypted TEXT NOT NULL, -- Encrypted userSecret from Snaptrade
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- One Snaptrade user per TradeClarity user
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_snaptrade_users_user_id ON snaptrade_users(user_id);
CREATE INDEX IF NOT EXISTS idx_snaptrade_users_snaptrade_user_id ON snaptrade_users(snaptrade_user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE snaptrade_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read/update their own Snaptrade data
CREATE POLICY "Users can view their own Snaptrade data"
  ON snaptrade_users
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Snaptrade data"
  ON snaptrade_users
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Snaptrade data"
  ON snaptrade_users
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Note: For Snaptrade brokerage accounts, we can use the existing exchange_connections table
-- with exchange='snaptrade' and store the Snaptrade account_id in a metadata field
-- OR create a separate snaptrade_accounts table if more structure is needed

-- Optional: Table for Snaptrade brokerage accounts (if you want more structure)
-- This allows tracking individual brokerage connections separately
CREATE TABLE IF NOT EXISTS snaptrade_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snaptrade_user_id TEXT NOT NULL REFERENCES snaptrade_users(snaptrade_user_id) ON DELETE CASCADE,
  account_id TEXT NOT NULL, -- Snaptrade account UUID
  brokerage_authorization TEXT, -- Snaptrade brokerage authorization ID
  account_name TEXT,
  institution_name TEXT,
  account_number TEXT,
  portfolio_group TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced TIMESTAMPTZ,
  UNIQUE(user_id, account_id) -- One account per user
);

-- Indexes for snaptrade_accounts
CREATE INDEX IF NOT EXISTS idx_snaptrade_accounts_user_id ON snaptrade_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_snaptrade_accounts_account_id ON snaptrade_accounts(account_id);

-- Enable RLS for snaptrade_accounts
ALTER TABLE snaptrade_accounts ENABLE ROW LEVEL SECURITY;

-- Policies for snaptrade_accounts
CREATE POLICY "Users can view their own Snaptrade accounts"
  ON snaptrade_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Snaptrade accounts"
  ON snaptrade_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Snaptrade accounts"
  ON snaptrade_accounts
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Snaptrade accounts"
  ON snaptrade_accounts
  FOR DELETE
  USING (auth.uid() = user_id);
