// app/pricing/page.js
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Zap, TrendingUp, Crown, ArrowRight, Sparkles, Shield, Clock, CreditCard, ChevronDown, Star, Users, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'
import { getTierDisplayName } from '@/lib/featureGates'
import { toast } from 'sonner'
import Footer from '../components/Footer'
import Header from '../analyze/components/Header'
import { getCurrencySymbol, formatCurrencyNumber } from '../analyze/utils/currencyFormatter'
import { convertCurrencySync, getCurrencyRates } from '../analyze/utils/currencyConverter'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui'
import Script from 'next/script'
import { trackSubscription, trackPageView } from '@/lib/analytics'

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
      'Claude 3.5 Haiku AI model',
      'Full analytics on those trades',
      'All insights, patterns, psychology scores',
      'CSV upload capability'
    ],
    limitations: []
  },
  trader: {
    name: 'Trader',
    price: 49,
    priceAnnual: 588, // 12 months (49 * 12)
    description: 'Best for active traders',
    icon: TrendingUp,
    color: 'emerald',
    popular: true,
    features: [
      '1,000 trades analyzed per month',
      '3 exchange connections',
      'Claude 3.5 Haiku AI model',
      'Everything else unlimited'
    ],
    limitations: []
  },
  pro: {
    name: 'Pro',
    price: 99,
    priceAnnual: 1188, // 12 months (99 * 12)
    description: 'For professional traders',
    icon: Crown,
    color: 'cyan',
    features: [
      'Unlimited trades analyzed',
      'Unlimited exchange connections',
      'Claude Sonnet 4.5 AI model',
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
        <button className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white/90">
          <span>{getCurrencySymbol(selectedCurrency)}</span>
          <span>{selectedCurrency}</span>
          <ChevronDown className="h-3 w-3 transition-transform" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-black border-white/10">
        {currencies.map((curr) => (
          <DropdownMenuItem
            key={curr}
            onClick={() => onSelectCurrency(curr)}
            className={`flex items-center gap-2 text-xs cursor-pointer ${
              selectedCurrency === curr
                ? 'bg-white/10 text-white/90 font-medium data-[highlighted]:bg-white/10 data-[highlighted]:text-white/90'
                : 'text-white/70 data-[highlighted]:bg-white/10 data-[highlighted]:text-white/90'
            }`}
          >
            <span className="w-8 text-right">{getCurrencySymbol(curr)}</span>
            <span className="flex-1">{curr}</span>
            <span className="text-[10px] text-white/40">{currencyNames[curr] || ''}</span>
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
  const razorpayInstanceRef = useRef(null)
  
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
      // Check localStorage first (fastest)
      const savedCurrency = typeof window !== 'undefined' ? localStorage.getItem('tradeclarity_currency') : null
      if (savedCurrency && availableCurrencies.includes(savedCurrency)) {
        setCurrency(savedCurrency)
        // Pre-fetch currency rates in background
        getCurrencyRates().catch(() => {})
        return
      }
      
      // Detect if user is in India (async, non-blocking)
      detectUserLocation().then(country => {
        if (country === 'IN') {
          setCurrency('INR')
          if (typeof window !== 'undefined') {
            localStorage.setItem('tradeclarity_currency', 'INR')
          }
        } else {
          setCurrency('USD')
          if (typeof window !== 'undefined') {
            localStorage.setItem('tradeclarity_currency', 'USD')
          }
        }
        // Pre-fetch currency rates after detection
        getCurrencyRates().catch(() => {})
      })
    }
    
    initializeCurrency()
  }, [])

  // Handle currency change with localStorage persistence
  const handleCurrencyChange = (newCurrency) => {
    setCurrency(newCurrency)
    if (typeof window !== 'undefined') {
      localStorage.setItem('tradeclarity_currency', newCurrency)
    }
  }

  useEffect(() => {
    // Track pricing page view
    trackPageView('pricing')
    
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

    // Razorpay is only for INR currency
    if (currency !== 'INR') {
      // For non-INR currencies, PayPal handles the payment flow
      // The PayPal buttons are rendered separately, so this function shouldn't be called
      return
    }

    // Track upgrade button click
    trackSubscription.upgradeButtonClick(tier, billingCycle)

    // Reset any existing Razorpay instance
    if (razorpayInstanceRef.current) {
      try {
        razorpayInstanceRef.current.close()
      } catch (e) {
        // Ignore errors if already closed
      }
      razorpayInstanceRef.current = null
    }
    
    setLoading(true)
    
    // Safety timeout: reset loading state after 2 minutes if something goes wrong
    const loadingTimeout = setTimeout(() => {
      console.warn('Loading timeout reached, resetting state')
      setLoading(false)
      razorpayInstanceRef.current = null
    }, 120000) // 2 minutes
    
    // Track if cleanup has been called to prevent multiple calls
    let isCleanedUp = false
    let safetyCheckTimeout = null
    const eventListenersToRemove = []
    const timeoutsToClear = []
    
    // Helper function to cleanup
    const cleanup = () => {
      if (isCleanedUp) {
        return
      }
      isCleanedUp = true
      clearTimeout(loadingTimeout)
      if (safetyCheckTimeout) {
        clearTimeout(safetyCheckTimeout)
        safetyCheckTimeout = null
      }
      // Clear all registered timeouts
      timeoutsToClear.forEach(timeout => clearTimeout(timeout))
      timeoutsToClear.length = 0
      // Remove all event listeners
      eventListenersToRemove.forEach(remove => remove())
      eventListenersToRemove.length = 0
      setLoading(false)
      razorpayInstanceRef.current = null
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

      // Track payment initiated
      trackSubscription.paymentInitiated(tier, billingCycle, paymentCurrency, paymentAmount)

      // Create order
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

              if (verifyData.success) {
                cleanup()
                toast.success('Payment successful! Your subscription is now active.')
                
                // Track payment completed and subscription activated
                trackSubscription.paymentCompleted(tier, billingCycle, paymentCurrency, paymentAmount)
                trackSubscription.subscriptionActivated(tier, billingCycle)
                
                // Clear subscription cache so dashboard will fetch fresh data
                if (user?.id) {
                  const cacheKey = `subscription_${user.id}`
                  localStorage.removeItem(cacheKey)
                  console.log('Cleared subscription cache after upgrade')
                }
                
                // Refresh subscription status
                await fetchUserSubscription()
                
                // Check if user was upgrading to connect an exchange
                const pendingConnection = sessionStorage.getItem('pendingExchangeConnection')
                const returnUrl = sessionStorage.getItem('upgradeReturnUrl')
                
                // Redirect to dashboard (with autoConnect flag if pending connection exists)
                const redirectUrl = pendingConnection 
                  ? '/dashboard?autoConnect=true' 
                  : returnUrl || '/dashboard'
                
                // Clean up sessionStorage
                sessionStorage.removeItem('upgradeReturnUrl')
                
                setTimeout(() => {
                  router.push(redirectUrl)
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
            cleanup()
          }
        }

        const rzp = new window.Razorpay(options)
        razorpayInstanceRef.current = rzp
        
        // Handle payment failure
        rzp.on('payment.failed', function (response) {
          console.error('Payment failed:', response.error)
          cleanup()
          toast.error(`Payment failed: ${response.error.description || response.error.reason || 'Unknown error'}`)
        })

        // Handle modal close via event listener (backup - in case onClose doesn't fire)
        rzp.on('modal.close', function () {
          cleanup()
        })

        // Open Razorpay checkout
        rzp.open()
        
        // Polling approach: Check if Razorpay modal DOM element exists
        // Razorpay creates modal elements - we'll check for common selectors
        let pollInterval = null
        let modalWasOpen = false
        
        const checkRazorpayModal = () => {
          if (isCleanedUp) {
            if (pollInterval) {
              clearInterval(pollInterval)
              pollInterval = null
            }
            return
          }
          
          // Check multiple possible Razorpay modal selectors
          const razorpaySelectors = [
            '.razorpay-container',
            '[id^="razorpay"]',
            '.razorpay-checkout-frame',
            'iframe[src*="razorpay"]',
            '.razorpay-modal',
            '[class*="razorpay"]'
          ]
          
          let modalFound = false
          for (const selector of razorpaySelectors) {
            if (document.querySelector(selector)) {
              modalFound = true
              modalWasOpen = true
              break
            }
          }
          
          // If modal was open before but now it's gone, cleanup
          if (modalWasOpen && !modalFound) {
            if (pollInterval) {
              clearInterval(pollInterval)
              pollInterval = null
            }
            cleanup()
            return
          }
          
          // Mark that modal was open if we found it
          if (modalFound) {
            modalWasOpen = true
          }
        }
        
        // Start polling after a short delay to let modal render
        setTimeout(() => {
          if (!isCleanedUp) {
            pollInterval = setInterval(checkRazorpayModal, 200) // Check every 200ms
          }
        }, 500)
        
        // Store cleanup for polling interval
        eventListenersToRemove.push(() => {
          if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }
        })
        
        // Short timeout fallback: Reset after 8 seconds if still loading
        // This handles cases where modal opens but callbacks never fire
        // 8 seconds gives user time to interact but resets if stuck
        const shortTimeout = setTimeout(() => {
          if (!isCleanedUp) {
            cleanup()
          }
        }, 8000) // 8 seconds
        
        // Register timeout for cleanup
        timeoutsToClear.push(shortTimeout)
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
          setRazorpayLoaded(true)
        }}
      />
      <div className="min-h-screen bg-black text-white flex flex-col">
        <Header
          exchangeConfig={null}
          currencyMetadata={null}
          currency={currency}
          setCurrency={handleCurrencyChange}
          onNavigateDashboard={() => router.push('/dashboard')}
          onNavigateUpload={() => router.push('/data')}
          onNavigateAll={() => router.push('/analyze')}
          onNavigateVega={() => router.push('/vega')}
          onSignOut={user ? async () => {
            await fetch('/api/auth/signout', { method: 'POST' })
            router.push('/')
          } : undefined}
          hasDataSources={false}
          isDemoMode={false}
        />

      {/* Hero Section */}
      <div className="flex-1 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-3 sm:mb-4 text-white/90">
            Choose Your Plan
          </h1>
          <p className="text-base sm:text-lg text-white/60 max-w-2xl mx-auto mb-4 sm:mb-6 px-2">
            Transparent pricing for every trader. Start free, upgrade when you need more.
          </p>
          
          {/* Social Proof */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-white/70">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400/70" />
              <span>Join <span className="text-emerald-400/90 font-medium">500+</span> active traders</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-white/10"></div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-white/70">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400/70" />
              <span><span className="text-cyan-400/90 font-medium">1M+</span> trades analyzed</span>
            </div>
          </div>

        </div>

        {/* Mobile Billing Toggle & Currency Selector */}
        <div className="md:hidden mb-6 px-4">
          <div className="bg-black border border-white/10 rounded-xl p-4">
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <h3 className="text-sm font-semibold mb-2 text-white/90">Select Billing Cycle</h3>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${billingCycle === 'monthly' ? 'text-white/90' : 'text-white/50'}`}>
                    Monthly
                  </span>
                  <button
                    onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                    className="relative inline-flex h-6 w-11 items-center rounded-full bg-white/10 border border-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-sm ${billingCycle === 'annual' ? 'text-white/90' : 'text-white/50'}`}>
                    Annual
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/60">Currency:</span>
                <CurrencyDropdown
                  currencies={availableCurrencies}
                  selectedCurrency={currency}
                  onSelectCurrency={handleCurrencyChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Card Layout */}
        <div className="md:hidden space-y-4 mb-8 px-4">
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
            
            const discountedPriceString = formatPrice(convertedDiscountedMonthlyPrice)
            
            // Feature list
            const features = [
              { label: 'Trades Analyzed/Month', value: key === 'free' ? '500' : key === 'trader' ? '1,000' : 'Unlimited' },
              { label: 'Exchange Connections', value: key === 'free' ? '1' : key === 'trader' ? '3' : 'Unlimited' },
              { label: 'AI Model', value: key === 'pro' ? 'Claude Sonnet 4.5' : 'Claude 3.5 Haiku' },
              { label: 'Full Analytics', included: true },
              { label: 'All Insights & Patterns', included: true },
              { label: 'Psychology Scores', included: true },
              { label: 'CSV Upload', included: true },
              { label: 'Priority Support', included: key === 'pro' },
              { label: 'Early Access Features', included: key === 'pro' },
            ]
            
            // Determine button state
            const shouldShowCheck = 
              isCurrentTier || 
              (currentTier === 'trader' && key === 'free') || 
              (currentTier === 'pro' && key !== 'pro')
            const isDisabled = shouldShowCheck || loading
            
            let buttonText = ''
            if (shouldShowCheck) {
              buttonText = isCurrentTier ? (key === 'free' ? '' : 'Current Plan') : ''
            } else {
              buttonText = `Upgrade to ${plan.name}`
            }
            
            return (
              <div
                key={key}
                className={`rounded-xl border ${
                  isPopular || key === 'pro'
                    ? 'border-emerald-500/30 bg-black'
                    : 'border-white/10 bg-black'
                } p-5`}
              >
                {/* Plan Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white/70" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-white/90">{plan.name}</h3>
                        {(key === 'trader' || key === 'pro') && (
                          <Badge variant="warning" className="inline-flex items-center gap-1 animate-pulse px-2 py-0.5 text-[10px]">
                            <Sparkles className="w-2 h-2" />
                            50% off
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-white/50 mt-0.5">{plan.description}</p>
                    </div>
                  </div>
                </div>
                
                {/* Pricing */}
                <div className="mb-4">
                  {billingCycle === 'monthly' ? (
                    <>
                      {(key === 'trader' || key === 'pro') && (
                        <div className="text-sm text-white/40 line-through mb-1">
                          {getCurrencySymbol(currency)}{formatPrice(convertedMonthlyPrice)}/mo
                        </div>
                      )}
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-semibold tabular-nums text-white/90">
                          {getCurrencySymbol(currency)}{discountedPriceString}
                        </span>
                        <span className="text-sm text-white/50">/mo</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {(key === 'trader' || key === 'pro') && (
                        <div className="text-sm text-white/40 line-through mb-1">
                          {getCurrencySymbol(currency)}{formatPrice(currency === 'USD' ? plan.priceAnnual : safeConvertForDisplay(plan.priceAnnual, currency))}/yr
                        </div>
                      )}
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-2xl font-semibold tabular-nums text-white/90">
                          {getCurrencySymbol(currency)}{formatPrice(currency === 'USD' ? plan.priceAnnual * discountMultiplier : safeConvertForDisplay(plan.priceAnnual * discountMultiplier, currency))}
                        </span>
                        <span className="text-sm text-white/50">/yr</span>
                      </div>
                      {(key === 'trader' || key === 'pro') && (
                        <div className="text-xs text-white/70">
                          {getCurrencySymbol(currency)}{formatPrice(currency === 'USD' ? Math.round(plan.priceAnnual * discountMultiplier / 12) : safeConvertForDisplay(Math.round(plan.priceAnnual * discountMultiplier / 12), currency))}/mo
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                {/* Features List */}
                <div className="mb-4 space-y-2">
                  {features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      {feature.included !== undefined ? (
                        feature.included ? (
                          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-white/20 flex-shrink-0" />
                        )
                      ) : (
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      )}
                      <span className={`${feature.included === false ? 'text-white/40' : 'text-white/70'}`}>
                        {feature.label}
                        {feature.value && `: ${feature.value}`}
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* CTA Button */}
                <div className="mt-5">
                  {shouldShowCheck ? (
                    <div className="flex items-center justify-center py-2">
                      <Check className="w-5 h-5 text-emerald-400" />
                      {buttonText && <span className="text-sm text-white/60 ml-2">{buttonText}</span>}
                    </div>
                  ) : key === 'free' ? (
                    <div className="flex items-center justify-center py-2">
                      <Check className="w-5 h-5 text-white/40" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Razorpay Button - Only for INR */}
                      {currency === 'INR' && (
                        <button
                          onClick={() => handleUpgrade(key)}
                          disabled={isDisabled}
                          className={`w-full py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                            loading
                              ? 'bg-white/5 text-white/50 cursor-wait opacity-75 border border-white/10'
                              : isPopular
                              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 hover:border-emerald-500/50 text-white/90'
                              : key === 'pro'
                              ? 'bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 hover:border-cyan-500/50 text-white/90'
                              : 'bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white/80'
                          }`}
                        >
                          {loading ? 'Processing...' : 'Pay with Razorpay'}
                        </button>
                      )}
                      {/* PayPal Buttons */}
                      {currency !== 'INR' && key === 'trader' && billingCycle === 'monthly' && (
                        <div 
                          id={`paypal-trader-monthly-mobile-${key}`}
                          className="w-full"
                          dangerouslySetInnerHTML={{
                            __html: `
                              <style>
                                .pp-QEZSUQ2W7286U-mobile{
                                  text-align:center;
                                  border:none;
                                  border-radius:0.5rem;
                                  width:100%;
                                  padding:0.75rem 1rem;
                                  height:auto;
                                  min-height:3rem;
                                  font-weight:500;
                                  background-color:#FFD140;
                                  color:#000000;
                                  font-family:"Helvetica Neue",Arial,sans-serif;
                                  font-size:0.875rem;
                                  line-height:1rem;
                                  cursor:pointer;
                                }
                                #paypal-trader-monthly-mobile-${key} form {
                                  display:block;
                                  width:100%;
                                }
                              </style>
                              <form action="https://www.paypal.com/ncp/payment/QEZSUQ2W7286U" method="post" target="_blank">
                                <input class="pp-QEZSUQ2W7286U-mobile" type="submit" value="Use PayPal" />
                              </form>
                            `
                          }}
                        />
                      )}
                      {currency !== 'INR' && key === 'trader' && billingCycle === 'annual' && (
                        <div 
                          id={`paypal-trader-annual-mobile-${key}`}
                          className="w-full"
                          dangerouslySetInnerHTML={{
                            __html: `
                              <style>
                                .pp-DLNE2MH79RLEQ-mobile{
                                  text-align:center;
                                  border:none;
                                  border-radius:0.5rem;
                                  width:100%;
                                  padding:0.75rem 1rem;
                                  height:auto;
                                  min-height:3rem;
                                  font-weight:500;
                                  background-color:#FFD140;
                                  color:#000000;
                                  font-family:"Helvetica Neue",Arial,sans-serif;
                                  font-size:0.875rem;
                                  line-height:1rem;
                                  cursor:pointer;
                                }
                                #paypal-trader-annual-mobile-${key} form {
                                  display:block;
                                  width:100%;
                                }
                              </style>
                              <form action="https://www.paypal.com/ncp/payment/DLNE2MH79RLEQ" method="post" target="_blank">
                                <input class="pp-DLNE2MH79RLEQ-mobile" type="submit" value="Use PayPal" />
                              </form>
                            `
                          }}
                        />
                      )}
                      {currency !== 'INR' && key === 'pro' && billingCycle === 'monthly' && (
                        <div 
                          id={`paypal-pro-monthly-mobile-${key}`}
                          className="w-full"
                          dangerouslySetInnerHTML={{
                            __html: `
                              <style>
                                .pp-MWGJ35NJMZ586-mobile{
                                  text-align:center;
                                  border:none;
                                  border-radius:0.5rem;
                                  width:100%;
                                  padding:0.75rem 1rem;
                                  height:auto;
                                  min-height:3rem;
                                  font-weight:500;
                                  background-color:#FFD140;
                                  color:#000000;
                                  font-family:"Helvetica Neue",Arial,sans-serif;
                                  font-size:0.875rem;
                                  line-height:1rem;
                                  cursor:pointer;
                                }
                                #paypal-pro-monthly-mobile-${key} form {
                                  display:block;
                                  width:100%;
                                }
                              </style>
                              <form action="https://www.paypal.com/ncp/payment/MWGJ35NJMZ586" method="post" target="_blank">
                                <input class="pp-MWGJ35NJMZ586-mobile" type="submit" value="Use PayPal" />
                              </form>
                            `
                          }}
                        />
                      )}
                      {currency !== 'INR' && key === 'pro' && billingCycle === 'annual' && (
                        <div 
                          id={`paypal-pro-annual-mobile-${key}`}
                          className="w-full"
                          dangerouslySetInnerHTML={{
                            __html: `
                              <style>
                                .pp-PU2GB8AA5XA9E-mobile{
                                  text-align:center;
                                  border:none;
                                  border-radius:0.5rem;
                                  width:100%;
                                  padding:0.75rem 1rem;
                                  height:auto;
                                  min-height:3rem;
                                  font-weight:500;
                                  background-color:#FFD140;
                                  color:#000000;
                                  font-family:"Helvetica Neue",Arial,sans-serif;
                                  font-size:0.875rem;
                                  line-height:1rem;
                                  cursor:pointer;
                                }
                                #paypal-pro-annual-mobile-${key} form {
                                  display:block;
                                  width:100%;
                                }
                              </style>
                              <form action="https://www.paypal.com/ncp/payment/PU2GB8AA5XA9E" method="post" target="_blank">
                                <input class="pp-PU2GB8AA5XA9E-mobile" type="submit" value="Use PayPal" />
                              </form>
                            `
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Unified Pricing & Feature Comparison Table - Desktop Only */}
        <div className="hidden md:block max-w-[83rem] mx-auto mb-16">
          <div className="rounded-xl border border-white/10 bg-black overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-medium text-white/70 w-[140px] sm:w-[180px] md:w-[200px]">
                      <div className="flex flex-col items-center gap-1 sm:gap-1.5">
                        {/* Spacer to match badge height (for trader/pro) - empty div for Free plan alignment */}
                        <div className="h-[14px] sm:h-[18px]"></div>
                        {/* Spacer to match icon */}
                        <div className="w-6 h-6 sm:w-8 sm:h-8"></div>
                        {/* Plan label section - matches plan name + description structure */}
                        <div className="text-center">
                          <h3 className="text-sm sm:text-base font-semibold mb-0.5 sm:mb-1 text-white/70">Plan</h3>
                          <p className="text-[9px] sm:text-[10px] text-white/50 mb-1 sm:mb-1.5 leading-tight">Select billing cycle</p>
                          
                          {/* Billing Toggle - aligns with pricing section */}
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <span className={`text-[10px] sm:text-xs ${billingCycle === 'monthly' ? 'text-white/90' : 'text-white/50'}`}>
                                Monthly
                              </span>
                              <button
                                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                                className="relative inline-flex h-4 w-8 sm:h-5 sm:w-9 items-center rounded-full bg-white/10 border border-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
                              >
                                <span
                                  className={`inline-block h-2.5 w-2.5 sm:h-3 sm:w-3 transform rounded-full bg-white transition-transform ${
                                    billingCycle === 'annual' ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0.5'
                                  }`}
                                />
                              </button>
                              <span className={`text-[10px] sm:text-xs ${billingCycle === 'annual' ? 'text-white/90' : 'text-white/50'}`}>
                                Annual
                              </span>
                            </div>
                            {/* Currency Dropdown */}
                            <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5">
                              <span className="text-[9px] sm:text-xs text-white/60">Currency:</span>
                              <div className="scale-75 sm:scale-90 origin-center">
                                <CurrencyDropdown
                                  currencies={availableCurrencies}
                                  selectedCurrency={currency}
                                  onSelectCurrency={handleCurrencyChange}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </th>
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
                          className={`text-center px-1.5 sm:px-2 py-2 sm:py-3 min-w-[100px] sm:min-w-[120px] ${isPopular ? 'bg-white/5' : key === 'pro' ? 'bg-white/5' : ''}`}
                        >
                          <div className="flex flex-col items-center gap-1 sm:gap-1.5">
                            {(key === 'trader' || key === 'pro') && (
                              <Badge variant="warning" className="inline-flex items-center gap-0.5 sm:gap-1 animate-pulse px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[10px] mb-0.5 whitespace-nowrap">
                                <Sparkles className="w-1.5 h-1.5 sm:w-2 sm:h-2" />
                                <span className="hidden xs:inline">50% off till Dec 31, 2025</span>
                                <span className="xs:hidden">50% off</span>
                              </Badge>
                            )}
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center`}>
                              <Icon className={`w-3 h-3 sm:w-4 sm:h-4 text-white/70`} />
                            </div>
                            <div>
                              <h3 className={`text-sm sm:text-base font-semibold mb-0.5 sm:mb-1 ${isPopular ? 'text-white/90' : key === 'pro' ? 'text-white/90' : 'text-white/80'}`}>
                                {plan.name}
                              </h3>
                              <p className="text-[9px] sm:text-[10px] text-white/50 mb-1 sm:mb-1.5 leading-tight">{plan.description}</p>
                              
                              {/* Pricing */}
                              <div className="flex flex-col items-center gap-0.5">
                                {billingCycle === 'monthly' ? (
                                  // Monthly pricing display
                                  <>
                                    {(key === 'trader' || key === 'pro') && (
                                      <span className="text-[10px] sm:text-xs text-white/40 line-through">
                                        {getCurrencySymbol(currency)}{formatPrice(convertedMonthlyPrice)}
                                      </span>
                                    )}
                                    <div className="flex items-baseline gap-0.5">
                                      <span className={`text-base sm:text-lg font-semibold tabular-nums text-white/90`}>
                                        {getCurrencySymbol(currency)}{discountedPriceString}
                                      </span>
                                      <span className="text-[10px] sm:text-xs text-white/50">/mo</span>
                                    </div>
                                  </>
                                ) : (
                                  // Annual pricing display
                                  <>
                                    {(key === 'trader' || key === 'pro') && (
                                      <span className="text-[10px] sm:text-xs text-white/40 line-through">
                                        {getCurrencySymbol(currency)}{formatPrice(currency === 'USD' ? plan.priceAnnual : safeConvertForDisplay(plan.priceAnnual, currency))}
                                      </span>
                                    )}
                                    <div className="flex items-baseline gap-0.5">
                                      <span className={`text-base sm:text-lg font-semibold tabular-nums text-white/90`}>
                                        {getCurrencySymbol(currency)}{formatPrice(currency === 'USD' ? plan.priceAnnual * discountMultiplier : safeConvertForDisplay(plan.priceAnnual * discountMultiplier, currency))}
                                      </span>
                                      <span className="text-[10px] sm:text-xs text-white/50">/yr</span>
                                    </div>
                                    {(key === 'trader' || key === 'pro') && (
                                      <span className="text-[9px] sm:text-[10px] text-white/70">
                                        {getCurrencySymbol(currency)}{formatPrice(currency === 'USD' ? Math.round(plan.priceAnnual * discountMultiplier / 12) : safeConvertForDisplay(Math.round(plan.priceAnnual * discountMultiplier / 12), currency))}/mo
                                      </span>
                                    )}
                                  </>
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
                    { feature: 'AI Model', free: 'Claude 3.5 Haiku', trader: 'Claude 3.5 Haiku', pro: 'Claude Sonnet 4.5' },
                    { feature: 'Full Analytics', free: true, trader: true, pro: true },
                    { feature: 'All Insights & Patterns', free: true, trader: true, pro: true },
                    { feature: 'Psychology Scores', free: true, trader: true, pro: true },
                    { feature: 'CSV Upload', free: true, trader: true, pro: true },
                    { feature: 'Priority Support', free: false, trader: false, pro: true },
                    { feature: 'Early Access Features', free: false, trader: false, pro: true },
                  ].map((row, idx) => (
                    <tr key={idx} className="border-b border-white/10 last:border-0">
                      <td className="px-2 sm:px-3 py-2 sm:py-2.5 text-[11px] sm:text-xs text-white/70 font-medium">{row.feature}</td>
                      {['free', 'trader', 'pro'].map((key) => {
                        const value = row[key]
                        return (
                          <td key={key} className="px-1.5 sm:px-2 py-2 sm:py-2.5 text-center">
                            {typeof value === 'boolean' ? (
                              value ? (
                                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/70 mx-auto" />
                              ) : (
                                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/20 mx-auto" />
                              )
                            ) : (
                              <span className={`text-[11px] sm:text-xs ${key === 'free' ? 'text-white/50' : key === 'trader' ? 'text-white/80' : 'text-white/80'}`}>
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
                    <td className="px-2 sm:px-3 py-2 sm:py-3">
                      {/* Coupon-style savings badge for annual billing */}
                      {billingCycle === 'annual' && savings > 0 && (
                        <div className="flex items-center justify-center">
                          <div className="relative inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border-2 border-dashed border-emerald-500/40 bg-emerald-500/5">
                            <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400" />
                            <span className="text-[10px] sm:text-xs font-semibold text-emerald-400">
                              {savings}% savings applied
                            </span>
                          </div>
                        </div>
                      )}
                    </td>
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
                        <td key={key} className="px-1.5 sm:px-2 py-2 sm:py-3">
                          <div className="flex flex-col gap-1.5 sm:gap-2">
                            {shouldShowCheck ? (
                              <div className="flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/40" />
                                {buttonText && <span className="text-[10px] sm:text-xs text-white/40 ml-1">{buttonText}</span>}
                              </div>
                            ) : key === 'free' ? (
                              <div className="flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/40" />
                              </div>
                            ) : (
                              <>
                                {/* Buttons Row */}
                                <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 w-full">
                                  {/* Razorpay Button - Only for INR */}
                                  {currency === 'INR' && (
                                    <button
                                      onClick={() => handleUpgrade(key)}
                                      disabled={isDisabled}
                                      className={`w-full py-2.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-medium transition-all duration-300 ${
                                        loading
                                          ? 'bg-white/5 text-white/50 cursor-wait opacity-75 border border-white/10'
                                          : isPopular
                                          ? 'bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white/90'
                                          : key === 'pro'
                                          ? 'bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white/90'
                                          : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80'
                                      }`}
                                    >
                                      {loading ? (
                                        'Processing...'
                                      ) : (
                                        <span className="flex items-center justify-center">
                                          Pay with Razorpay
                                        </span>
                                      )}
                                    </button>
                                  )}
                                  {/* PayPal Button - For all non-INR currencies */}
                                  {currency !== 'INR' && key === 'trader' && billingCycle === 'monthly' && (
                                    <div 
                                      id="paypal-trader-monthly-inline"
                                      className="w-full"
                                      dangerouslySetInnerHTML={{
                                        __html: `
                                          <style>
                                            .pp-QEZSUQ2W7286U-inline{
                                              text-align:center;
                                              border:none;
                                              border-radius:0.5rem;
                                              width:100%;
                                              padding:0.625rem 0.75rem;
                                              height:auto;
                                              min-height:2.5rem;
                                              font-weight:500;
                                              background-color:#FFD140;
                                              color:#000000;
                                              font-family:"Helvetica Neue",Arial,sans-serif;
                                              font-size:0.6875rem;
                                              line-height:1rem;
                                              cursor:pointer;
                                            }
                                            @media (min-width: 640px) {
                                              .pp-QEZSUQ2W7286U-inline {
                                                padding:0.5rem 1rem;
                                                font-size:0.75rem;
                                                min-height:2rem;
                                              }
                                            }
                                            #paypal-trader-monthly-inline form {
                                              display:block;
                                              width:100%;
                                            }
                                          </style>
                                          <form action="https://www.paypal.com/ncp/payment/QEZSUQ2W7286U" method="post" target="_blank">
                                            <input class="pp-QEZSUQ2W7286U-inline" type="submit" value="Use Paypal" />
                                          </form>
                                        `
                                      }}
                                    />
                                  )}
                                  {currency !== 'INR' && key === 'trader' && billingCycle === 'annual' && (
                                    <div 
                                      id="paypal-trader-annual-inline"
                                      className="w-full"
                                      dangerouslySetInnerHTML={{
                                        __html: `
                                          <style>
                                            .pp-DLNE2MH79RLEQ-inline{
                                              text-align:center;
                                              border:none;
                                              border-radius:0.5rem;
                                              width:100%;
                                              padding:0.625rem 0.75rem;
                                              height:auto;
                                              min-height:2.5rem;
                                              font-weight:500;
                                              background-color:#FFD140;
                                              color:#000000;
                                              font-family:"Helvetica Neue",Arial,sans-serif;
                                              font-size:0.6875rem;
                                              line-height:1rem;
                                              cursor:pointer;
                                            }
                                            @media (min-width: 640px) {
                                              .pp-DLNE2MH79RLEQ-inline {
                                                padding:0.5rem 1rem;
                                                font-size:0.75rem;
                                                min-height:2rem;
                                              }
                                            }
                                            #paypal-trader-annual-inline form {
                                              display:block;
                                              width:100%;
                                            }
                                          </style>
                                          <form action="https://www.paypal.com/ncp/payment/DLNE2MH79RLEQ" method="post" target="_blank">
                                            <input class="pp-DLNE2MH79RLEQ-inline" type="submit" value="Use PayPal" />
                                          </form>
                                        `
                                      }}
                                    />
                                  )}
                                  {currency !== 'INR' && key === 'pro' && billingCycle === 'monthly' && (
                                    <div 
                                      id="paypal-pro-monthly-inline"
                                      className="w-full"
                                      dangerouslySetInnerHTML={{
                                        __html: `
                                          <style>
                                            .pp-MWGJ35NJMZ586-inline{
                                              text-align:center;
                                              border:none;
                                              border-radius:0.5rem;
                                              width:100%;
                                              padding:0.625rem 0.75rem;
                                              height:auto;
                                              min-height:2.5rem;
                                              font-weight:500;
                                              background-color:#FFD140;
                                              color:#000000;
                                              font-family:"Helvetica Neue",Arial,sans-serif;
                                              font-size:0.6875rem;
                                              line-height:1rem;
                                              cursor:pointer;
                                            }
                                            @media (min-width: 640px) {
                                              .pp-MWGJ35NJMZ586-inline {
                                                padding:0.5rem 1rem;
                                                font-size:0.75rem;
                                                min-height:2rem;
                                              }
                                            }
                                            #paypal-pro-monthly-inline form {
                                              display:block;
                                              width:100%;
                                            }
                                          </style>
                                          <form action="https://www.paypal.com/ncp/payment/MWGJ35NJMZ586" method="post" target="_blank">
                                            <input class="pp-MWGJ35NJMZ586-inline" type="submit" value="Use Paypal" />
                                          </form>
                                        `
                                      }}
                                    />
                                  )}
                                  {currency !== 'INR' && key === 'pro' && billingCycle === 'annual' && (
                                    <div 
                                      id="paypal-pro-annual-inline"
                                      className="w-full"
                                      dangerouslySetInnerHTML={{
                                        __html: `
                                          <style>
                                            .pp-PU2GB8AA5XA9E-inline{
                                              text-align:center;
                                              border:none;
                                              border-radius:0.5rem;
                                              width:100%;
                                              padding:0.625rem 0.75rem;
                                              height:auto;
                                              min-height:2.5rem;
                                              font-weight:500;
                                              background-color:#FFD140;
                                              color:#000000;
                                              font-family:"Helvetica Neue",Arial,sans-serif;
                                              font-size:0.6875rem;
                                              line-height:1rem;
                                              cursor:pointer;
                                            }
                                            @media (min-width: 640px) {
                                              .pp-PU2GB8AA5XA9E-inline {
                                                padding:0.5rem 1rem;
                                                font-size:0.75rem;
                                                min-height:2rem;
                                              }
                                            }
                                            #paypal-pro-annual-inline form {
                                              display:block;
                                              width:100%;
                                            }
                                          </style>
                                          <form action="https://www.paypal.com/ncp/payment/PU2GB8AA5XA9E" method="post" target="_blank">
                                            <input class="pp-PU2GB8AA5XA9E-inline" type="submit" value="Use PayPal" />
                                          </form>
                                        `
                                      }}
                                    />
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Powered By Section - Below Pricing Table */}
          <div className="flex items-center justify-center gap-2 text-[0.75rem] text-white/60 mt-6">
            <span>Powered by</span>
            <img src="https://www.paypalobjects.com/images/Debit_Credit_APM.svg" alt="cards" className="h-4" />
            <img src="https://www.paypalobjects.com/paypal-ui/logos/svg/paypal-wordmark-color.svg" alt="paypal" className="h-3" />
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-12 sm:mb-16 px-4">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-center text-white/90">Frequently Asked Questions</h2>
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
              <AccordionItem key={idx} value={`item-${idx}`} className="border-white/10 rounded-xl bg-black px-3 sm:px-4 mb-3 sm:mb-4">
                <AccordionTrigger className="text-left font-medium text-sm sm:text-base text-white/80 hover:no-underline py-3 sm:py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-xs sm:text-sm text-white/60 pb-3 sm:pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          {/* View All FAQs Link */}
          <div className="text-center mt-6 sm:mt-8">
            <Link href="/faq">
              <Button variant="outline" size="lg" className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white/80 text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3">
                View All FAQs
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Trust Signals */}
        <div className="max-w-4xl mx-auto text-center mb-8 sm:mb-12 px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-white/60">
            <div className="flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl bg-black border border-white/10 hover:border-white/20 transition-colors">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white/70" />
              <span className="text-[10px] sm:text-xs font-medium">Bank-Level Security</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl bg-black border border-white/10 hover:border-white/20 transition-colors">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-white/70" />
              <span className="text-[10px] sm:text-xs font-medium">Secure Payments</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl bg-black border border-white/10 hover:border-white/20 transition-colors">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white/70" />
              <span className="text-[10px] sm:text-xs font-medium">Cancel Anytime</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 rounded-xl bg-black border border-white/10 hover:border-white/20 transition-colors">
              <Star className="w-5 h-5 sm:w-6 sm:h-6 text-white/70 fill-white/70" />
              <span className="text-[10px] sm:text-xs font-medium">7-Day Guarantee</span>
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
