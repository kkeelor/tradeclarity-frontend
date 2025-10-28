# Premium Pricing & Functionality Plan

## Overview
This document outlines TradeClarity's freemium pricing strategy, premium tiers, feature gates, and monetization approach.

---

## Pricing Philosophy

### Core Principles
1. **Value-Based**: Price based on actual value delivered, not arbitrary limits
2. **Usage-Based**: Scale pricing with user's trading activity
3. **Fair**: Free tier genuinely useful, premium clearly worth the upgrade
4. **Transparent**: No hidden fees, clear feature differences

### Freemium Strategy
- Free tier provides real value (not just a trial)
- Attract serious traders, convert power users
- Use free tier as powerful marketing tool
- Premium unlocks advanced analytics & convenience

---

## Pricing Tiers

### Option A: Usage-Based Tiers (Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│                        FREE                                  │
├─────────────────────────────────────────────────────────────┤
│ Price: $0/month                                             │
│                                                             │
│ ✓ 1 exchange connection                                    │
│ ✓ Up to 100 trades analyzed per month                      │
│ ✓ Basic analytics (P&L, win rate, etc.)                    │
│ ✓ Psychology score                                          │
│ ✓ Top 3 behavioral insights                                │
│ ✓ Current snapshot only (no history)                       │
│ ✓ Manual CSV upload                                        │
│                                                             │
│ ✗ No historical tracking                                   │
│ ✗ No progress charts                                       │
│ ✗ No comparisons                                            │
│ ✗ No full pattern details                                  │
│ ✗ No PDF reports                                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      TRADER                                  │
├─────────────────────────────────────────────────────────────┤
│ Price: $19/month or $190/year (save 17%)                   │
│                                                             │
│ ✓ Everything in Free, plus:                                │
│                                                             │
│ ✓ 3 exchange connections                                   │
│ ✓ Up to 500 trades analyzed per month                      │
│ ✓ Unlimited historical tracking                            │
│ ✓ Progress charts & trends                                 │
│ ✓ All behavioral pattern details                           │
│ ✓ Period comparisons (this month vs. last)                 │
│ ✓ 10 PDF reports per month                                 │
│ ✓ Email alerts for critical patterns                       │
│ ✓ Priority support                                          │
│                                                             │
│ ✗ No advanced comparisons                                  │
│ ✗ No cohort analytics                                       │
│ ✗ No API access                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        PRO                                   │
├─────────────────────────────────────────────────────────────┤
│ Price: $49/month or $490/year (save 17%)                   │
│                                                             │
│ ✓ Everything in Trader, plus:                              │
│                                                             │
│ ✓ Unlimited exchange connections                           │
│ ✓ Unlimited trades analyzed                                │
│ ✓ Advanced comparisons (best/worst periods)                │
│ ✓ Cohort analytics (compare to similar traders)            │
│ ✓ Unlimited PDF reports                                    │
│ ✓ Custom report branding                                   │
│ ✓ Weekly summary emails                                    │
│ ✓ Export raw analytics data (JSON/CSV)                     │
│ ✓ API access (beta)                                        │
│ ✓ Early access to new features                             │
│ ✓ Premium support (24hr response)                          │
└─────────────────────────────────────────────────────────────┘
```

### Option B: Flat Monthly Tiers

```
FREE ($0)
- 1 exchange, 100 trades/month
- Basic analytics only
- No history

TRADER ($24/month)
- 3 exchanges, 1000 trades/month
- Full analytics + history
- 10 reports/month

PRO ($59/month)
- Unlimited everything
- Advanced features
- API access
```

### Option C: Pay-As-You-Go

```
FREE (Base)
- 1 exchange free
- 100 trades/month free

Add-ons:
- Additional exchange: $5/month each
- 500 more trades: $10/month
- PDF reports: $5 for 10 reports
- Historical tracking: $10/month
- Cohort analytics: $15/month
```

---

## Recommended: Option A (Usage-Based Tiers)

**Why this works best:**
1. Clear upgrade path as users grow
2. Aligns price with value (more trades = serious trader)
3. Free tier is genuinely useful for beginners
4. Natural conversion funnel
5. Simple to understand and communicate

**Target Customer Profiles:**

**Free Users:**
- Beginners exploring crypto trading
- Casual traders (<100 trades/month)
- Users trying the platform
- Students/learning traders

**Trader Tier:**
- Active part-time traders
- 1-3 exchange accounts
- 100-500 trades/month
- Want to improve seriously
- Need historical tracking

**Pro Tier:**
- Full-time/professional traders
- Multiple exchange accounts
- High-volume trading (500+ trades/month)
- Want competitive edge
- Need advanced analytics

---

## Feature Gates & Implementation

### Database Schema

```sql
-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,

  -- Subscription details
  tier VARCHAR(20) DEFAULT 'free', -- 'free', 'trader', 'pro'
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'canceled', 'expired', 'past_due'

  -- Billing
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,

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
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'analysis', 'report_generated', 'connection_added'
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stripe webhook events
CREATE TABLE stripe_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_usage_events_user_date ON usage_events(user_id, created_at DESC);
CREATE INDEX idx_stripe_events_unprocessed ON stripe_events(processed, created_at) WHERE processed = FALSE;
```

### Feature Gate Functions

```javascript
// lib/featureGates.js

export const TIER_LIMITS = {
  free: {
    maxConnections: 1,
    maxTradesPerMonth: 100,
    maxReportsPerMonth: 0,
    features: [
      'basic_analytics',
      'psychology_score',
      'top_insights',
      'csv_upload'
    ]
  },
  trader: {
    maxConnections: 3,
    maxTradesPerMonth: 500,
    maxReportsPerMonth: 10,
    features: [
      'basic_analytics',
      'psychology_score',
      'all_insights',
      'csv_upload',
      'historical_tracking',
      'progress_charts',
      'period_comparisons',
      'pdf_reports',
      'email_alerts',
      'pattern_details'
    ]
  },
  pro: {
    maxConnections: Infinity,
    maxTradesPerMonth: Infinity,
    maxReportsPerMonth: Infinity,
    features: [
      'basic_analytics',
      'psychology_score',
      'all_insights',
      'csv_upload',
      'historical_tracking',
      'progress_charts',
      'period_comparisons',
      'pdf_reports',
      'email_alerts',
      'pattern_details',
      'advanced_comparisons',
      'cohort_analytics',
      'unlimited_reports',
      'custom_branding',
      'weekly_summaries',
      'data_export',
      'api_access'
    ]
  }
}

export function canAccessFeature(userTier, feature) {
  const tierConfig = TIER_LIMITS[userTier] || TIER_LIMITS.free
  return tierConfig.features.includes(feature)
}

export function canAddConnection(subscription) {
  const limit = TIER_LIMITS[subscription.tier].maxConnections
  return subscription.exchanges_connected < limit
}

export function canAnalyzeTrades(subscription, tradeCount) {
  const limit = TIER_LIMITS[subscription.tier].maxTradesPerMonth
  return (subscription.trades_analyzed_this_month + tradeCount) <= limit
}

export function canGenerateReport(subscription) {
  const limit = TIER_LIMITS[subscription.tier].maxReportsPerMonth
  if (limit === Infinity) return true
  if (limit === 0) return false
  return subscription.reports_generated_this_month < limit
}

export function getRemainingQuota(subscription) {
  const limits = TIER_LIMITS[subscription.tier]
  return {
    connections: limits.maxConnections === Infinity
      ? 'Unlimited'
      : limits.maxConnections - subscription.exchanges_connected,
    trades: limits.maxTradesPerMonth === Infinity
      ? 'Unlimited'
      : limits.maxTradesPerMonth - subscription.trades_analyzed_this_month,
    reports: limits.maxReportsPerMonth === Infinity
      ? 'Unlimited'
      : limits.maxReportsPerMonth - subscription.reports_generated_this_month
  }
}
```

### Paywall UI Components

```javascript
// components/Paywall.js

export function FeaturePaywall({ feature, userTier, children }) {
  const hasAccess = canAccessFeature(userTier, feature)

  if (hasAccess) {
    return children
  }

  return (
    <div className="relative">
      {/* Blurred/grayed content */}
      <div className="opacity-30 pointer-events-none blur-sm">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-xl">
        <div className="text-center p-6 max-w-md">
          <Lock className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">
            Premium Feature
          </h3>
          <p className="text-slate-400 mb-6">
            Upgrade to access {getFeatureName(feature)} and unlock advanced analytics.
          </p>
          <Button onClick={() => router.push('/pricing')}>
            View Plans
          </Button>
        </div>
      </div>
    </div>
  )
}

export function UsageWarning({ type, subscription }) {
  const quota = getRemainingQuota(subscription)
  const remaining = quota[type]

  // Show warning at 80% usage
  if (typeof remaining === 'number' && remaining < 20) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <div>
            <p className="text-sm font-medium text-yellow-300">
              Approaching {type} limit
            </p>
            <p className="text-xs text-slate-400">
              {remaining} {type} remaining this month.
              <a href="/pricing" className="text-emerald-400 hover:underline ml-1">
                Upgrade for more →
              </a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export function QuotaExceeded({ type, userTier }) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
      <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
      <h3 className="text-xl font-bold mb-2">
        {type === 'connections' ? 'Connection Limit Reached' :
         type === 'trades' ? 'Monthly Trade Limit Reached' :
         'Report Limit Reached'}
      </h3>
      <p className="text-slate-400 mb-6">
        {type === 'connections' && `You've reached the maximum of ${TIER_LIMITS[userTier].maxConnections} exchange connections on your current plan.`}
        {type === 'trades' && `You've analyzed ${TIER_LIMITS[userTier].maxTradesPerMonth} trades this month.`}
        {type === 'reports' && `You've generated all ${TIER_LIMITS[userTier].maxReportsPerMonth} reports for this month.`}
      </p>
      <Button onClick={() => router.push('/pricing')}>
        Upgrade to Continue
      </Button>
    </div>
  )
}
```

---

## Stripe Integration

### Implementation Plan

**1. Setup Stripe Products**
```javascript
// Create products in Stripe Dashboard or via API

// Trader Monthly
stripe.products.create({
  name: 'TradeClarity Trader',
  description: 'Advanced analytics for active traders'
})

stripe.prices.create({
  product: 'prod_xxx',
  unit_amount: 1900, // $19.00
  currency: 'usd',
  recurring: { interval: 'month' }
})

// Trader Yearly
stripe.prices.create({
  product: 'prod_xxx',
  unit_amount: 19000, // $190.00
  currency: 'usd',
  recurring: { interval: 'year' }
})

// Same for Pro tier...
```

**2. Checkout Flow**
```javascript
// app/api/stripe/create-checkout/route.js

export async function POST(request) {
  const { priceId, userId } = await request.json()

  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    client_reference_id: userId,
    line_items: [{
      price: priceId,
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?upgrade=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing?upgrade=canceled`,
    metadata: {
      userId: userId
    }
  })

  return Response.json({ sessionId: session.id })
}
```

**3. Webhook Handler**
```javascript
// app/api/stripe/webhook/route.js

export async function POST(request) {
  const sig = request.headers.get('stripe-signature')
  const body = await request.text()

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  // Handle events
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object)
      break

    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object)
      break

    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object)
      break

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object)
      break
  }

  return Response.json({ received: true })
}

async function handleCheckoutComplete(session) {
  const userId = session.client_reference_id
  const subscription = await stripe.subscriptions.retrieve(session.subscription)

  // Create/update subscription in database
  await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      tier: getTierFromPriceId(subscription.items.data[0].price.id),
      status: 'active',
      stripe_customer_id: session.customer,
      stripe_subscription_id: subscription.id,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000)
    })
}
```

---

## Gradual Feature Rollout

### Phase 1: Foundation (Week 1-2)
1. Create subscriptions table
2. Create usage tracking system
3. Implement basic feature gates
4. Add "Upgrade" prompts in UI

### Phase 2: Stripe Integration (Week 3-4)
5. Set up Stripe products & prices
6. Build pricing page
7. Implement checkout flow
8. Set up webhook handlers
9. Test payment flow end-to-end

### Phase 3: Usage Enforcement (Week 5-6)
10. Enforce connection limits
11. Enforce trade analysis limits
12. Enforce report generation limits
13. Build usage dashboard for users
14. Monthly usage reset job

### Phase 4: Premium Features (Week 7-8)
15. Gate historical tracking
16. Gate progress charts
17. Gate period comparisons
18. Gate PDF reports
19. Implement email alerts (premium only)

### Phase 5: Advanced Premium (Week 9-12)
20. Gate cohort analytics
21. Gate advanced comparisons
22. Build data export feature
23. Build API access (beta)
24. Custom report branding

---

## Pricing Page Design

```
┌────────────────────────────────────────────────┐
│                                                │
│           Choose Your Plan                     │
│    Transparent pricing for every trader        │
│                                                │
│  [Monthly] [Yearly (Save 17%)]                │
│                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │   FREE   │  │  TRADER  │  │   PRO    │    │
│  ├──────────┤  ├──────────┤  ├──────────┤    │
│  │   $0     │  │   $19    │  │   $49    │    │
│  │  /month  │  │  /month  │  │  /month  │    │
│  │          │  │          │  │          │    │
│  │ Perfect  │  │ Best for │  │ For pro  │    │
│  │ to start │  │  active  │  │ traders  │    │
│  │          │  │  traders │  │          │    │
│  │          │  │          │  │          │    │
│  │ [Start]  │  │[Upgrade] │  │[Upgrade] │    │
│  └──────────┘  └──────────┘  └──────────┘    │
│                                                │
│           Feature Comparison                   │
│  ┌────────────────────────────────────────┐   │
│  │ Feature          │ Free│Trader│ Pro   │   │
│  ├─────────────────────────────────────────   │
│  │ Exchanges        │  1  │  3   │  ∞    │   │
│  │ Trades/month     │ 100 │ 500  │  ∞    │   │
│  │ History          │  ✗  │  ✓   │  ✓    │   │
│  │ Reports          │  ✗  │ 10/mo│  ∞    │   │
│  │ Comparisons      │  ✗  │Basic │Advanced│   │
│  │ Cohort Analytics │  ✗  │  ✗   │  ✓    │   │
│  └──────────────────────────────────────────   │
│                                                │
│           FAQ                                  │
│  • Can I change plans?                         │
│  • What payment methods?                       │
│  • Is there a free trial?                      │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Conversion Strategy

### Free → Trader Triggers
1. User hits 100 trade limit
2. User tries to connect 2nd exchange
3. User clicks "Download Report" button
4. After 3rd analysis, show value prop modal

### Trader → Pro Triggers
1. User hits 500 trade limit
2. User tries to connect 4th exchange
3. User generates 10th report
4. User clicks on "Cohort Comparison" (locked)

### Retention Tactics
- 7-day reminder before monthly limit resets
- Show value metrics ("You've analyzed 427 trades this month!")
- Highlight premium features in context
- Non-intrusive upgrade prompts

---

## Metrics to Track

### Conversion Metrics
- Free → Paid conversion rate (target: 5-10%)
- Trader → Pro upgrade rate (target: 15-20%)
- Churn rate by tier (target: <5% monthly)

### Usage Metrics
- % of free users hitting limits
- Average trades analyzed per tier
- Average reports generated per tier
- Feature usage by tier

### Revenue Metrics
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- ARPU (Average Revenue Per User)
- LTV (Lifetime Value) by tier

---

## Open Questions

1. **Free Trial for Pro?**
   - Option: 14-day Pro trial for new signups
   - Risk: Users might not subscribe after trial
   - Recommendation: No trial, but good free tier instead

2. **Annual Discount?**
   - Current: 17% off (2 months free)
   - Alternative: 20% off (2.4 months free)
   - Recommendation: Start at 17%, test 20% if annual uptake is low

3. **Refund Policy?**
   - Option 1: No refunds (industry standard for subscriptions)
   - Option 2: 7-day money-back guarantee
   - Recommendation: 7-day guarantee to build trust

4. **Team/Business Plans?**
   - Future consideration for trading firms
   - Multi-seat licensing
   - Shared analytics across team
   - Recommendation: Add in 6-12 months if there's demand

5. **Lifetime Deals?**
   - High upfront cash but loses recurring revenue
   - Common for early launch momentum
   - Recommendation: Maybe during initial launch only

---

## Risk Mitigation

### Preventing Abuse
- Rate limiting on API
- Unusual activity detection
- Stripe Radar for fraud prevention
- Max 10 connections even on Pro

### Handling Downgrades
- Users keep all historical data
- Can view but not generate new analyses
- Can re-upgrade anytime
- Grace period if payment fails

### Competition
- Transparent pricing (vs. hidden costs)
- Fair free tier (vs. paywalls)
- Focus on value, not features
- Regular feature updates

---

## Launch Strategy

### Soft Launch (Month 1)
- Launch with Free + Trader tiers only
- Test pricing and messaging
- Gather user feedback
- Identify most wanted features

### Full Launch (Month 2-3)
- Add Pro tier based on demand
- Stripe integration fully tested
- All feature gates working
- Pricing page optimized

### Optimization (Month 4+)
- A/B test pricing
- A/B test messaging
- Refine tier limits based on actual usage
- Add features based on feedback
