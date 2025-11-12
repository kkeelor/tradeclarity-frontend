// app/pricing/page.js
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Zap, TrendingUp, Crown, ArrowRight, Sparkles, Shield, Clock, CreditCard, ChevronDown, ArrowLeft, Star, Users, TrendingDown } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { getTierDisplayName } from '@/lib/featureGates'
import { toast } from 'sonner'
import Footer from '../components/Footer'
import { getCurrencySymbol, formatCurrencyNumber } from '../analyze/utils/currencyFormatter'
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
      '500 trades analyzed per month',
      '1 exchange connection',
      'Full analytics on those trades',
      'All insights, patterns, psychology scores',
      'CSV upload capability'
    ],
    limitations: []
  },
  trader: {
    name: 'Trader',
    price: 29,
    priceAnnual: 290, // ~10 months (save ~17%)
    description: 'Best for active traders',
    icon: TrendingUp,
    color: 'emerald',
    popular: true,
    features: [
      '1,000 trades analyzed per month',
      '3 exchange connections',
      'Everything else unlimited'
    ],
    limitations: []
  },
  pro: {
    name: 'Pro',
    price: 79,
    priceAnnual: 790, // ~10 months (save ~17%)
    description: 'For professional traders',
    icon: Crown,
    color: 'cyan',
    features: [
      'Unlimited trades analyzed',
      'Unlimited exchange connections',
      'Priority support',
      'Early access to new features'
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

  // Helper function to safely convert currency for display
  const safeConvertForDisplay = (amountUSD, targetCurrency) => {
    if (targetCurrency === 'USD') return amountUSD
    
    const result = convertCurrencySync(amountUSD, 'USD', targetCurrency)
    
    // If conversion failed, return USD amount as fallback
    if (result && typeof result === 'object' && result.success === false) {
      console.warn('Currency conversion failed for display:', result.error)
      return amountUSD // Fallback to USD
    }
    
    // Validate result
    if (typeof result !== 'number' || !isFinite(result) || result <= 0) {
      console.warn('Invalid conversion result for display:', result)
      return amountUSD // Fallback to USD
    }
    
    return result
  }

  // Detect if user is in India
  const detectUserLocation = async () => {
    try {
      // Try to detect from browser timezone first (fastest)
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (timezone.includes('Asia/Kolkata') || timezone.includes('Calcutta') || timezone.includes('Asia/Calcutta')) {
        return 'IN'
      }
      
      // Also check locale
      const locale = Intl.DateTimeFormat().resolvedOptions().locale
      if (locale.includes('IN') || locale.includes('hi-IN') || locale.includes('en-IN')) {
        return 'IN'
      }
      
      // Fallback to IP geolocation (requires API call)
      // For now, we'll use timezone detection only
      // TODO: Add IP geolocation service if needed
      return null
    } catch (error) {
      console.warn('Could not detect user location:', error)
      return null
    }
  }

  // Initialize currency from localStorage or detect India
  useEffect(() => {
    const initializeCurrency = async () => {
      // First, detect if user is in India
      const country = await detectUserLocation()
      
      // If user is in India, always use INR (override localStorage)
      if (country === 'IN') {
        setCurrency('INR')
        if (typeof window !== 'undefined') {
          localStorage.setItem('tradeclarity_currency', 'INR')
        }
        return
      }
      
      // For non-India users, check localStorage
      const savedCurrency = typeof window !== 'undefined' ? localStorage.getItem('tradeclarity_currency') : null
      if (savedCurrency && availableCurrencies.includes(savedCurrency)) {
        setCurrency(savedCurrency)
        return
      }
      
      // Default to USD for all non-India users
      setCurrency('USD')
      if (typeof window !== 'undefined') {
        localStorage.setItem('tradeclarity_currency', 'USD')
      }
    }
    
    initializeCurrency()
    
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

    // If clicking on current tier, show toast
    if (tier === currentTier) {
      toast.info(`You are already on the ${PRICING_PLANS[tier].name} plan`)
      return
    }

    // If clicking on free tier (downgrade), show info toast
    if (tier === 'free') {
      toast.info('To downgrade to Free plan, please contact support')
      return
    }

    setLoading(true)
    
    // Safety timeout: reset loading state after 2 minutes if something goes wrong
    let loadingTimeout = setTimeout(() => {
      console.warn('Loading timeout reached, resetting state')
      setLoading(false)
    }, 120000) // 2 minutes
    
    // Track if cleanup has been called to prevent multiple calls
    let isCleanedUp = false
    
    // Helper function to cleanup
    const cleanup = () => {
      if (isCleanedUp) return
      isCleanedUp = true
      clearTimeout(loadingTimeout)
      setLoading(false)
    }
    
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
        cleanup()
        toast.error('Plan configuration error. Please contact support.')
        return
      }

      // Calculate price
      const plan = PRICING_PLANS[tier]
      const monthlyPriceUSD = billingCycle === 'annual' ? Math.round(plan.priceAnnual / 12) : plan.price
      const discountMultiplier = 0.5 // 50% discount
      const discountedPriceUSD = monthlyPriceUSD * discountMultiplier
      
      // Determine payment currency: INR for India, USD for everyone else
      const isIndia = currency === 'INR'
      const paymentCurrency = isIndia ? 'INR' : 'USD'
      
      // Convert amount to payment currency
      let paymentAmount
      if (isIndia) {
        const conversionResult = convertCurrencySync(discountedPriceUSD, 'USD', 'INR')
        
        // Check if conversion failed
        if (conversionResult && typeof conversionResult === 'object' && conversionResult.success === false) {
          console.error('Currency conversion failed:', conversionResult.error)
          cleanup()
          toast.error('This action could not be completed. Please contact support at tradeclarity-help@gmail.com')
          return
        }
        
        // Validate conversion result is a valid number
        if (typeof conversionResult !== 'number' || !isFinite(conversionResult) || conversionResult <= 0) {
          console.error('Invalid conversion result:', conversionResult)
          cleanup()
          toast.error('This action could not be completed. Please contact support at tradeclarity-help@gmail.com')
          return
        }
        
        paymentAmount = conversionResult
      } else {
        paymentAmount = discountedPriceUSD
      }

      // Validate payment amount before proceeding
      if (!paymentAmount || !isFinite(paymentAmount) || paymentAmount <= 0) {
        console.error('Invalid payment amount:', paymentAmount)
        cleanup()
        toast.error('This action could not be completed. Please contact support at tradeclarity-help@gmail.com')
        return
      }

      // Create order
      console.log('Creating Razorpay order:', { paymentAmount, paymentCurrency, planId, tier, billingCycle })
      const orderResponse = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: paymentAmount,
          currency: paymentCurrency,
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
        cleanup()
        toast.error(errorData.error || errorData.details || 'Failed to create order. Please try again.')
        return
      }

      const orderData = await orderResponse.json()
      console.log('Order created successfully:', orderData)
      
      if (orderData.error) {
        console.error('Order error:', orderData.error)
        cleanup()
        toast.error(orderData.error)
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
          image: 'https://www.tradeclarity.xyz/logo.png',
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
                cleanup()
                toast.error(errorData.error || 'Payment verification failed. Please contact support.')
                return
              }

              const verifyData = await verifyResponse.json()
              console.log('Payment verification result:', verifyData)

              if (verifyData.success) {
                cleanup()
                toast.success('Payment successful! Your subscription is now active.')
                
                // Clear subscription cache so dashboard will fetch fresh data
                if (user?.id) {
                  const cacheKey = `subscription_${user.id}`
                  localStorage.removeItem(cacheKey)
                  console.log('Cleared subscription cache after upgrade')
                }
                
                // Refresh subscription status
                await fetchUserSubscription()
                // Redirect to dashboard
                setTimeout(() => {
                  router.push('/dashboard')
                }, 2000)
              } else {
                cleanup()
                toast.error(verifyData.error || 'Payment verification failed')
              }
            } catch (error) {
              console.error('Error verifying payment:', error)
              cleanup()
              toast.error('Payment verification failed. Please contact support.')
            }
          },
          prefill: {
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Customer',
            email: user.email || '',
            contact: user.user_metadata?.phone || ''
          },
          readonly: {
            // Make email readonly since we already have it from user account
            email: true,
            // Make contact readonly if we have it, otherwise let user fill it
            contact: !!user.user_metadata?.phone
          },
          notes: {
            userId: user.id,
            tier: tier,
            billingCycle: billingCycle
          },
          theme: {
            color: '#10b981' // emerald-500
          },
          // Handle modal close via onClose callback (primary method - fires when user closes modal)
          onClose: function() {
            console.log('Razorpay modal closed via onClose callback')
            cleanup()
          }
        }

        const rzp = new window.Razorpay(options)
        
        // Handle payment failure
        rzp.on('payment.failed', function (response) {
          console.error('Payment failed:', response.error)
          cleanup()
          toast.error(`Payment failed: ${response.error.description || response.error.reason || 'Unknown error'}`)
        })

        // Handle modal close via event listener (backup - in case onClose doesn't fire)
        rzp.on('modal.close', function () {
          console.log('Razorpay modal closed via event listener')
          cleanup()
        })

        // Open Razorpay checkout
        rzp.open()
      } else {
        cleanup()
        toast.error('Razorpay checkout is loading. Please wait a moment and try again.')
      }
    } catch (error) {
      console.error('Error creating checkout:', error)
      cleanup()
      toast.error('Failed to start checkout. Please try again.')
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
          <div className="mt-8 flex flex-row items-center justify-center gap-6 flex-wrap">
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
              <span className="text-sm text-slate-400">Currency:</span>
              <CurrencyDropdown
                currencies={availableCurrencies}
                selectedCurrency={currency}
                onSelectCurrency={handleCurrencyChange}
              />
            </div>
          </div>
        </div>

        {/* Unified Pricing & Feature Comparison Table */}
        <div className="max-w-5xl mx-auto mb-16">
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-3 py-3 text-sm font-semibold text-slate-300 w-[180px]">Plan</th>
                    {Object.entries(PRICING_PLANS).map(([key, plan]) => {
                      const Icon = plan.icon
                      const isCurrentTier = currentTier === key
                      const isPopular = plan.popular
                      
                      // Calculate prices
                      const monthlyPriceUSD = billingCycle === 'annual' ? Math.round(plan.priceAnnual / 12) : plan.price
                      const discountMultiplier = (key === 'trader' || key === 'pro') ? 0.5 : 1
                      const discountedMonthlyPriceUSD = monthlyPriceUSD * discountMultiplier
                      const convertedMonthlyPrice = currency === 'USD' ? monthlyPriceUSD : safeConvertForDisplay(monthlyPriceUSD, currency)
                      const convertedDiscountedMonthlyPrice = currency === 'USD' ? discountedMonthlyPriceUSD : safeConvertForDisplay(discountedMonthlyPriceUSD, currency)
                      
                      const formatPrice = (price) => {
                        if (price === 0) return '0'
                        const decimals = currency === 'JPY' ? 0 : 2
                        return price.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                      }
                      
                      const getPriceFontSize = (priceString) => {
                        const length = priceString.length
                        if (length <= 6) return 'text-2xl'
                        if (length <= 8) return 'text-xl'
                        if (length <= 10) return 'text-lg'
                        return 'text-base'
                      }
                      
                      const discountedPriceString = formatPrice(convertedDiscountedMonthlyPrice)
                      const priceFontSize = getPriceFontSize(discountedPriceString)
                      
                      return (
                        <th 
                          key={key}
                          className={`text-center px-2 py-3 ${isPopular ? 'bg-emerald-500/5' : key === 'pro' ? 'bg-cyan-500/5' : ''}`}
                        >
                          <div className="flex flex-col items-center gap-1.5">
                            {(key === 'trader' || key === 'pro') && (
                              <Badge variant="warning" className="inline-flex items-center gap-1 animate-pulse px-1.5 py-0.5 text-[10px] mb-0.5">
                                <Sparkles className="w-2 h-2" />
                                50% off till Dec 31, 2025
                              </Badge>
                            )}
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-${plan.color}-500/20 to-${plan.color}-600/20 border border-${plan.color}-500/30 flex items-center justify-center`}>
                              <Icon className={`w-4 h-4 text-${plan.color}-400`} />
                            </div>
                            <div>
                              <h3 className={`text-base font-bold mb-0.5 ${isPopular ? 'text-emerald-400' : key === 'pro' ? 'text-cyan-400' : 'text-white'}`}>
                                {plan.name}
                              </h3>
                              <p className="text-[10px] text-slate-400 mb-1.5 leading-tight">{plan.description}</p>
                              
                              {/* Pricing */}
                              <div className="flex flex-col items-center gap-0.5">
                                {(key === 'trader' || key === 'pro') && (
                                  <span className="text-xs text-slate-500 line-through">
                                    {getCurrencySymbol(currency)}{formatPrice(convertedMonthlyPrice)}
                                  </span>
                                )}
                                <div className="flex items-baseline gap-0.5">
                                  <span className={`text-lg font-bold tabular-nums text-white`}>
                                    {getCurrencySymbol(currency)}{discountedPriceString}
                                  </span>
                                  <span className="text-xs text-slate-400">/mo</span>
                                </div>
                                {billingCycle === 'annual' && (key === 'trader' || key === 'pro') && (
                                  <span className="text-[10px] text-emerald-400">
                                    {getCurrencySymbol(currency)}{formatPrice(currency === 'USD' ? plan.priceAnnual * discountMultiplier : safeConvertForDisplay(plan.priceAnnual * discountMultiplier, currency))}/yr
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* Feature Rows */}
                  {[
                    { feature: 'Trades Analyzed/Month', free: '500', trader: '1,000', pro: 'Unlimited' },
                    { feature: 'Exchange Connections', free: '1', trader: '3', pro: 'Unlimited' },
                    { feature: 'Full Analytics', free: true, trader: true, pro: true },
                    { feature: 'All Insights & Patterns', free: true, trader: true, pro: true },
                    { feature: 'Psychology Scores', free: true, trader: true, pro: true },
                    { feature: 'CSV Upload', free: true, trader: true, pro: true },
                    { feature: 'Priority Support', free: false, trader: false, pro: true },
                    { feature: 'Early Access Features', free: false, trader: false, pro: true },
                  ].map((row, idx) => (
                    <tr key={idx} className="border-b border-white/5 last:border-0">
                      <td className="px-3 py-2 text-xs text-slate-300">{row.feature}</td>
                      {['free', 'trader', 'pro'].map((key) => {
                        const value = row[key]
                        return (
                          <td key={key} className="px-2 py-2 text-center">
                            {typeof value === 'boolean' ? (
                              value ? (
                                <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                              ) : (
                                <X className="w-4 h-4 text-slate-600 mx-auto" />
                              )
                            ) : (
                              <span className={`text-xs ${key === 'free' ? 'text-slate-400' : key === 'trader' ? 'text-emerald-400' : 'text-cyan-400'}`}>
                                {value}
                              </span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  
                  {/* CTA Row */}
                  <tr className="border-t-2 border-white/10">
                    <td className="px-3 py-3"></td>
                    {Object.entries(PRICING_PLANS).map(([key, plan]) => {
                      const isCurrentTier = currentTier === key
                      const isPopular = plan.popular
                      
                      // Determine if button should show check icon
                      // - Free tier: only free button shows check
                      // - Trader tier: free and trader buttons show check, pro is clickable
                      // - Pro tier: all buttons show check
                      const shouldShowCheck = 
                        isCurrentTier || 
                        (currentTier === 'trader' && key === 'free') || 
                        (currentTier === 'pro' && key !== 'pro')
                      const isDisabled = shouldShowCheck || loading
                      
                      // Determine button text
                      let buttonText = ''
                      if (shouldShowCheck) {
                        if (isCurrentTier) {
                          // Current tier: just check icon for free, "Current Plan" for trader/pro
                          buttonText = key === 'free' ? '' : 'Current Plan'
                        } else {
                          // Other tiers showing check (downgrade scenarios): just check icon
                          buttonText = ''
                        }
                      } else {
                        // Upgrade button: "Upgrade to [Tier Name]"
                        buttonText = `Upgrade to ${plan.name}`
                      }
                      
                      return (
                        <td key={key} className="px-2 py-3">
                          <button
                            onClick={() => handleUpgrade(key)}
                            disabled={isDisabled}
                            className={`w-full py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                              shouldShowCheck
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                : loading
                                ? 'bg-slate-700 text-slate-300 cursor-wait opacity-75'
                                : isPopular
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30'
                                : key === 'pro'
                                ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30'
                                : 'bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-white'
                            }`}
                          >
                            {shouldShowCheck ? (
                              <span className="flex items-center justify-center gap-1.5">
                                <Check className="w-3.5 h-3.5" />
                                {buttonText && <span>{buttonText}</span>}
                              </span>
                            ) : loading ? (
                              'Processing...'
                            ) : (
                              <span className="flex items-center justify-center gap-1.5">
                                {buttonText}
                                <ArrowRight className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
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
