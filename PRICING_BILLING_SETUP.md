# Pricing & Billing Implementation Guide

## Overview

This document outlines the complete pricing and billing implementation for TradeClarity, including Stripe integration, database schema, and UX components.

---

## Prerequisites

1. **Stripe Account**: Sign up at https://stripe.com (free to start)
2. **Supabase Database**: Run the SQL schema from `SUBSCRIPTIONS_SCHEMA.sql`
3. **Environment Variables**: See configuration section below

---

## Environment Variables

Add these to your `.env.local` file:

```bash
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_... # Get from Razorpay Dashboard
RAZORPAY_KEY_SECRET=your_secret_key # Get from Razorpay Dashboard
RAZORPAY_WEBHOOK_SECRET=whsec_... # Get from Razorpay Webhook settings

# Razorpay Plan IDs (create plans in Razorpay Dashboard first)
RAZORPAY_PLAN_ID_TRADER_MONTHLY=plan_...
RAZORPAY_PLAN_ID_TRADER_ANNUAL=plan_...
RAZORPAY_PLAN_ID_PRO_MONTHLY=plan_...
RAZORPAY_PLAN_ID_PRO_ANNUAL=plan_...

# Next.js Public URLs (for Razorpay redirects)
NEXT_PUBLIC_URL=http://localhost:3000 # or your production URL

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Setup Steps

### 1. Create Razorpay Account & Plans

1. Sign up at https://razorpay.com
2. Complete KYC verification
3. Go to Razorpay Dashboard → Products → Plans
4. Create 4 plans:
   - **Trader Monthly** - ₹1,500/month
   - **Trader Annual** - ₹15,000/year (12 cycles)
   - **Pro Monthly** - ₹3,900/month
   - **Pro Annual** - ₹39,000/year (12 cycles)
5. Copy the Plan IDs and add to `.env.local`

### 2. Set Up Razorpay Webhook

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add endpoint: `https://yourdomain.com/api/razorpay/webhook`
3. Select events:
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.halted`
   - `subscription.cancelled`
   - `payment.authorized`
   - `payment.captured`
   - `payment.failed`
4. Copy webhook secret to `.env.local`

### 3. Run Database Migration

1. Run the SQL from `SUBSCRIPTIONS_SCHEMA.sql` in your Supabase SQL Editor
2. Run the SQL from `RAZORPAY_COMPLETE_MIGRATION.sql` to remove Stripe columns

### 4. Install Dependencies

```bash
npm install razorpay
```

Already installed ✓

---

## File Structure

```
app/
├── pricing/
│   └── page.js              # Pricing page component
├── billing/
│   └── page.js              # Billing management page
└── api/
    ├── razorpay/
    │   ├── create-subscription/
    │   │   └── route.js     # Create Razorpay subscription
    │   ├── cancel-subscription/
    │   │   └── route.js     # Cancel Razorpay subscription
    │   ├── webhook/
    │   │   └── route.js     # Handle Razorpay webhooks
    │   └── get-plans/
    │       └── route.js     # Get Razorpay plan IDs
    └── subscriptions/
        └── current/
            └── route.js     # Get current subscription

lib/
└── featureGates.js          # Feature gate utilities

supabase/
└── migrations/
    └── create_subscriptions_schema.sql  # Database schema
```

---

## Usage

### Check User Subscription

```javascript
import { useAuth } from '@/lib/AuthContext'

const { user } = useAuth()
const response = await fetch(`/api/subscriptions/current?userId=${user.id}`)
const { subscription } = await response.json()
```

### Check Feature Access

```javascript
import { canAccessFeature, canAddConnection } from '@/lib/featureGates'

if (canAccessFeature(subscription.tier, 'pdf_reports')) {
  // Allow PDF report generation
}

if (canAddConnection(subscription)) {
  // Allow adding exchange connection
}
```

### Redirect to Pricing

```javascript
import { useRouter } from 'next/navigation'

const router = useRouter()
router.push('/pricing')
```

---

## Testing

### Test Mode

1. Use Razorpay test mode keys (starts with `rzp_test_`)
2. Use Razorpay test cards:
   - Success: `4111 1111 1111 1111`
   - Failure: `4000 0000 0000 0002`
   - UPI: Use any UPI ID (will show test mode)
3. Test webhook locally using ngrok:
   ```bash
   ngrok http 3000
   # Use ngrok URL in Razorpay webhook settings
   ```

---

## Payment Gateway Recommendation

**Razorpay** is used because:
- ✅ Better for India (2% fee for Indian cards vs 2.9%)
- ✅ Supports UPI, wallets, netbanking (critical for India)
- ✅ Automatic GST handling
- ✅ Excellent developer experience
- ✅ Robust webhook system
- ✅ Supports subscriptions and one-time payments
- ✅ Indian company, easier compliance

See `RAZORPAY_VS_STRIPE.md` for full comparison.

---

## Next Steps

1. ✅ Database schema created
2. ✅ Pricing page created
3. ✅ Billing page created
4. ✅ Razorpay integration complete
5. ⏳ Set up Razorpay account and complete KYC
6. ⏳ Create plans in Razorpay dashboard
7. ⏳ Configure webhook endpoint
8. ⏳ Test checkout flow
9. ⏳ Implement feature gates in app
10. ⏳ Add usage tracking
11. ⏳ Add upgrade prompts in UI

---

## Support

- Razorpay Docs: https://razorpay.com/docs
- Razorpay Subscriptions: https://razorpay.com/docs/api/subscriptions
- Supabase Docs: https://supabase.com/docs
