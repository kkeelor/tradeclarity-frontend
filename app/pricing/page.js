// app/pricing/page.js
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Zap, TrendingUp, Crown, ArrowRight, Sparkles, Shield, Clock, CreditCard, ChevronDown } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { getTierDisplayName } from '@/lib/featureGates'
import { toast } from 'sonner'
import Footer from '../components/Footer'
import { getCurrencySymbol } from '../analyze/utils/currencyFormatter'
import { convertCurrencySync, getCurrencyRates } from '../analyze/utils/currencyConverter'

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

// Currency dropdown component (same as analytics page)
function CurrencyDropdown({ currencies, selectedCurrency, onSelectCurrency }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

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

  // Calculate position for fixed dropdown
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      })
    }
  }, [isOpen])

  return (
    <>
      <div className="relative" ref={buttonRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-white"
        >
          <span>{getCurrencySymbol(selectedCurrency)}</span>
          <span>{selectedCurrency}</span>
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div 
          ref={dropdownRef}
          className="fixed w-48 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-lg shadow-2xl z-[100] overflow-hidden max-h-80 overflow-y-auto scrollbar-hide"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`
          }}
        >
          {currencies.map((curr) => (
            <button
              key={curr}
              onClick={() => {
                onSelectCurrency(curr)
                setIsOpen(false)
              }}
              className={`w-full px-3 py-2 text-left text-xs transition flex items-center gap-2 ${
                selectedCurrency === curr
                  ? 'bg-emerald-400/20 text-emerald-300 font-medium'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <span className="w-8 text-right">{getCurrencySymbol(curr)}</span>
              <span className="flex-1">{curr}</span>
              <span className="text-[10px] text-slate-500">{currencyNames[curr] || ''}</span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

export default function PricingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [billingCycle, setBillingCycle] = useState('monthly') // 'monthly' or 'annual'
  const [loading, setLoading] = useState(false)
  const [currentTier, setCurrentTier] = useState('free')
  const [currency, setCurrency] = useState('USD')
  
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
        toast.error('Plan configuration error. Please contact support.')
        return
      }

      const response = await fetch('/api/razorpay/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          userId: user.id,
          billingCycle
        })
      })

      const data = await response.json()
      
      if (data.error) {
        toast.error(data.error)
        return
      }

      // Redirect to Razorpay payment page
      if (data.authLink) {
        window.location.href = data.authLink
      }
    } catch (error) {
      console.error('Error creating checkout:', error)
      toast.error('Failed to start checkout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const savings = billingCycle === 'annual' ? 17 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push(user ? '/dashboard' : '/')}
              className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2"
            >
              ? Back {user ? 'to Dashboard' : 'to Home'}
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
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Transparent pricing for every trader. Start free, upgrade when you need more.
          </p>

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
                  <span className="ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                    Save {savings}%
                  </span>
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
                    ? 'border-emerald-500/50 bg-emerald-500/5 shadow-lg shadow-emerald-500/10 scale-105'
                    : 'border-white/5 bg-white/[0.03] hover:border-white/10'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full text-xs font-semibold text-white">
                    Most Popular
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
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-full text-xs font-semibold text-red-300 mb-4">
                      <Sparkles className="w-3 h-3" />
                      <span>Launch Offer: 50% OFF</span>
                    </div>
                  )}
                  
                  <div className="flex items-baseline gap-2">
                    {(key === 'trader' || key === 'pro') && (
                      <span className="text-xl text-slate-500 line-through">
                        {getCurrencySymbol(currency)}{formatPrice(convertedMonthlyPrice)}
                      </span>
                    )}
                    <span className="text-4xl font-bold">
                      {getCurrencySymbol(currency)}{formatPrice(convertedDiscountedMonthlyPrice)}
                    </span>
                    <span className="text-slate-400">
                      /{billingCycle === 'annual' ? 'month' : 'month'}
                      {billingCycle === 'annual' && (
                        <span className="block text-xs mt-1">
                          {key === 'trader' || key === 'pro' ? (
                            <>
                              <span className="line-through text-slate-500">
                                {getCurrencySymbol(currency)}{formatPrice(convertedAnnualPrice)}
                              </span>
                              {' '}
                              <span className="text-emerald-400">
                                {getCurrencySymbol(currency)}{formatPrice(convertedDiscountedAnnualPrice)}
                              </span>
                              /year
                            </>
                          ) : (
                            <>
                              billed {getCurrencySymbol(currency)}{formatPrice(convertedAnnualPrice)}/year
                            </>
                          )}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleUpgrade(key)}
                  disabled={loading || isCurrentTier}
                  className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 mb-6 ${
                    isCurrentTier
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : isPopular
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-105'
                      : 'bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-white'
                  }`}
                >
                  {isCurrentTier ? 'Current Plan' : loading ? 'Processing...' : 'Upgrade'}
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
          <div className="space-y-4">
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
              <div key={idx} className="rounded-xl border border-white/5 bg-white/[0.03] p-6">
                <h3 className="font-semibold mb-2 text-emerald-400">{faq.q}</h3>
                <p className="text-sm text-slate-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Signals */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <div className="flex items-center justify-center gap-8 text-slate-400 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span>Secure payments</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              <span>No credit card required for Free</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  )
}
