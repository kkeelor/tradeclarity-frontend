-- Migration: Create invoices table for payment receipts
-- Created: 2025-01-XX
-- This migration creates the invoices table to store payment receipts/invoices

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Invoice details
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  plan_name VARCHAR(100),
  billing_period VARCHAR(50), -- e.g., "January 2025", "Monthly", "Annual"
  
  -- Payment details
  amount INTEGER NOT NULL, -- Amount in smallest currency unit (paise for INR, cents for USD)
  currency VARCHAR(10) DEFAULT 'INR',
  tax_amount INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method VARCHAR(50) DEFAULT 'razorpay',
  
  -- Razorpay references
  razorpay_payment_id VARCHAR(255),
  razorpay_order_id VARCHAR(255),
  razorpay_invoice_id VARCHAR(255),
  razorpay_subscription_id VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_razorpay_payment ON invoices(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_razorpay_subscription ON invoices(razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

-- Enable RLS on invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Users can only view their own invoices
CREATE POLICY "Users can view their own invoices" ON invoices
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all invoices (for API/webhooks)
CREATE POLICY "Service role can manage invoices" ON invoices
  FOR ALL USING (auth.role() = 'service_role');

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE invoices IS 'Stores payment invoices/receipts for subscriptions';
COMMENT ON COLUMN invoices.amount IS 'Amount in smallest currency unit (paise for INR)';
COMMENT ON COLUMN invoices.invoice_number IS 'Unique invoice number (e.g., INV-2025-001)';
