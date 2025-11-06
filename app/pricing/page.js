// app/pricing/page.js
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Zap, TrendingUp, Crown, ArrowRight, Sparkles, Shield, Clock, CreditCard, ChevronDown, ArrowLeft, Star, Users, TrendingDown } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { getTierDisplayName } from '@/lib/featureGates'
import { toast } from 'sonner'
import Footer from '../components/Footer'
import { getCurrencySymbol } from '../analyze/utils/currencyFormatter'
import { convertCurrencySync, getCurrencyRates } from '../analyze/utils/currencyConverter'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import Script from 'next/script'

const PRICING_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceAnnual: 0,
    description: 'Perfect for getting started',
    icon: Sparkles,
    color: 'slate',
    features: [
      '1 exchange connection',
      'Up to 100 trades analyzed per month',
      'Basic analytics (P&L, win rate, etc.)',
      'Psychology score',
      'Top 3 behavioral insights',
      'Current snapshot only (no history)',
      'Manual CSV upload'
    ],
    limitations: [
      'No historical tracking',
      'No progress charts',
      'No comparisons',
      'No full pattern details',
      'No PDF reports'
    ]
  },
  trader: {
    name: 'Trader',
    price: 19,
    priceAnnual: 190,
    description: 'Best for active traders',
    icon: TrendingUp,
    color: 'emerald',
    popular: true,
    features: [
      'Everything in Free, plus:',
      '3 exchange connections',
      'Up to 500 trades analyzed per month',
      'Unlimited historical tracking',
      'Progress charts & trends',
      'All behavioral pattern details',
      'Period comparisons (this month vs. last)',
      '10 PDF reports per month',
      'Email alerts for critical patterns',
      'Priority support'
    ],
    limitations: [
      'No advanced comparisons',
      'No cohort analytics',
      'No API access'
    ]
  },
  pro: {
    name: 'Pro',
    price: 49,
    priceAnnual: 490,
    description: 'For professional traders',
    icon: Crown,
    color: 'cyan',
    features: [
      'Everything in Trader, plus:',
      'Unlimited exchange connections',
      'Unlimited trades analyzed',
      'Advanced comparisons (best/worst periods)',
      'Cohort analytics (compare to similar traders)',
      'Unlimited PDF reports',
      'Custom report branding',
      'Weekly summary emails',
      'Export raw analytics data (JSON/CSV)',
      'API access (beta)',
      'Early access to new features',
      'Premium support (24hr response)'
    ]
  }
}

// Currency dropdown component using shadcn DropdownMenu
function CurrencyDropdown({ currencies, selectedCurrency, onSelectCurrency }) {
  const currencyNames = {
    'USD': 'US Dollar',
    'INR': 'Indian Rupee',
    'EUR': 'Euro',
    'GBP': 'British Pound',
    'JPY': 'Japanese Yen',
    'AUD': 'Australian Dollar',
    'CAD': 'Canadian Dollar',
    'CNY': 'Chinese Yuan',
    'SGD': 'Singapore Dollar',
    'CHF': 'Swiss Franc'
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-white">
          <span>{getCurrencySymbol(selectedCurrency)}</span>
          <span>{selectedCurrency}</span>
          <ChevronDown className="h-3 w-3 transition-transform" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-slate-800/95 backdrop-blur-xl border-slate-700/50">
        {currencies.map((curr) => (
          <DropdownMenuItem
            key={curr}
            onClick={() => onSelectCurrency(curr)}
            className={`flex items-center gap-2 text-xs cursor-pointer ${
              selectedCurrency === curr
                ? 'bg-emerald-400/20 text-emerald-300 font-medium'
                : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
            }`}
          >
            <span className="w-8 text-right">{getCurrencySymbol(curr)}</span>
            <span className="flex-1">{curr}</span>
            <span className="text-[10px] text-slate-500">{currencyNames[curr] || ''}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function PricingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [billingCycle, setBillingCycle] = useState('monthly') // 'monthly' or 'annual'
  const [loading, setLoading] = useState(false)
  const [currentTier, setCurrentTier] = useState('free')
  const [currency, setCurrency] = useState('USD')
  const [razorpayLoaded, setRazorpayLoaded] = useState(false)
  
  // Available currencies (same as analytics page)
  const availableCurrencies = ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CNY', 'SGD', 'CHF']

  // Initialize currency from localStorage
  useEffect(() => {
    const savedCurrency = typeof window !== 'undefined' ? localStorage.getItem('tradeclarity_currency') : null
    if (savedCurrency && availableCurrencies.includes(savedCurrency)) {
      setCurrency(savedCurrency)
    }
    
    // Pre-fetch currency rates for conversion
    getCurrencyRates().catch(err => {
      console.warn('Could not fetch currency rates:', err.message)
    })
  }, [])

  // Handle currency change with localStorage persistence
  const handleCurrencyChange = (newCurrency) => {
    setCurrency(newCurrency)
    if (typeof window !== 'undefined') {
      localStorage.setItem('tradeclarity_currency', newCurrency)
    }
  }

  useEffect(() => {
    if (user) {
      fetchUserSubscription()
    }
  }, [user])

  const fetchUserSubscription = async () => {
    try {
      const response = await fetch(`/api/subscriptions/current?userId=${user?.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.subscription) {
          setCurrentTier(data.subscription.tier)
        }
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
    }
  }

  const handleUpgrade = async (tier) => {
    if (!user) {
      router.push('/auth/login?redirect=/pricing')
      return
    }

    if (tier === 'free') {
      toast.info('You are already on the Free plan')
      return
    }

    if (tier === currentTier) {
      toast.info(`You are already on the ${PRICING_PLANS[tier].name} plan`)
      return
    }

    setLoading(true)
    
    // Safety timeout: reset loading state after 2 minutes if something goes wrong
    const loadingTimeout = setTimeout(() => {
      console.warn('Loading timeout reached, resetting state')
      setLoading(false)
    }, 120000) // 2 minutes
    
    try {
      // Get Razorpay plan IDs from server
      const plansResponse = await fetch('/api/razorpay/get-plans')
      const plans = await plansResponse.json()

      let planId
      if (tier === 'trader') {
        planId = billingCycle === 'annual' 
          ? plans.traderAnnual 
          : plans.traderMonthly
      } else if (tier === 'pro') {
        planId = billingCycle === 'annual'
          ? plans.proAnnual
          : plans.proMonthly
      }

      if (!planId) {
        clearTimeout(loadingTimeout)
        toast.error('Plan configuration error. Please contact support.')
        setLoading(false)
        return
      }

      // Calculate price
      const plan = PRICING_PLANS[tier]
      const monthlyPriceUSD = billingCycle === 'annual' ? Math.round(plan.priceAnnual / 12) : plan.price
      const discountMultiplier = 0.5 // 50% discount
      const discountedPriceUSD = monthlyPriceUSD * discountMultiplier
      
      // Convert to INR for Razorpay (Razorpay always works with INR)
      // Always convert from USD to INR regardless of selected display currency
      const amountInINR = convertCurrencySync(discountedPriceUSD, 'USD', 'INR')

      // Create order
      console.log('Creating Razorpay order:', { amountInINR, planId, tier, billingCycle })
      const orderResponse = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInINR,
          currency: 'INR',
          planId,
          userId: user.id,
          billingCycle,
          tier
        })
      })

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({ error: 'Failed to create order' }))
        console.error('Order creation failed:', errorData)
        console.error('Response status:', orderResponse.status)
        clearTimeout(loadingTimeout)
        toast.error(errorData.error || errorData.details || 'Failed to create order. Please try again.')
        setLoading(false)
        return
      }

      const orderData = await orderResponse.json()
      console.log('Order created successfully:', orderData)
      
      if (orderData.error) {
        console.error('Order error:', orderData.error)
        clearTimeout(loadingTimeout)
        toast.error(orderData.error)
        setLoading(false)
        return
      }

      // Initialize Razorpay checkout
      if (typeof window !== 'undefined' && window.Razorpay) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'TradeClarity',
          description: `${PRICING_PLANS[tier].name} Plan - ${billingCycle === 'annual' ? 'Annual' : 'Monthly'}`,
          image: '/logo.png', // Update with your logo URL
          order_id: orderData.orderId,
          handler: async function (response) {
            // Payment successful
            try {
              console.log('Verifying payment:', {
                payment_id: response.razorpay_payment_id,
                order_id: response.razorpay_order_id
              })
              
              const verifyResponse = await fetch('/api/razorpay/verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  userId: user.id,
                  planId,
                  tier,
                  billingCycle
                })
              })

              if (!verifyResponse.ok) {
                const errorData = await verifyResponse.json().catch(() => ({ error: 'Payment verification failed' }))
                console.error('Payment verification failed:', errorData)
                clearTimeout(loadingTimeout)
                toast.error(errorData.error || 'Payment verification failed. Please contact support.')
                setLoading(false)
                return
              }

              const verifyData = await verifyResponse.json()
              console.log('Payment verification result:', verifyData)

              if (verifyData.success) {
                clearTimeout(loadingTimeout)
                toast.success('Payment successful! Your subscription is now active.')
                // Refresh subscription status
                await fetchUserSubscription()
                // Redirect to dashboard
                setTimeout(() => {
                  router.push('/dashboard')
                }, 2000)
              } else {
                clearTimeout(loadingTimeout)
                toast.error(verifyData.error || 'Payment verification failed')
                setLoading(false)
              }
            } catch (error) {
              console.error('Error verifying payment:', error)
              clearTimeout(loadingTimeout)
              toast.error('Payment verification failed. Please contact support.')
              setLoading(false)
            } finally {
              clearTimeout(loadingTimeout)
              setLoading(false)
            }
          },
          prefill: {
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Customer',
            email: user.email || '',
            contact: user.user_metadata?.phone || ''
          },
          notes: {
            userId: user.id,
            tier: tier,
            billingCycle: billingCycle
          },
          theme: {
            color: '#10b981' // emerald-500
          }
        }

        const rzp = new window.Razorpay(options)
        
        // Handle payment failure
        rzp.on('payment.failed', function (response) {
          console.error('Payment failed:', response.error)
          clearTimeout(loadingTimeout)
          toast.error(`Payment failed: ${response.error.description || response.error.reason || 'Unknown error'}`)
          setLoading(false)
        })

        // Handle modal close (user cancels/closes without completing payment)
        rzp.on('modal.close', function () {
          console.log('Razorpay modal closed by user')
          clearTimeout(loadingTimeout)
          setLoading(false)
        })

        // Open Razorpay checkout
        rzp.open()
      } else {
        toast.error('Razorpay checkout is loading. Please wait a moment and try again.')
        clearTimeout(loadingTimeout)
        setLoading(false)
      }
    } catch (error) {
      console.error('Error creating checkout:', error)
      toast.error('Failed to start checkout. Please try again.')
      clearTimeout(loadingTimeout)
      setLoading(false)
    }
  }

  const savings = billingCycle === 'annual' ? 17 : 0

  return (
    <>
      <Script 
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('Razorpay checkout script loaded')
          setRazorpayLoaded(true)
        }}
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        {/* Header */}
      <div className="border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push(user ? '/dashboard' : '/')}
              className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back {user ? 'to Dashboard' : 'to Home'}
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-6">
            Transparent pricing for every trader. Start free, upgrade when you need more.
          </p>
          
          {/* Social Proof */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Join <span className="text-emerald-400 font-semibold">500+</span> active traders</span>
            </div>
            <div className="h-4 w-px bg-white/10"></div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span><span className="text-emerald-400 font-semibold">1M+</span> trades analyzed</span>
            </div>
          </div>

          {/* Billing Toggle and Currency Selector */}
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex items-center justify-center gap-4">
              <span className={`text-sm ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-400'}`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm ${billingCycle === 'annual' ? 'text-white' : 'text-slate-400'}`}>
                Annual
                {savings > 0 && (
                  <Badge variant="profit" className="ml-2">
                    Save {savings}%
                  </Badge>
                )}
              </span>
            </div>
            
            {/* Currency Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Currency:</span>
              <CurrencyDropdown
                currencies={availableCurrencies}
                selectedCurrency={currency}
                onSelectCurrency={handleCurrencyChange}
              />
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto mb-16">
          {Object.entries(PRICING_PLANS).map(([key, plan]) => {
            const Icon = plan.icon
            const isCurrentTier = currentTier === key
            const isPopular = plan.popular
            
            // Calculate prices in USD first
            // For monthly billing: show plan.price
            // For annual billing: show monthly equivalent (plan.priceAnnual / 12)
            const monthlyPriceUSD = billingCycle === 'annual' ? Math.round(plan.priceAnnual / 12) : plan.price
            const annualPriceUSD = plan.priceAnnual
            
            // Apply 50% discount for paid plans
            const discountMultiplier = (key === 'trader' || key === 'pro') ? 0.5 : 1
            const discountedMonthlyPriceUSD = monthlyPriceUSD * discountMultiplier
            const discountedAnnualPriceUSD = annualPriceUSD * discountMultiplier
            
            // Convert prices to selected currency
            const convertedMonthlyPrice = currency === 'USD' ? monthlyPriceUSD : convertCurrencySync(monthlyPriceUSD, 'USD', currency)
            const convertedAnnualPrice = currency === 'USD' ? annualPriceUSD : convertCurrencySync(annualPriceUSD, 'USD', currency)
            const convertedDiscountedMonthlyPrice = currency === 'USD' ? discountedMonthlyPriceUSD : convertCurrencySync(discountedMonthlyPriceUSD, 'USD', currency)
            const convertedDiscountedAnnualPrice = currency === 'USD' ? discountedAnnualPriceUSD : convertCurrencySync(discountedAnnualPriceUSD, 'USD', currency)
            
            // Format prices with appropriate decimals
            const formatPrice = (price) => {
              if (price === 0) return '0'
              // Round to 2 decimals for most currencies, 0 for JPY
              const decimals = currency === 'JPY' ? 0 : 2
              return price.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
            }

            return (
              <div
                key={key}
                className={`relative rounded-3xl border backdrop-blur p-8 transition-all duration-300 ${
                  isPopular
                    ? 'border-emerald-500/50 bg-emerald-500/5 shadow-lg shadow-emerald-500/10 scale-105 ring-2 ring-emerald-500/20'
                    : key === 'pro'
                    ? 'border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10'
                    : 'border-white/5 bg-white/[0.03] hover:border-white/10'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full text-xs font-semibold text-white shadow-lg">
                    Most Popular
                  </div>
                )}
                
                {key === 'pro' && (
                  <div className="absolute -top-4 right-4 px-3 py-1 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full text-xs font-semibold text-white shadow-lg flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Premium
                  </div>
                )}

                <div className="mb-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${plan.color}-500/20 to-${plan.color}-600/20 border border-${plan.color}-500/30 flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 text-${plan.color}-400`} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm text-slate-400 mb-4">{plan.description}</p>
                  
                  {/* Launch Offer Badge for paid plans - inside card */}
                  {(key === 'trader' || key === 'pro') && (
                    <div className="mb-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="warning" className="inline-flex items-center gap-1.5 animate-pulse">
                          <Sparkles className="w-3 h-3" />
                          Launch Offer: 50% OFF
                        </Badge>
                        <span className="text-xs text-emerald-400 font-semibold">
                          Save {getCurrencySymbol(currency)}{formatPrice(convertedMonthlyPrice - convertedDiscountedMonthlyPrice)}/month
                        </span>
                      </div>
                      {billingCycle === 'annual' && (
                        <div className="text-xs text-slate-400">
                          <span className="text-emerald-400 font-semibold">Best Value:</span> Save {getCurrencySymbol(currency)}{formatPrice(convertedAnnualPrice - convertedDiscountedAnnualPrice)} annually
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-baseline gap-3 mb-2">
                    {(key === 'trader' || key === 'pro') && (
                      <div className="relative">
                        <span className="text-xl text-slate-400 font-medium tabular-nums">
                          {getCurrencySymbol(currency)}{formatPrice(convertedMonthlyPrice)}
                        </span>
                        {/* Dramatic red strikethrough */}
                        <svg 
                          className="absolute inset-0 pointer-events-none" 
                          width="100%" 
                          height="100%"
                          style={{ top: '50%', transform: 'translateY(-50%)' }}
                        >
                          <line 
                            x1="0" 
                            y1="50%" 
                            x2="100%" 
                            y2="50%" 
                            stroke="#ef4444" 
                            strokeWidth="3"
                            strokeLinecap="round"
                            opacity="0.9"
                          />
                        </svg>
                      </div>
                    )}
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold tabular-nums bg-gradient-to-br from-white via-white to-slate-200 bg-clip-text text-transparent">
                        {getCurrencySymbol(currency)}{formatPrice(convertedDiscountedMonthlyPrice)}
                      </span>
                      <span className="text-lg text-slate-400 font-medium">
                        /{billingCycle === 'annual' ? 'month' : 'month'}
                      </span>
                    </div>
                  </div>
                  
                  {billingCycle === 'annual' && (key === 'trader' || key === 'pro') && (
                    <div className="mt-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Annual total:</span>
                        <div className="flex items-center gap-2">
                          <span className="relative">
                            <span className="text-slate-500 tabular-nums">
                              {getCurrencySymbol(currency)}{formatPrice(convertedAnnualPrice)}
                            </span>
                            <svg 
                              className="absolute inset-0 pointer-events-none" 
                              width="100%" 
                              height="100%"
                              style={{ top: '50%', transform: 'translateY(-50%)' }}
                            >
                              <line 
                                x1="0" 
                                y1="50%" 
                                x2="100%" 
                                y2="50%" 
                                stroke="#ef4444" 
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </span>
                          <span className="text-emerald-400 font-bold tabular-nums">
                            {getCurrencySymbol(currency)}{formatPrice(convertedDiscountedAnnualPrice)}
                          </span>
                          <span className="text-xs text-emerald-400">/year</span>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-emerald-400 font-semibold">
                        Save {getCurrencySymbol(currency)}{formatPrice(convertedAnnualPrice - convertedDiscountedAnnualPrice)} per year
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleUpgrade(key)}
                  disabled={loading || isCurrentTier}
                  className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 mb-6 relative overflow-hidden group ${
                    isCurrentTier
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : loading
                      ? 'bg-slate-700 text-slate-300 cursor-wait opacity-75'
                      : isPopular
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-105 disabled:hover:scale-100'
                      : key === 'pro'
                      ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:scale-105 disabled:hover:scale-100'
                      : 'bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isCurrentTier ? (
                      <>
                        <Check className="w-4 h-4" />
                        Current Plan
                      </>
                    ) : loading ? (
                      'Processing...'
                    ) : (
                      <>
                        Get Started
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                  {!isCurrentTier && !loading && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  )}
                </button>

                <div className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-300">{feature}</span>
                    </div>
                  ))}
                  {plan.limitations && plan.limitations.map((limitation, idx) => (
                    <div key={idx} className="flex items-start gap-2 opacity-50">
                      <X className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-400">{limitation}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className="max-w-5xl mx-auto mb-16">
          <h2 className="text-2xl font-bold mb-6 text-center">Feature Comparison</h2>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left p-4 text-sm font-semibold text-slate-300">Feature</th>
                    <th className="text-center p-4 text-sm font-semibold text-slate-300">Free</th>
                    <th className="text-center p-4 text-sm font-semibold text-emerald-400">Trader</th>
                    <th className="text-center p-4 text-sm font-semibold text-cyan-400">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Exchange Connections', free: '1', trader: '3', pro: 'Unlimited' },
                    { feature: 'Trades Analyzed/Month', free: '100', trader: '500', pro: 'Unlimited' },
                    { feature: 'Historical Tracking', free: false, trader: true, pro: true },
                    { feature: 'Progress Charts', free: false, trader: true, pro: true },
                    { feature: 'PDF Reports/Month', free: '0', trader: '10', pro: 'Unlimited' },
                    { feature: 'Period Comparisons', free: false, trader: true, pro: true },
                    { feature: 'Cohort Analytics', free: false, trader: false, pro: true },
                    { feature: 'API Access', free: false, trader: false, pro: true },
                    { feature: 'Email Alerts', free: false, trader: true, pro: true },
                    { feature: 'Priority Support', free: false, trader: true, pro: true },
                  ].map((row, idx) => (
                    <tr key={idx} className="border-b border-white/5 last:border-0">
                      <td className="p-4 text-sm text-slate-300">{row.feature}</td>
                      <td className="p-4 text-center">
                        {typeof row.free === 'boolean' ? (
                          row.free ? <Check className="w-5 h-5 text-emerald-400 mx-auto" /> : <X className="w-5 h-5 text-slate-600 mx-auto" />
                        ) : (
                          <span className="text-sm text-slate-400">{row.free}</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {typeof row.trader === 'boolean' ? (
                          row.trader ? <Check className="w-5 h-5 text-emerald-400 mx-auto" /> : <X className="w-5 h-5 text-slate-600 mx-auto" />
                        ) : (
                          <span className="text-sm text-emerald-400">{row.trader}</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {typeof row.pro === 'boolean' ? (
                          row.pro ? <Check className="w-5 h-5 text-cyan-400 mx-auto" /> : <X className="w-5 h-5 text-slate-600 mx-auto" />
                        ) : (
                          <span className="text-sm text-cyan-400">{row.pro}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {[
              {
                q: 'Can I change plans anytime?',
                a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate your billing.'
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards (Visa, Mastercard, American Express), debit cards, UPI, wallets (Paytm, PhonePe), and netbanking through Razorpay.'
              },
              {
                q: 'Is there a free trial?',
                a: 'Our Free plan is always free with no credit card required. For paid plans, you can upgrade anytime and cancel within 7 days for a full refund.'
              },
              {
                q: 'What happens if I exceed my limits?',
                a: 'We\'ll notify you when you\'re approaching your limits. You can upgrade anytime to continue using the service.'
              },
              {
                q: 'Can I cancel anytime?',
                a: 'Yes, you can cancel your subscription at any time. You\'ll continue to have access until the end of your billing period.'
              }
            ].map((faq, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`} className="border-white/5 rounded-xl bg-white/[0.03] px-4 mb-4">
                <AccordionTrigger className="text-left font-semibold text-emerald-400 hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-slate-400 pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Trust Signals */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-slate-400">
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 transition-colors">
              <Shield className="w-6 h-6 text-emerald-400" />
              <span className="text-xs font-medium">Bank-Level Security</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 transition-colors">
              <CreditCard className="w-6 h-6 text-emerald-400" />
              <span className="text-xs font-medium">Secure Payments</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 transition-colors">
              <Clock className="w-6 h-6 text-emerald-400" />
              <span className="text-xs font-medium">Cancel Anytime</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 transition-colors">
              <Star className="w-6 h-6 text-emerald-400 fill-emerald-400" />
              <span className="text-xs font-medium">7-Day Guarantee</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
      </div>
    </>
  )
}
