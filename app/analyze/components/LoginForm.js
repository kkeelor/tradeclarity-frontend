// app/analyze/components/LoginForm.js

import { useState } from 'react'
import { TrendingUp, Lock, Loader2, AlertCircle, Eye, EyeOff, HelpCircle, Sparkles, ChevronRight, CheckCircle, Shield, ExternalLink, X, Play, FileText, Clock, BarChart3, Brain, Zap, Target, ArrowLeft } from 'lucide-react'
import { ExchangeIcon } from '@/components/ui'

// Step Progress Indicator Component
function StepProgress({ currentStep, totalSteps }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      {[...Array(totalSteps)].map((_, idx) => (
        <div key={idx} className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${
            idx < currentStep 
              ? 'bg-emerald-500 text-white' 
              : idx === currentStep
              ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/30'
              : 'bg-slate-700 text-slate-400'
          }`}>
            {idx < currentStep ? <CheckCircle className="w-5 h-5" /> : idx + 1}
          </div>
          {idx < totalSteps - 1 && (
            <div className={`w-12 h-1 mx-2 rounded transition-all ${
              idx < currentStep ? 'bg-emerald-500' : 'bg-slate-700'
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}

// Help Modal Component
function HelpModal({ isOpen, onClose, exchange }) {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl animate-in" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold">How to Get Your API Keys</h3>
              <p className="text-sm text-slate-400">{exchange.displayName} Guide</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <ol className="space-y-4">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <div className="flex-1">
                <h4 className="font-semibold text-lg mb-2">Visit {exchange.displayName}</h4>
                <p className="text-slate-300 mb-3">Go to {exchange.website} and sign in to your account</p>
                <a 
                  href={exchange.website.startsWith('http') ? exchange.website : `https://${exchange.website}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open {exchange.displayName}
                </a>
              </div>
            </li>
            
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <div className="flex-1">
                <h4 className="font-semibold text-lg mb-2">Navigate to API Management</h4>
                <p className="text-slate-300 mb-2">Click your profile icon in the top-right corner</p>
                <p className="text-slate-300">Select <span className="font-mono bg-slate-800 px-2 py-1 rounded">API Management</span> from the dropdown menu</p>
              </div>
            </li>
            
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <div className="flex-1">
                <h4 className="font-semibold text-lg mb-2">Create New API Key</h4>
                <p className="text-slate-300 mb-2">Click <span className="font-mono bg-slate-800 px-2 py-1 rounded">Create API</span> button</p>
                <p className="text-slate-300">Choose "System Generated" for the API key type</p>
                <p className="text-slate-300 mt-2">Give it a label like <span className="font-mono bg-slate-800 px-2 py-1 rounded">TradeClarity</span></p>
              </div>
            </li>
            
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-sm font-bold">4</span>
              <div className="flex-1">
                <h4 className="font-semibold text-lg mb-2">Set Permissions (CRITICAL)</h4>
                <div className="space-y-3">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
                      <CheckCircle className="w-5 h-5" />
                      Enable ONLY This Permission
                    </div>
                    <ul className="space-y-1 text-sm text-slate-300">
                      <li className="font-bold">✅ Enable Reading</li>
                    </ul>
                    <p className="text-xs text-emerald-400 mt-3 font-semibold">
                      This is the ONLY checkbox you need! It allows us to read both your spot AND futures trading history.
                    </p>
                  </div>
                  
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
                      <AlertCircle className="w-5 h-5" />
                      NEVER Enable These - Leave Unchecked
                    </div>
                    <ul className="space-y-1 text-sm text-slate-300">
                      <li>❌ Enable Spot & Margin Trading</li>
                      <li>❌ Enable Futures</li>
                      <li>❌ Permits Universal Transfer</li>
                      <li>❌ Enable Withdrawals</li>
                      <li>❌ Enable Margin Loan, Repay & Transfer</li>
                      <li>❌ Enable Symbol Whitelist</li>
                    </ul>
                    <p className="text-xs text-red-400 mt-3 font-semibold">
                      Critical: All trading and withdrawal permissions must remain OFF. We only need read access!
                    </p>
                  </div>
                </div>
              </div>
            </li>
            
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-sm font-bold">5</span>
              <div className="flex-1">
                <h4 className="font-semibold text-lg mb-2">Copy Your Keys</h4>
                <p className="text-slate-300 mb-2">After creating, you'll see your API Key and Secret Key</p>
                <p className="text-slate-300">Copy both and paste them into TradeClarity</p>
                <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-400">
                    <span className="font-semibold">Important:</span> The Secret Key is only shown once. Make sure to copy it immediately!
                  </p>
                </div>
              </div>
            </li>
          </ol>
          
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Why This Is Safe
            </h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Read-only access means we can ONLY view your trade history</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>We cannot place trades, withdraw funds, or modify your account</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Your keys are encrypted with industry-standard security</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginForm({
  exchangeList,
  exchange,
  setExchange,
  currentExchange,
  onConnect,
  onTryDemo,
  onBack,
  status,
  error,
  progress
}) {
  const [step, setStep] = useState(1) // Start at step 1 (Choose Exchange) instead of 0
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [apiKeyValid, setApiKeyValid] = useState(null)
  const [apiSecretValid, setApiSecretValid] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [localProgress, setLocalProgress] = useState('')

  const handleSubmit = async () => {
    console.log('🔵 [LoginForm] Connect button clicked')
    setIsSubmitting(true)
    setSubmitError('')
    setLocalProgress('Connecting to exchange...')

    try {
      // Call the new API endpoint to save credentials and fetch data
      console.log('🟡 [LoginForm] Calling /api/exchange/connect...', { exchange, apiKeyLength: apiKey.length })
      setLocalProgress('Saving credentials...')
      
      const response = await fetch('/api/exchange/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchange,
          apiKey,
          apiSecret
        })
      })

      console.log('🟡 [LoginForm] Response received:', { ok: response.ok, status: response.status })

      const data = await response.json()

      if (!response.ok) {
        console.error('❌ [LoginForm] API error:', data)
        throw new Error(data.error || 'Failed to connect exchange')
      }

      console.log('✅ Exchange connected successfully:', data)

      // Log normalized trades data for debugging
      if (data.data?.normalizedSamples) {
        console.log('📊 NORMALIZED TRADES (samples before DB insert):', data.data.normalizedSamples)
      }

      setLocalProgress('Preparing analytics...')

      // Call the parent's onConnect with the pre-fetched data
      console.log('🟢 [LoginForm] Connection successful, calling onConnect...', { hasData: !!data.data })
      if (data.data) {
        // New flow: pass the fetched data
        setLocalProgress('Redirecting to analytics...')
        // Small delay to ensure UI updates
        await new Promise(resolve => setTimeout(resolve, 300))
        console.log('🟢 [LoginForm] Calling onConnect with data')
        onConnect(apiKey, apiSecret, data.data)
      } else {
        // Fallback: let parent fetch data
        setLocalProgress('Redirecting to analytics...')
        await new Promise(resolve => setTimeout(resolve, 300))
        console.log('🟢 [LoginForm] Calling onConnect without data')
        onConnect(apiKey, apiSecret)
      }
    } catch (err) {
      console.error('Connection error:', err)
      setSubmitError(err.message || 'Failed to connect to exchange. Please check your API credentials.')
      setIsSubmitting(false)
      setLocalProgress('')
    }
  }
  
  // Validate API key format (exchange-specific validation)
  const validateApiKey = (key) => {
    if (key.length === 0) {
      setApiKeyValid(null)
      return
    }

    let isValid = false

    if (exchange === 'binance') {
      // Binance: 64 chars, alphanumeric
      isValid = key.length >= 60 && /^[A-Za-z0-9]+$/.test(key)
    } else if (exchange === 'coindcx') {
      // CoinDCX: Variable length, alphanumeric with hyphens
      // Format: typically UUID-like or hex string
      isValid = key.length >= 20 && /^[A-Za-z0-9\-]+$/.test(key)
    } else {
      // Default: just check if not empty and reasonable length
      isValid = key.length >= 20
    }

    setApiKeyValid(isValid)
  }

  const validateApiSecret = (secret) => {
    if (secret.length === 0) {
      setApiSecretValid(null)
      return
    }

    let isValid = false

    if (exchange === 'binance') {
      // Binance: 64 chars, alphanumeric
      isValid = secret.length >= 60 && /^[A-Za-z0-9]+$/.test(secret)
    } else if (exchange === 'coindcx') {
      // CoinDCX: Variable length, alphanumeric with hyphens
      isValid = secret.length >= 20 && /^[A-Za-z0-9\-]+$/.test(secret)
    } else {
      // Default: just check if not empty and reasonable length
      isValid = secret.length >= 20
    }

    setApiSecretValid(isValid)
  }

  // Step 1: Choose Exchange
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-3xl w-full space-y-6">
          {/* Header */}
          <div className="text-center space-y-3 relative">
            {onBack && (
              <button
                onClick={onBack}
                className="absolute left-0 top-0 text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <div className="flex items-center justify-center gap-2 mb-4">
              <TrendingUp className="w-8 h-8 text-emerald-400" />
              <h1 className="text-2xl font-bold">TradeClarity</h1>
            </div>
          </div>
          
          {/* Progress */}
          <StepProgress currentStep={0} totalSteps={2} />

          {/* Main Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-800/20 border border-slate-700/50 rounded-2xl p-8 space-y-6 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full opacity-50" />
            <div className="relative">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Which exchange do you trade on?</h2>
              <p className="text-slate-400">Select your trading platform to get started</p>
            </div>
            
            {/* Exchange Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exchangeList.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => {
                    setExchange(ex.id)
                    setStep(2)
                  }}
                  className={`group relative overflow-hidden p-6 rounded-2xl border-2 transition-all hover:scale-105 backdrop-blur-sm ${
                    exchange === ex.id
                      ? 'bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border-emerald-500/50'
                      : 'bg-gradient-to-br from-slate-800/50 to-slate-800/30 border-slate-700/50 hover:border-emerald-500/40'
                  }`}
                >
                  {exchange === ex.id && (
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/5" />
                  )}
                  <div className="relative flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center border ${
                      exchange === ex.id 
                        ? 'bg-emerald-500/20 border-emerald-500/30' 
                        : 'bg-slate-700/30 border-slate-600/50'
                    }`}>
                      <ExchangeIcon exchange={ex.id} size={32} className="w-full h-full p-2" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-bold text-xl mb-1">{ex.displayName}</div>
                      <div className="text-sm text-slate-400 mb-3">
                        {ex.id === 'binance' && 'World\'s largest crypto exchange'}
                        {ex.id === 'coindcx' && 'India\'s #1 crypto exchange'}
                      </div>
                      {ex.id === 'binance' && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold">
                          <Sparkles className="w-3 h-3" />
                          Most Popular
                        </div>
                      )}
                    </div>
                    <ChevronRight className={`w-6 h-6 transition-colors group-hover:translate-x-1 ${
                      exchange === ex.id ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'
                    }`} />
                  </div>
                </button>
              ))}
            </div>
            
            {/* Security Badge */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 rounded-xl p-5 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5" />
              <div className="relative flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-emerald-300 mb-1">Secure & Private</div>
                  <div className="text-sm text-slate-300">Read-Only Access • Encrypted Storage • Industry-Standard Security</div>
                </div>
              </div>
            </div>
            </div>
          </div>
          
          {/* Demo Link */}
          <div className="flex items-center justify-end">
            <button
              onClick={onTryDemo}
              className="text-purple-400 hover:text-purple-300 transition-colors text-sm font-medium flex items-center gap-1"
            >
              <Sparkles className="w-4 h-4" />
              Try Demo Instead
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  // Step 2: Enter API Keys
  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-4xl w-full space-y-6">
          <HelpModal 
            isOpen={showHelpModal} 
            onClose={() => setShowHelpModal(false)} 
            exchange={currentExchange.config}
          />
          
          {/* Header */}
          <div className="text-center space-y-3 relative">
            {onBack && (
              <button
                onClick={onBack}
                className="absolute left-0 top-0 text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
            )}
            <div className="flex items-center justify-center gap-2 mb-4">
              <TrendingUp className="w-8 h-8 text-emerald-400" />
              <h1 className="text-2xl font-bold">TradeClarity</h1>
            </div>
          </div>

          {/* Progress */}
          <StepProgress currentStep={1} totalSteps={2} />
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Form */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-800/20 border border-slate-700/50 rounded-2xl p-8 space-y-6 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5" />
              <div className="relative">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Connect {currentExchange.config.icon} {currentExchange.config.displayName}</h2>
                <p className="text-slate-400">Enter your read-only API credentials</p>
              </div>
              
              {/* API Key Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-300">
                    API Key
                  </label>
                  <button
                    onClick={() => setShowHelpModal(true)}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                    How to get this?
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    value={apiKey} 
                    onChange={(e) => {
                      setApiKey(e.target.value)
                      validateApiKey(e.target.value)
                    }}
                    placeholder={`Paste your ${currentExchange.config.displayName} API key`} 
                    className={`w-full px-4 py-3 bg-slate-900/80 border rounded-xl focus:outline-none focus:ring-2 transition-all text-white placeholder-slate-500 pr-10 backdrop-blur-sm ${
                      apiKeyValid === true ? 'border-emerald-500/50 focus:ring-emerald-500/30' :
                      apiKeyValid === false ? 'border-red-500/50 focus:ring-red-500/30' :
                      'border-slate-700/50 focus:ring-emerald-500/30'
                    }`}
                    disabled={status === 'connecting'} 
                  />
                  {apiKeyValid === true && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                  )}
                  {apiKeyValid === false && (
                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />
                  )}
                </div>
                {apiKeyValid === true && (
                  <div className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Looks good!
                  </div>
                )}
                {apiKeyValid === false && (
                  <div className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Invalid format. Check your API key.
                  </div>
                )}
              </div>

              {/* API Secret Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-300">API Secret</label>
                  <button
                    onClick={() => setShowHelpModal(true)}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                    How to get this?
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type={showSecret ? "text" : "password"} 
                    value={apiSecret} 
                    onChange={(e) => {
                      setApiSecret(e.target.value)
                      validateApiSecret(e.target.value)
                    }}
                    placeholder="Paste your API secret" 
                    className={`w-full px-4 py-3 bg-slate-900/80 border rounded-xl focus:outline-none focus:ring-2 transition-all text-white placeholder-slate-500 pr-20 backdrop-blur-sm ${
                      apiSecretValid === true ? 'border-emerald-500/50 focus:ring-emerald-500/30' :
                      apiSecretValid === false ? 'border-red-500/50 focus:ring-red-500/30' :
                      'border-slate-700/50 focus:ring-emerald-500/30'
                    }`}
                    disabled={status === 'connecting'} 
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {apiSecretValid === true && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                    {apiSecretValid === false && <AlertCircle className="w-5 h-5 text-red-400" />}
                    <button 
                      onClick={() => setShowSecret(!showSecret)} 
                      className="text-slate-400 hover:text-white transition-colors"
                      type="button"
                    >
                      {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                {apiSecretValid === true && (
                  <div className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Looks good!
                  </div>
                )}
                {apiSecretValid === false && (
                  <div className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Invalid format. Check your API secret.
                  </div>
                )}
              </div>

              {(error || submitError) && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{submitError || error}</p>
                </div>
              )}

              {((isSubmitting || status === 'connecting') && !submitError && !error) && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin flex-shrink-0" />
                  <p className="text-emerald-400 text-sm">{localProgress || progress || 'Connecting...'}</p>
                </div>
              )}

              {/* Security Info */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-slate-300 font-medium">Your data is secure</p>
                    <p className="text-slate-400">Keys are encrypted and securely stored. We only read your trade history.</p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || status === 'connecting' || !apiKey || !apiSecret || apiKeyValid === false || apiSecretValid === false}
                className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-xl font-semibold transition-all text-lg flex items-center justify-center gap-2 group shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-105 disabled:hover:scale-100 disabled:shadow-none"
              >
                {(isSubmitting || status === 'connecting') ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Connect Exchange
                  </>
                )}
              </button>
              </div>
            </div>
            
            {/* Right: Preview & Instructions */}
            <div className="space-y-6">
              {/* What Happens Next */}
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-800/20 border border-slate-700/50 rounded-2xl p-6 space-y-4 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5" />
                <div className="relative">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  Almost there! You'll see your first insight in 30 seconds
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm mb-1">Psychology Score</div>
                      <div className="text-xs text-slate-400">See your trading discipline rating /100</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Clock className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm mb-1">Peak Performance Hours</div>
                      <div className="text-xs text-slate-400">When you trade best (and worst)</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Brain className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm mb-1">Hidden Patterns</div>
                      <div className="text-xs text-slate-400">Patterns you can't see are costing you money</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Target className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm mb-1">Actionable Insights</div>
                      <div className="text-xs text-slate-400">Specific changes to improve your win rate</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Quick Guide */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 space-y-3">
                <div className="flex items-center gap-2 text-blue-400 font-semibold">
                  <FileText className="w-5 h-5" />
                  Need help finding your API keys?
                </div>
                <button
                  onClick={() => setShowHelpModal(true)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-500/20 to-blue-500/10 hover:from-blue-500/30 hover:to-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 group hover:scale-105"
                >
                  <Play className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Watch Step-by-Step Guide
                </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Back */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
            >
              ← Back
            </button>
            <button
              onClick={onTryDemo}
              className="text-purple-400 hover:text-purple-300 transition-colors text-sm font-medium flex items-center gap-1"
            >
              <Sparkles className="w-4 h-4" />
              Try Demo Instead
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  return null
}