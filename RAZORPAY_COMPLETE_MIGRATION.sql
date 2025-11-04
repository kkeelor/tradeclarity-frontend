-- Complete Razorpay migration - removes Stripe, adds Razorpay
-- Run this entire SQL script in Supabase SQL Editor

-- Step 1: Add Razorpay columns to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS razorpay_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS razorpay_plan_id VARCHAR(255);

-- Step 2: Remove Stripe columns from subscriptions table
ALTER TABLE subscriptions
DROP COLUMN IF EXISTS stripe_customer_id,
DROP COLUMN IF EXISTS stripe_subscription_id,
DROP COLUMN IF EXISTS stripe_price_id;

-- Step 3: Create indexes for Razorpay
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_customer ON subscriptions(razorpay_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_subscription ON subscriptions(razorpay_subscription_id);

-- Step 4: Drop old Stripe indexes
DROP INDEX IF EXISTS idx_subscriptions_stripe_customer;
DROP INDEX IF EXISTS idx_subscriptions_stripe_subscription;

-- Step 5: Rename stripe_events to payment_events (if not already done)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stripe_events') THEN
    ALTER TABLE stripe_events RENAME TO payment_events;
  END IF;
END $$;

-- Step 6: Update payment_events table structure
ALTER TABLE payment_events
ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(20) DEFAULT 'razorpay' CHECK (payment_gateway IN ('stripe', 'razorpay'));

-- Step 7: Rename column if it exists with old name
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns 
             WHERE table_name = 'payment_events' AND column_name = 'stripe_event_id') THEN
    ALTER TABLE payment_events RENAME COLUMN stripe_event_id TO gateway_event_id;
  END IF;
END $$;

-- Step 8: Create index for gateway events
CREATE INDEX IF NOT EXISTS idx_payment_events_gateway_event ON payment_events(gateway_event_id, payment_gateway);

-- Step 9: Optional - Clean up old Stripe events (uncomment if you want to delete them)
-- DELETE FROM payment_events WHERE payment_gateway = 'stripe';

-- Verification query (run separately to check)
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'subscriptions' 
-- AND (column_name LIKE '%stripe%' OR column_name LIKE '%razorpay%');
