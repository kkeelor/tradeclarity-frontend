-- Subscriptions table for TradeClarity pricing tiers
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Subscription details
  tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'trader', 'pro')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'past_due', 'trialing')),

  -- Billing
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  -- Usage tracking (reset monthly)
  exchanges_connected INTEGER DEFAULT 0,
  trades_analyzed_this_month INTEGER DEFAULT 0,
  reports_generated_this_month INTEGER DEFAULT 0,
  last_usage_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  canceled_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE
);

-- Usage tracking table (for analytics)
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'analysis', 'report_generated', 'connection_added'
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stripe webhook events (for idempotency and debugging)
CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_date ON usage_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_events_unprocessed ON stripe_events(processed, created_at) WHERE processed = FALSE;
CREATE INDEX IF NOT EXISTS idx_stripe_events_stripe_id ON stripe_events(stripe_event_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on subscriptions
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscription
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only see their own usage events
CREATE POLICY "Users can view own usage events" ON usage_events
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update subscriptions (via API)
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Only service role can insert usage events
CREATE POLICY "Service role can insert usage events" ON usage_events
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Only service role can manage stripe events
CREATE POLICY "Service role can manage stripe events" ON stripe_events
  FOR ALL USING (auth.role() = 'service_role');

-- Create default subscription for new users
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default subscription when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_subscription();
