-- Migration: Add Razorpay support to subscriptions table and create payment_events table
-- Created: 2025-01-XX
-- This migration adds Razorpay-specific columns and creates the payment_events table for webhook handling

-- Add Razorpay columns to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS razorpay_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS razorpay_plan_id VARCHAR(255);

-- Create indexes for Razorpay columns
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_customer ON subscriptions(razorpay_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_subscription ON subscriptions(razorpay_subscription_id);

-- Create payment_events table for webhook event tracking (idempotency)
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gateway_event_id VARCHAR(255) NOT NULL,
  payment_gateway VARCHAR(50) NOT NULL CHECK (payment_gateway IN ('stripe', 'razorpay')),
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index to prevent duplicate events
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_gateway_event 
ON payment_events(gateway_event_id, payment_gateway);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_events_unprocessed 
ON payment_events(processed, created_at) WHERE processed = FALSE;
CREATE INDEX IF NOT EXISTS idx_payment_events_gateway 
ON payment_events(payment_gateway, event_type);

-- Enable RLS on payment_events
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Only service role can manage payment events (via API)
CREATE POLICY "Service role can manage payment events" ON payment_events
  FOR ALL USING (auth.role() = 'service_role');

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_payment_events_updated_at
  BEFORE UPDATE ON payment_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON COLUMN subscriptions.razorpay_customer_id IS 'Razorpay customer ID for this user';
COMMENT ON COLUMN subscriptions.razorpay_subscription_id IS 'Razorpay subscription ID';
COMMENT ON COLUMN subscriptions.razorpay_plan_id IS 'Razorpay plan ID for this subscription';
COMMENT ON TABLE payment_events IS 'Stores payment gateway webhook events for idempotency and debugging';
