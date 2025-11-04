// app/billing/page.js
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, Calendar, CheckCircle, XCircle, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { getTierDisplayName, getRemainingQuota } from '@/lib/featureGates'
import { toast } from 'sonner'
import Footer from '../components/Footer'

export default function BillingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState(false)
  const [reactivating, setReactivating] = useState(false)

  useEffect(() => {
    if (user) {
      fetchSubscription()
    } else {
      router.push('/auth/login?redirect=/billing')
    }
  }, [user])

  const fetchSubscription = async () => {
    try {
      const response = await fetch(`/api/subscriptions/current?userId=${user?.id}`)
      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
      toast.error('Failed to load subscription details')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You\'ll continue to have access until the end of your billing period.')) {
      return
    }

    setCanceling(true)
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success('Subscription canceled successfully')
        await fetchSubscription()
      } else {
        toast.error(data.error || 'Failed to cancel subscription')
      }
    } catch (error) {
      console.error('Error canceling subscription:', error)
      toast.error('Failed to cancel subscription')
    } finally {
      setCanceling(false)
    }
  }

  const handleReactivateSubscription = async () => {
    setReactivating(true)
    try {
      const response = await fetch('/api/subscriptions/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success('Subscription reactivated successfully')
        await fetchSubscription()
      } else {
        toast.error(data.error || 'Failed to reactivate subscription')
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error)
      toast.error('Failed to reactivate subscription')
    } finally {
      setReactivating(false)
    }
  }

  const handleManageBilling = async () => {
    // Redirect to Razorpay dashboard or show subscription details
    toast.info('Please manage your subscription through your email or contact support')
    // Alternatively, you can create a Razorpay customer portal link
    // For now, we'll just show a message
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  const quota = subscription ? getRemainingQuota(subscription) : null
  const isActive = subscription?.status === 'active'
  const isCanceled = subscription?.status === 'canceled'
  const isPastDue = subscription?.status === 'past_due'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8">Billing & Subscription</h1>

        {/* Current Plan */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Current Plan</h2>
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-bold ${
                  subscription?.tier === 'free' ? 'text-slate-300' :
                  subscription?.tier === 'trader' ? 'text-emerald-400' :
                  'text-cyan-400'
                }`}>
                  {getTierDisplayName(subscription?.tier || 'free')}
                </span>
                {isActive && (
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Active
                  </span>
                )}
                {isCanceled && (
                  <span className="px-3 py-1 bg-slate-500/20 text-slate-400 rounded-full text-xs font-medium flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Canceled
                  </span>
                )}
                {isPastDue && (
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Payment Failed
                  </span>
                )}
              </div>
            </div>
            {subscription?.tier !== 'free' && (
              <button
                onClick={() => router.push('/pricing')}
                className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl text-sm font-semibold text-emerald-400 transition-all"
              >
                Change Plan
              </button>
            )}
          </div>

          {subscription?.current_period_end && (
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
              <Calendar className="w-4 h-4" />
              {isCanceled ? (
                <span>Access ends on {new Date(subscription.current_period_end).toLocaleDateString()}</span>
              ) : (
                <span>Renews on {new Date(subscription.current_period_end).toLocaleDateString()}</span>
              )}
            </div>
          )}

          {isPastDue && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-300 mb-1">Payment Failed</p>
                  <p className="text-xs text-slate-400 mb-3">
                    Your last payment attempt failed. Please update your payment method to continue using TradeClarity.
                  </p>
                  <button
                    onClick={handleManageBilling}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                  >
                    Update Payment Method →
                  </button>
                </div>
              </div>
            </div>
          )}

          {subscription?.cancel_at_period_end && (
            <div className="bg-slate-500/10 border border-slate-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-300 mb-1">Subscription Canceled</p>
                  <p className="text-xs text-slate-400 mb-3">
                    Your subscription will end on {new Date(subscription.current_period_end).toLocaleDateString()}. You can reactivate it anytime before then.
                  </p>
                  <button
                    onClick={handleReactivateSubscription}
                    disabled={reactivating}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    {reactivating ? 'Reactivating...' : 'Reactivate Subscription →'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Usage */}
        {quota && subscription?.tier !== 'free' && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Usage This Month</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">Exchange Connections</p>
                <p className="text-2xl font-bold text-slate-200">
                  {subscription.exchanges_connected} / {quota.connections === 'Unlimited' ? '∞' : typeof quota.connections === 'number' ? subscription.exchanges_connected + quota.connections : quota.connections}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Trades Analyzed</p>
                <p className="text-2xl font-bold text-slate-200">
                  {subscription.trades_analyzed_this_month} / {quota.trades === 'Unlimited' ? '∞' : typeof quota.trades === 'number' ? subscription.trades_analyzed_this_month + quota.trades : quota.trades}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Reports Generated</p>
                <p className="text-2xl font-bold text-slate-200">
                  {subscription.reports_generated_this_month} / {quota.reports === 'Unlimited' ? '∞' : typeof quota.reports === 'number' ? subscription.reports_generated_this_month + quota.reports : quota.reports}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method */}
        {subscription?.tier !== 'free' && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Payment Method</h2>
              <button
                onClick={handleManageBilling}
                className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 rounded-xl text-sm font-semibold text-white transition-all"
              >
                Manage
              </button>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <CreditCard className="w-5 h-5" />
              <span>Manage your payment method and billing history in Razorpay</span>
            </div>
          </div>
        )}

        {/* Actions */}
        {subscription?.tier !== 'free' && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold mb-4">Subscription Management</h2>
            <div className="space-y-3">
              {!subscription?.cancel_at_period_end ? (
                <button
                  onClick={handleCancelSubscription}
                  disabled={canceling}
                  className="w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-xl text-sm font-semibold text-red-400 transition-all disabled:opacity-50"
                >
                  {canceling ? 'Canceling...' : 'Cancel Subscription'}
                </button>
              ) : null}
              <button
                onClick={() => router.push('/pricing')}
                className="w-full px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl text-sm font-semibold text-emerald-400 transition-all"
              >
                View Plans & Upgrade
              </button>
            </div>
          </div>
        )}

        {subscription?.tier === 'free' && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Ready to unlock more?</h2>
            <p className="text-sm text-slate-400 mb-4">
              Upgrade to Trader or Pro to get unlimited analytics, historical tracking, and more.
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-xl text-sm font-semibold text-white transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
            >
              View Plans
            </button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
