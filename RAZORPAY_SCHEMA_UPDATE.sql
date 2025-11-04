-- Additional columns for Razorpay support
-- Run this after the main subscriptions schema

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS razorpay_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS razorpay_plan_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_customer ON subscriptions(razorpay_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_subscription ON subscriptions(razorpay_subscription_id);

-- Update webhook events table to support Razorpay
ALTER TABLE stripe_events 
RENAME TO payment_events;

ALTER TABLE payment_events
ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(20) DEFAULT 'stripe' CHECK (payment_gateway IN ('stripe', 'razorpay'));

ALTER TABLE payment_events
RENAME COLUMN stripe_event_id TO gateway_event_id;

CREATE INDEX IF NOT EXISTS idx_payment_events_gateway_event ON payment_events(gateway_event_id, payment_gateway);
