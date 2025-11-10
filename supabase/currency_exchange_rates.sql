-- Create currency_exchange_rates table
-- Stores one row per currency per day
-- Rates are overwritten daily (not accumulated)

CREATE TABLE IF NOT EXISTS currency_exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  currency_code TEXT NOT NULL,
  rate NUMERIC(20, 6) NOT NULL, -- Rate relative to USD (e.g., 88.73 for INR)
  rate_date DATE NOT NULL, -- Which day these rates are for
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one row per currency per day
  UNIQUE(currency_code, rate_date)
);

-- Index for fast lookup of latest rates by currency
CREATE INDEX IF NOT EXISTS idx_currency_exchange_rates_lookup 
ON currency_exchange_rates(currency_code, rate_date DESC);

-- Index for checking if today's rates exist
CREATE INDEX IF NOT EXISTS idx_currency_exchange_rates_date 
ON currency_exchange_rates(rate_date DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_currency_exchange_rates_updated_at
BEFORE UPDATE ON currency_exchange_rates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) - only service role can write, anyone can read
ALTER TABLE currency_exchange_rates ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to do everything
CREATE POLICY "Service role can manage currency rates"
ON currency_exchange_rates
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Policy: Allow authenticated users to read (for API routes)
CREATE POLICY "Authenticated users can read currency rates"
ON currency_exchange_rates
FOR SELECT
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
