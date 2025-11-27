// app/analyze/components/SnaptradeConnect.js
// DEPRECATED: This component is no longer used.
// Snaptrade connection is now handled directly via the initiate-connection API endpoint.
// The flow is: User selects Snaptrade -> API checks registration -> Opens Snaptrade modal directly.
// This file is kept for reference but should not be imported or used.
'use client'

/**
 * @deprecated This component is deprecated. Use the initiate-connection API endpoint instead.
 * See DashboardContent.js handleSnaptradeConnection() for the new implementation.
 */

import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, CheckCircle, ExternalLink, ArrowLeft, Building2, Shield, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

export default function SnaptradeConnect({ onBack, onConnect, onError }) {
  const [step, setStep] = useState(1) // 1: Register, 2: Connect Brokerage, 3: Fetching
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [selectedBroker, setSelectedBroker] = useState('')

  // Check if user is already registered with Snaptrade
  useEffect(() => {
    checkRegistration()
  }, [])

  const checkRegistration = async () => {
    try {
      // Try to get accounts - if this works, user is registered
      const response = await fetch('/api/snaptrade/accounts')
      if (response.ok) {
        const data = await response.json()
        setRegistered(true)
        setAccounts(data.accounts || [])
        if (data.accounts && data.accounts.length > 0) {
          setStep(3) // Already has accounts, go to fetching step
        } else {
          setStep(2) // Registered but no accounts, go to connect step
        }
      } else if (response.status === 404) {
        // Not registered yet
        setRegistered(false)
        setStep(1)
      }
    } catch (err) {
      console.error('Error checking registration:', err)
      // Assume not registered
      setRegistered(false)
      setStep(1)
    }
  }

  const handleRegister = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/snaptrade/register', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register with Snaptrade')
      }

      setRegistered(true)
      setStep(2)
    } catch (err) {
      console.error('Registration error:', err)
      setError(err.message || 'Failed to register with Snaptrade')
    } finally {
      setLoading(false)
    }
  }

  const handleConnectBrokerage = async (broker = null) => {
    setConnecting(true)
    setError('')

    try {
      const response = await fetch('/api/snaptrade/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker: broker || selectedBroker || undefined,
          customRedirect: `${window.location.origin}/snaptrade/callback?status=success`,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate connection URL')
      }

      // Open OAuth popup
      const width = 600
      const height = 700
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      const popup = window.open(
        data.redirectURI,
        'Snaptrade Connection',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      )

      // Listen for callback via message from callback page
      const handleMessage = (event) => {
        if (event.origin !== window.location.origin) return
        
        if (event.data.type === 'snaptrade_connected') {
          clearInterval(checkClosed)
          if (popup && !popup.closed) {
            popup.close()
          }
          window.removeEventListener('message', handleMessage)
          setConnecting(false)
          
          // Wait a moment for Snaptrade to process, then check accounts
          setTimeout(() => {
            checkRegistration()
          }, 2000)
        } else if (event.data.type === 'snaptrade_error') {
          clearInterval(checkClosed)
          if (popup && !popup.closed) {
            popup.close()
          }
          window.removeEventListener('message', handleMessage)
          setConnecting(false)
          setError(event.data.error || 'Failed to connect brokerage')
        }
      }

      window.addEventListener('message', handleMessage)

      // Fallback: Check if popup closed (user might have closed it manually)
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', handleMessage)
          setConnecting(false)
          // Check if connection was successful (user might have closed after success)
          setTimeout(() => {
            checkRegistration()
          }, 1000)
        }
      }, 500)
    } catch (err) {
      console.error('Connection error:', err)
      setError(err.message || 'Failed to connect brokerage')
      setConnecting(false)
    }
  }

  const handleFetchData = async () => {
    setLoading(true)
    setError('')

    try {
      // Fetch transactions and store them
      const response = await fetch('/api/snaptrade/fetch-and-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Fetch last 2 years of data
          startDate: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch transactions')
      }

      // Transform to TradeClarity format
      const tradesResponse = await fetch('/api/snaptrade/transactions', {
        method: 'GET',
      })

      const tradesData = await tradesResponse.json()

      if (!tradesResponse.ok) {
        throw new Error(tradesData.error || 'Failed to fetch transactions')
      }

      // Transform activities to trades format
      const { transformActivitiesToTrades } = await import('@/lib/snaptrade-transform')
      const trades = transformActivitiesToTrades(tradesData.activities || [])

      // Format for TradeClarity
      const tradeClarityData = {
        spotTrades: trades,
        futuresIncome: [],
        futuresPositions: [],
        metadata: {
          primaryCurrency: 'USD',
          accountType: 'SPOT',
          exchanges: ['snaptrade'],
        },
      }

      // Call onConnect with the data
      if (onConnect) {
        onConnect(null, null, tradeClarityData)
      }
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err.message || 'Failed to fetch trading data')
      if (onError) {
        onError(err)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="w-8 h-8 text-emerald-400" />
            <h1 className="text-3xl font-bold">Connect via Snaptrade</h1>
          </div>
          <p className="text-white/60 text-sm">
            Connect your brokerage accounts securely through Snaptrade
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Registration */}
        {step === 1 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Secure Connection</h3>
                  <p className="text-sm text-white/60">
                    Register with Snaptrade to connect your brokerage accounts
                  </p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white/90">No API Keys Required</p>
                    <p className="text-xs text-white/60">
                      Snaptrade uses secure OAuth connections - you never share your brokerage credentials
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white/90">Read-Only Access</p>
                    <p className="text-xs text-white/60">
                      We only access your trading history for analysis - no trading or withdrawals
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white/90">Multiple Brokerages</p>
                    <p className="text-xs text-white/60">
                      Connect Robinhood, Coinbase, Fidelity, and 20+ other brokerages
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleRegister}
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    Register with Snaptrade
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Connect Brokerage */}
        {step === 2 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400" />
                <div>
                  <h3 className="text-lg font-semibold">Registration Complete</h3>
                  <p className="text-sm text-white/60">
                    Now connect your brokerage account
                  </p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <p className="text-sm text-white/80 mb-4">
                  Click below to securely connect your brokerage account. You'll be redirected to your broker's login page.
                </p>

                {/* Popular Brokers */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {['ROBINHOOD', 'COINBASE', 'FIDELITY', 'SCHWAB'].map((broker) => (
                    <button
                      key={broker}
                      onClick={() => handleConnectBrokerage(broker)}
                      disabled={connecting}
                      className="p-3 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {broker}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={() => handleConnectBrokerage()}
                  disabled={connecting}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                  size="lg"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Opening connection...
                    </>
                  ) : (
                    <>
                      Connect Brokerage Account
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Fetch Data */}
        {step === 3 && accounts.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400" />
                <div>
                  <h3 className="text-lg font-semibold">Account Connected</h3>
                  <p className="text-sm text-white/60">
                    {accounts.length} account{accounts.length > 1 ? 's' : ''} found
                  </p>
                </div>
              </div>

              {/* Connected Accounts */}
              <div className="space-y-2">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-white/90">{account.name || 'Unnamed Account'}</p>
                      <p className="text-xs text-white/60">
                        {account.institution_name || 'Unknown Institution'} • {account.number || 'N/A'}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                      Connected
                    </Badge>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleFetchData}
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Fetching transactions...
                  </>
                ) : (
                  'Fetch Trading Data'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="flex justify-center">
          <Button
            onClick={onBack}
            variant="ghost"
            className="text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    </div>
  )
}
