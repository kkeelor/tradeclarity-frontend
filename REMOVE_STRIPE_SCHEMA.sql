-- Remove Stripe-specific columns and data
-- Run this SQL to clean up Stripe references

-- Drop Stripe-specific columns from subscriptions table
ALTER TABLE subscriptions
DROP COLUMN IF EXISTS stripe_customer_id,
DROP COLUMN IF EXISTS stripe_subscription_id,
DROP COLUMN IF EXISTS stripe_price_id;

-- Drop Stripe-specific indexes
DROP INDEX IF EXISTS idx_subscriptions_stripe_customer;
DROP INDEX IF EXISTS idx_subscriptions_stripe_subscription;

-- Note: payment_events table already renamed from stripe_events
-- No need to drop it, just ensure it only has Razorpay events

-- Optional: Clean up any old Stripe events (if you want to remove them)
-- DELETE FROM payment_events WHERE payment_gateway = 'stripe';

-- Verify the cleanup
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'subscriptions' AND column_name LIKE '%stripe%';
-- Should return no rows
