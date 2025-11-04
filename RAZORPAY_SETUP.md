# Razorpay Setup Guide for TradeClarity

## Quick Setup Steps

### 1. Create Razorpay Account
1. Sign up at https://razorpay.com
2. Complete KYC verification (required for Indian accounts)
3. Activate your account

### 2. Get API Keys
1. Go to Razorpay Dashboard → Settings → API Keys
2. Copy your **Key ID** and **Key Secret**
3. Add to `.env.local`:
   ```bash
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=your_secret_key
   RAZORPAY_WEBHOOK_SECRET=whsec_...  # Get from webhook settings
   ```

### 3. Create Plans in Razorpay Dashboard
1. Go to Razorpay Dashboard → Products → Plans
2. Create 4 plans:

   **Trader Monthly:**
   - Name: Trader Monthly
   - Amount: ₹1,500 (₹19 × 79 conversion, adjust as needed)
   - Billing Period: Monthly
   - Copy Plan ID → `RAZORPAY_PLAN_ID_TRADER_MONTHLY`

   **Trader Annual:**
   - Name: Trader Annual
   - Amount: ₹15,000 (₹190 × 79)
   - Billing Period: Monthly (12 cycles)
   - Copy Plan ID → `RAZORPAY_PLAN_ID_TRADER_ANNUAL`

   **Pro Monthly:**
   - Name: Pro Monthly
   - Amount: ₹3,900 (₹49 × 79)
   - Billing Period: Monthly
   - Copy Plan ID → `RAZORPAY_PLAN_ID_PRO_MONTHLY`

   **Pro Annual:**
   - Name: Pro Annual
   - Amount: ₹39,000 (₹490 × 79)
   - Billing Period: Monthly (12 cycles)
   - Copy Plan ID → `RAZORPAY_PLAN_ID_PRO_ANNUAL`

### 4. Set Up Webhook
1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/razorpay/webhook`
3. Select events:
   - `subscription.activated`
   - `subscription.charged`
   - `subscription.halted`
   - `subscription.cancelled`
   - `payment.authorized`
   - `payment.captured`
   - `payment.failed`
4. Copy Webhook Secret → `RAZORPAY_WEBHOOK_SECRET`

### 5. Run Database Migration
Run the SQL from `RAZORPAY_SCHEMA_UPDATE.sql` in Supabase SQL Editor.

### 6. Update Environment Variables
Add to `.env.local`:
```bash
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your_secret_key
RAZORPAY_WEBHOOK_SECRET=whsec_...

# Razorpay Plan IDs
RAZORPAY_PLAN_ID_TRADER_MONTHLY=plan_...
RAZORPAY_PLAN_ID_TRADER_ANNUAL=plan_...
RAZORPAY_PLAN_ID_PRO_MONTHLY=plan_...
RAZORPAY_PLAN_ID_PRO_ANNUAL=plan_...
```

---

## Testing

### Test Mode
1. Use test API keys (starts with `rzp_test_`)
2. Use test cards:
   - Success: `4111 1111 1111 1111`
   - Failure: `4000 0000 0000 0002`
   - UPI: Use any UPI ID (will show test mode)

### Test Webhook Locally
Use Razorpay webhook testing tool or ngrok:
```bash
ngrok http 3000
# Use ngrok URL in Razorpay webhook settings
```

---

## Pricing Conversion Notes

**USD to INR Conversion:**
- $19/month ≈ ₹1,500/month (adjust based on current rate)
- $190/year ≈ ₹15,000/year
- $49/month ≈ ₹3,900/month
- $490/year ≈ ₹39,000/year

**Consider:**
- Indian customers may prefer INR pricing
- Consider local pricing (₹999/month sounds better than ₹1,500)
- Test what converts better

---

## Key Differences from Stripe

1. **Plans vs Prices**: Razorpay uses "Plans" (similar concept)
2. **Payment Flow**: User redirected to Razorpay payment page
3. **Webhook Events**: Different event names
4. **Subscription Management**: Done via Razorpay dashboard or API

---

## Advantages for India

✅ **2% fee** for Indian cards (vs 2.9% for Stripe)
✅ **UPI support** (most popular in India)
✅ **Wallets** (Paytm, PhonePe, etc.)
✅ **Netbanking** support
✅ **Better conversion** for Indian customers
✅ **GST handling** automatic

---

## Next Steps

1. ✅ Set up Razorpay account
2. ✅ Create plans
3. ✅ Configure webhook
4. ✅ Run database migration
5. ✅ Test subscription flow
6. ✅ Go live!
