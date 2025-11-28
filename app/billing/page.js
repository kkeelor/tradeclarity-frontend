// app/billing/page.js
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, Calendar, CheckCircle, XCircle, AlertCircle, ArrowLeft, Loader2, Download, FileText, HelpCircle } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { getTierDisplayName } from '@/lib/featureGates'
import { toast } from 'sonner'
import Footer from '../components/Footer'
import UsageLimits from '../components/UsageLimits'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function BillingPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      return // Still loading, don't do anything yet
    }

    if (user) {
      fetchSubscription()
      fetchPaymentHistory()
    } else {
      // Only redirect if auth is done loading and user is still null
      router.push('/auth/login?redirect=/billing')
    }
  }, [user, authLoading, router])

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

  const fetchPaymentHistory = async () => {
    try {
      setLoadingHistory(true)
      const response = await fetch(`/api/subscriptions/payment-history?userId=${user?.id}`)
      if (response.ok) {
        const data = await response.json()
        setPaymentHistory(data.invoices || [])
        
        // Show migration warning if needed
        if (data.migrationNeeded) {
          toast.error('Invoices table not found. Please run database migration.', { duration: 8000 })
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error fetching payment history:', errorData)
        toast.error(errorData.error || 'Failed to load payment history')
      }
    } catch (error) {
      console.error('Error fetching payment history:', error)
      toast.error('Failed to load payment history')
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleDownloadInvoice = async (invoiceId, format = 'pdf') => {
    try {
      // First, open invoice in new tab for viewing
      const viewUrl = `/api/subscriptions/invoice-pdf?userId=${user?.id}&invoiceId=${invoiceId}&format=html`
      window.open(viewUrl, '_blank')
      
      // Then download as PDF (user can print to PDF from browser)
      const response = await fetch(`/api/subscriptions/invoice-pdf?userId=${user?.id}&invoiceId=${invoiceId}&format=${format}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `invoice-${invoiceId}.${format === 'pdf' ? 'html' : format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success(format === 'pdf' ? 'Invoice opened. Use browser Print > Save as PDF to download PDF.' : 'Invoice downloaded')
      } else {
        toast.error('Failed to download invoice')
      }
    } catch (error) {
      console.error('Error downloading invoice:', error)
      toast.error('Failed to download invoice')
    }
  }

  const handleCancelSubscription = async () => {
    const periodEndDate = subscription?.current_period_end
      ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : 'the end of your billing period'
    
    const tierName = subscription?.tier === 'trader' ? 'Trader' : subscription?.tier === 'pro' ? 'Pro' : 'Premium'

    setCanceling(true)
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      })

      const data = await response.json()
      
      if (response.ok) {
        // Use the message from the API response if available, otherwise use default
        toast.success(data.message || `Subscription canceled successfully. You'll continue to have access to ${tierName} features until ${periodEndDate}.`)
        await fetchSubscription()
        setShowCancelDialog(false) // Close dialog on success
      } else {
        const errorMessage = data.error || 'Failed to cancel subscription'
        toast.error(errorMessage)
        
        // If subscription requires support, show additional info
        if (data.requiresSupport) {
          setTimeout(() => {
            toast.info('Please contact support at tradeclarity.help@gmail.com for assistance', { duration: 5000 })
          }, 2000)
        }
      }
    } catch (error) {
      console.error('Error canceling subscription:', error)
      toast.error('Failed to cancel subscription. Please try again or contact support.')
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

  // Show loading while auth is checking or data is loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/70" />
      </div>
    )
  }

  // If auth finished loading and no user, show nothing (redirect is happening)
  if (!user) {
    return null
  }

  const isActive = subscription?.status === 'active'
  const isCanceled = subscription?.status === 'canceled'
  const isPastDue = subscription?.status === 'past_due'

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-white/60 hover:text-white/90 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-semibold mb-8 text-white/90">Billing & Subscription</h1>

        {/* Current Plan */}
        <div className="rounded-xl border border-white/10 bg-black p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-medium mb-2 text-white/90">Current Plan</h2>
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-semibold ${
                  subscription?.tier === 'free' ? 'text-white/70' :
                  subscription?.tier === 'trader' ? 'text-white/90' :
                  'text-white/90'
                }`}>
                  {getTierDisplayName(subscription?.tier || 'free')}
                </span>
                {isActive && (
                  <span className="px-3 py-1 bg-white/10 text-white/80 rounded-full text-xs font-medium flex items-center gap-1 border border-white/10">
                    <CheckCircle className="w-3 h-3" />
                    Active
                  </span>
                )}
                {isCanceled && (
                  <span className="px-3 py-1 bg-white/5 text-white/50 rounded-full text-xs font-medium flex items-center gap-1 border border-white/10">
                    <XCircle className="w-3 h-3" />
                    Canceled
                  </span>
                )}
                {isPastDue && (
                  <span className="px-3 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium flex items-center gap-1 border border-red-500/20">
                    <AlertCircle className="w-3 h-3" />
                    Payment Failed
                  </span>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-4 h-4 text-white/40 hover:text-white/60 transition-colors " />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="font-medium mb-1">{getTierDisplayName(subscription?.tier || 'free')} Plan</p>
                      {subscription?.tier === 'pro' ? (
                        <p className="text-xs leading-relaxed">
                          Unlimited exchange connections, unlimited trades analyzed, and 100,000 AI tokens/month. Full access to all features.
                        </p>
                      ) : subscription?.tier === 'trader' ? (
                        <p className="text-xs leading-relaxed">
                          Up to 3 exchange connections, 10,000 trades/month, and 50,000 AI tokens/month. Perfect for active traders.
                        </p>
                      ) : (
                        <p className="text-xs leading-relaxed">
                          Up to 1 exchange connection, 500 trades/month, and 10,000 AI tokens/month. Great for getting started.
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            {subscription?.tier !== 'free' && (
              <button
                onClick={() => router.push('/pricing')}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-lg text-sm font-medium text-white/80 transition-all"
              >
                Change Plan
              </button>
            )}
          </div>

          {subscription?.current_period_end && (
            <div className="flex items-center gap-2 text-sm text-white/60 mb-4">
              <Calendar className="w-4 h-4" />
              {isCanceled ? (
                <span>Access ends on {new Date(subscription.current_period_end).toLocaleDateString()}</span>
              ) : (
                <span>Renews on {new Date(subscription.current_period_end).toLocaleDateString()}</span>
              )}
            </div>
          )}

          {isPastDue && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400 mb-1">Payment Failed</p>
                  <p className="text-xs text-white/60 mb-3">
                    Your last payment attempt failed. Please update your payment method to continue using TradeClarity.
                  </p>
                  <button
                    onClick={handleManageBilling}
                    className="text-xs text-red-400 hover:text-red-300 font-medium"
                  >
                    Update Payment Method ?
                  </button>
                </div>
              </div>
            </div>
          )}

          {subscription?.cancel_at_period_end && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-white/60 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white/80 mb-1">Subscription Canceled</p>
                  <p className="text-xs text-white/60 mb-3">
                    Your subscription will end on {new Date(subscription.current_period_end).toLocaleDateString()}. You can reactivate it anytime before then.
                  </p>
                  <button
                    onClick={handleReactivateSubscription}
                    disabled={reactivating}
                    className="text-xs text-white/70 hover:text-white/90 font-medium"
                  >
                    {reactivating ? 'Reactivating...' : 'Reactivate Subscription ?'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Usage */}
        {subscription?.tier !== 'free' && (
          <div className="rounded-xl border border-white/10 bg-black p-6 mb-6">
            <UsageLimits subscription={subscription} />
          </div>
        )}

        {/* Payment Method */}
        {subscription?.tier !== 'free' && (
          <div className="rounded-xl border border-white/10 bg-black p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-white/90">Payment Method</h2>
              <button
                onClick={handleManageBilling}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-lg text-sm font-medium text-white/80 transition-all"
              >
                Manage
              </button>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/60">
              <CreditCard className="w-5 h-5" />
              <span>Manage your payment method and billing history in Razorpay</span>
            </div>
          </div>
        )}

        {/* Actions */}
        {subscription?.tier !== 'free' && (
          <div className="rounded-xl border border-white/10 bg-black p-6">
            <h2 className="text-xl font-medium mb-4 text-white/90">Subscription Management</h2>
            <div className="space-y-3">
              {!subscription?.cancel_at_period_end ? (
                <button
                  onClick={() => {
                    // Check if subscription has Razorpay ID before showing dialog
                    if (!subscription?.razorpay_subscription_id) {
                      toast.error('This subscription cannot be canceled online. Please contact support.')
                      setTimeout(() => {
                        toast.info('Contact: tradeclarity.help@gmail.com', { duration: 5000 })
                      }, 2000)
                      return
                    }
                    setShowCancelDialog(true)
                  }}
                  disabled={canceling}
                  className="w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 hover:border-red-500/30 rounded-lg text-sm font-medium text-red-400 transition-all disabled:opacity-50"
                >
                  Cancel Subscription
                </button>
              ) : null}
              <button
                onClick={() => router.push('/pricing')}
                className="w-full px-4 py-3 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-lg text-sm font-medium text-white/80 transition-all"
              >
                View Plans & Upgrade
              </button>
            </div>
          </div>
        )}

        {/* Cancel Subscription Confirmation Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent className="bg-black border-white/10">
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <AlertDialogTitle className="text-xl font-semibold text-white/90">
                  Cancel {subscription?.tier === 'trader' ? 'Trader' : subscription?.tier === 'pro' ? 'Pro' : 'Premium'} Subscription?
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-white/70 space-y-3 pt-2">
                <p>
                  You'll continue to have full access to all {subscription?.tier === 'trader' ? 'Trader' : subscription?.tier === 'pro' ? 'Pro' : 'Premium'} features until{' '}
                  <span className="font-medium text-white/90">
                    {subscription?.current_period_end
                      ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'the end of your billing period'}
                  </span>.
                </p>
                <p>
                  After that, your account will be downgraded to <span className="font-medium text-white/90">Free tier</span>.
                </p>
                <p className="text-white/80">
                  You can reactivate your subscription anytime before your access ends.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 sm:gap-3">
              <AlertDialogCancel 
                onClick={() => setShowCancelDialog(false)}
                disabled={canceling}
                className="bg-white/5 hover:bg-white/10 border-white/10 text-white/70"
              >
                Keep Subscription
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelSubscription}
                disabled={canceling}
                className="bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 hover:border-red-500/30 text-red-400 focus:ring-red-500/20"
              >
                {canceling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Canceling...
                  </>
                ) : (
                  'Yes, Cancel Subscription'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {subscription?.tier === 'free' && (
          <div className="rounded-xl border border-white/10 bg-black p-6 text-center mb-6">
            <h2 className="text-xl font-medium mb-2 text-white/90">Ready to unlock more?</h2>
            <p className="text-sm text-white/60 mb-4">
              Upgrade to Trader or Pro to get unlimited analytics, historical tracking, and more.
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className="px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-lg text-sm font-medium text-white/90 transition-all"
            >
              View Plans
            </button>
          </div>
        )}

        {/* Payment History */}
        {(subscription?.tier !== 'free' || paymentHistory.length > 0) && (
          <div className="rounded-xl border border-white/10 bg-black p-6">
            <h2 className="text-xl font-medium mb-4 text-white/90">Payment History</h2>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-white/70" />
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="text-center py-8 text-white/50">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No payment history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentHistory.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-black hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                        invoice.status === 'paid' 
                          ? 'bg-white/5 text-white/70 border-white/10' 
                          : 'bg-white/5 text-white/40 border-white/10'
                      }`}>
                        {invoice.status === 'paid' ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-white/90">
                            {invoice.description || `Invoice #${invoice.invoice_number || invoice.id}`}
                          </p>
                          <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${
                            invoice.status === 'paid'
                              ? 'bg-white/5 text-white/70 border-white/10'
                              : 'bg-white/5 text-white/50 border-white/10'
                          }`}>
                            {invoice.status === 'paid' ? 'Paid' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-sm text-white/50">
                          {invoice.billing_period ? (
                            invoice.billing_period
                          ) : (
                            new Date(invoice.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium text-white/90">
                          {invoice.currency || 'INR'} {((invoice.amount || 0) / 100).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadInvoice(invoice.id, 'html')}
                          className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors"
                          title="View Invoice"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadInvoice(invoice.id, 'pdf')}
                          className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors"
                          title="Download Invoice (PDF)"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
