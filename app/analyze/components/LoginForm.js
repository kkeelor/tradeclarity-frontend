// app/analyze/components/LoginForm.js

import { useState } from 'react'
import { TrendingUp, Lock, Loader2, AlertCircle, Eye, EyeOff, HelpCircle, Sparkles, ChevronRight, CheckCircle, Shield, ExternalLink, X, Play, FileText, Clock, BarChart3, Brain, Zap, Target, ArrowLeft, Mail, Plus, Info, ChevronDown } from 'lucide-react'
import { ExchangeIcon, Separator } from '@/components/ui'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import UpgradeRequiredModal from '@/app/components/UpgradeRequiredModal'

// Step Progress Indicator Component
function StepProgress({ currentStep, totalSteps }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
      {[...Array(totalSteps)].map((_, idx) => (
        <div key={idx} className="flex items-center">
          <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-medium transition-all text-xs sm:text-sm border ${
            idx < currentStep 
              ? 'bg-white/10 border-white/20 text-white/90' 
              : idx === currentStep
              ? 'bg-white/10 border-white/30 text-white/90 ring-2 ring-white/10'
              : 'bg-white/5 border-white/10 text-white/40'
          }`}>
            {idx < currentStep ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : idx + 1}
          </div>
          {idx < totalSteps - 1 && (
            <div className={`w-8 sm:w-12 h-0.5 mx-1 sm:mx-2 rounded transition-all ${
              idx < currentStep ? 'bg-white/20' : 'bg-white/10'
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-white/10 max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-white/60" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-white/90">How to Get Your API Keys</DialogTitle>
              <DialogDescription className="text-white/60">{exchange.displayName} Guide</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          <ol className="space-y-4">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-white/10 border border-white/20 text-white/90 rounded-full flex items-center justify-center text-sm font-medium">1</span>
              <div className="flex-1">
                <h4 className="font-semibold text-base mb-2 text-white/90">Visit {exchange.displayName}</h4>
                <p className="text-white/60 mb-3">Go to {exchange.website} and sign in to your account</p>
                <a 
                  href={exchange.website.startsWith('http') ? exchange.website : `https://${exchange.website}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-sm font-medium transition-colors text-white/80 hover:text-white"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open {exchange.displayName}
                </a>
              </div>
            </li>
            
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-white/10 border border-white/20 text-white/90 rounded-full flex items-center justify-center text-sm font-medium">2</span>
              <div className="flex-1">
                <h4 className="font-semibold text-base mb-2 text-white/90">Navigate to API Management</h4>
                <p className="text-white/60 mb-2">Click your profile icon in the top-right corner</p>
                <p className="text-white/60">Select <span className="font-mono bg-white/5 border border-white/10 px-2 py-1 rounded text-white/80">API Management</span> from the dropdown menu</p>
              </div>
            </li>
            
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-white/10 border border-white/20 text-white/90 rounded-full flex items-center justify-center text-sm font-medium">3</span>
              <div className="flex-1">
                <h4 className="font-semibold text-base mb-2 text-white/90">Create New API Key</h4>
                <p className="text-white/60 mb-2">Click <span className="font-mono bg-white/5 border border-white/10 px-2 py-1 rounded text-white/80">Create API</span> button</p>
                <p className="text-white/60">Choose "System Generated" for the API key type</p>
                <p className="text-white/60 mt-2">Give it a label like <span className="font-mono bg-white/5 border border-white/10 px-2 py-1 rounded text-white/80">TradeClarity</span></p>
              </div>
            </li>
            
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-white/10 border border-white/20 text-white/90 rounded-full flex items-center justify-center text-sm font-medium">4</span>
              <div className="flex-1">
                <h4 className="font-semibold text-base mb-2 text-white/90">Set Permissions (CRITICAL)</h4>
                <div className="space-y-3">
                  <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-white/90 font-medium mb-2">
                      <CheckCircle className="w-5 h-5 text-white/60" />
                      Enable ONLY This Permission
                    </div>
                    <ul className="space-y-1 text-sm text-white/70">
                      <li className="font-medium">✅ Enable Reading</li>
                    </ul>
                    <p className="text-xs text-white/60 mt-3 font-medium">
                      This is the ONLY checkbox you need! It allows us to read both your spot AND futures trading history.
                    </p>
                  </div>
                  
                  <div className="bg-white/5 border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-400 font-medium mb-2">
                      <AlertCircle className="w-5 h-5" />
                      NEVER Enable These - Leave Unchecked
                    </div>
                    <ul className="space-y-1 text-sm text-white/60">
                      <li>❌ Enable Spot & Margin Trading</li>
                      <li>❌ Enable Futures</li>
                      <li>❌ Permits Universal Transfer</li>
                      <li>❌ Enable Withdrawals</li>
                      <li>❌ Enable Margin Loan, Repay & Transfer</li>
                      <li>❌ Enable Symbol Whitelist</li>
                    </ul>
                    <p className="text-xs text-red-400 mt-3 font-medium">
                      Critical: All trading and withdrawal permissions must remain OFF. We only need read access!
                    </p>
                  </div>
                </div>
              </div>
            </li>
            
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-white/10 border border-white/20 text-white/90 rounded-full flex items-center justify-center text-sm font-medium">5</span>
              <div className="flex-1">
                <h4 className="font-semibold text-base mb-2 text-white/90">Copy Your Keys</h4>
                <p className="text-white/60 mb-2">After creating, you'll see your API Key and Secret Key</p>
                <p className="text-white/60">Copy both and paste them into TradeClarity</p>
                <div className="mt-3 bg-white/5 border border-white/20 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-white/60 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-white/70">
                    <span className="font-medium">Important:</span> The Secret Key is only shown once. Make sure to copy it immediately!
                  </p>
                </div>
              </div>
            </li>
          </ol>
          
          <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-3">
            <h4 className="font-semibold flex items-center gap-2 text-white/90">
              <Shield className="w-5 h-5 text-white/60" />
              Why This Is Safe
            </h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0 mt-1.5" />
                <span>Read-only access means we can ONLY view your trade history</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0 mt-1.5" />
                <span>We cannot place trades, withdraw funds, or modify your account</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0 mt-1.5" />
                <span>Your keys are encrypted with industry-standard security</span>
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeModalData, setUpgradeModalData] = useState(null)

  const handleRequestExchange = () => {
    const subject = encodeURIComponent('Exchange Integration Request')
    const body = encodeURIComponent(`Hello TradeClarity Team,\n\nI would like to request support for the following exchange:\n\nExchange Name: [Please specify]\n\nAdditional Notes:\n[Any additional information]\n\nThank you!`)
    const mailtoLink = `mailto:tradeclarity.help@gmail.com?subject=${subject}&body=${body}`
    window.location.href = mailtoLink
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError('')
    setLocalProgress('Connecting to exchange...')

    try {
      // Call the new API endpoint to save credentials and fetch data
      // Connection limit check happens silently on backend
      const response = await fetch('/api/exchange/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchange,
          apiKey,
          apiSecret
        })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('API error:', data)
        
        // Handle connection limit error - show upgrade modal instead of error
        if (response.status === 403 && data.error === 'CONNECTION_LIMIT_REACHED') {
          setIsSubmitting(false)
          setLocalProgress('')
          
          // Store API keys in sessionStorage for auto-connect after upgrade
          sessionStorage.setItem('pendingExchangeConnection', JSON.stringify({
            exchange: exchange.toLowerCase(),
            apiKey,
            apiSecret,
            timestamp: Date.now()
          }))
          
          // Show upgrade modal
          const exchangeDisplayName = exchangeDataMap[exchange]?.displayName || exchange
          setUpgradeModalData({
            type: 'connection',
            current: data.current,
            limit: data.limit,
            tier: data.tier || 'free',
            upgradeTier: data.upgradeTier,
            exchangeName: exchangeDisplayName
          })
          setShowUpgradeModal(true)
          return // Don't throw error, just return - don't call onConnect
        }
        
        throw new Error(data.error || data.message || 'Failed to connect exchange')
      }

      // Connection limit check passed - proceed with connection
      setLocalProgress('Preparing analytics...')
      
      // Update the parent with the fetched data
      if (data.data) {
        // Call onConnect with the actual data - this will trigger analysis
        onConnect(apiKey, apiSecret, data.data)
      } else {
        // Fallback: call onConnect without data if backend doesn't return it
        onConnect(apiKey, apiSecret, null)
      }
    } catch (err) {
      console.error('Connection error:', err)
      setSubmitError(err.message || 'Failed to connect to exchange. Please check your API credentials.')
      setIsSubmitting(false)
      setLocalProgress('')
      // Note: Error handling is done in DashboardContent.handleConnect
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

  // Exchange data map for preview
  const exchangeDataMap = {
    binance: {
      displayName: 'Binance',
      description: 'World\'s largest crypto exchange',
      dataPoints: [
        'AI-powered analysis of your trading performance',
        'Real-time insights on spot and futures trading',
        'How much money you\'re really making (P&L analysis)',
        'When you trade your best (time-based patterns)',
        'Where you\'re losing money and how to stop',
        'Which assets are working for you (symbol analysis)',
        'Trading psychology scores and behavioral insights',
        'How fees are eating into your profits',
        'Smart AI recommendations to improve your results',
        'Pattern detection across thousands of trades'
      ]
    },
    coindcx: {
      displayName: 'CoinDCX',
      description: 'India\'s #1 crypto exchange',
      dataPoints: [
        'AI-powered analysis of your spot trading performance',
        'How much money you\'re really making (P&L analysis)',
        'When you trade your best (time-based patterns)',
        'Where you\'re losing money and how to stop',
        'Which assets are working for you (symbol analysis)',
        'Trading psychology scores and behavioral insights',
        'How fees are eating into your profits',
        'Smart AI recommendations to improve your results',
        'Pattern detection across thousands of trades',
        'Note: Futures trading requires manual CSV upload'
      ]
    }
  }

  const selectedExchangeData = exchange ? exchangeDataMap[exchange] : null

  // Step 1: Choose Exchange
  // Render upgrade modal wrapper
  const renderWithModal = (content) => (
    <>
      {content}
      {/* Upgrade Required Modal */}
      {upgradeModalData && (
        <UpgradeRequiredModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          {...upgradeModalData}
          onCancel={() => {
            // Clear stored keys on cancel
            sessionStorage.removeItem('pendingExchangeConnection')
            setShowUpgradeModal(false)
          }}
        />
      )}
    </>
  )

  if (step === 1) {
    return renderWithModal(
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-6xl w-full space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="text-center space-y-2 relative">
            {onBack && (
              <button
                onClick={onBack}
                className="absolute left-0 top-0 text-white/60 hover:text-white/90 transition-colors flex items-center gap-2 text-xs sm:text-sm font-medium"
              >
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}
            <div className="flex items-center justify-center gap-2 mb-2 sm:mb-4">
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-white/80" />
              <h1 className="text-xl sm:text-2xl font-semibold text-white/90">TradeClarity</h1>
            </div>
          </div>
          
          {/* Progress */}
          <StepProgress currentStep={0} totalSteps={2} />

          {/* Main Card */}
          <div className="relative overflow-hidden bg-black border border-white/10 rounded-xl p-6 sm:p-8">
            <div className="relative">
              <div className="text-center space-y-2 mb-8">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white/90">Which exchange do you trade on?</h2>
                <p className="text-xs sm:text-sm text-white/60">Select your trading platform to get started</p>
              </div>
              
              {/* 2 Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Left: Exchange Selection */}
                <div className="space-y-4">
                  <Label className="text-xs font-medium text-white/80 uppercase tracking-wider">Select Exchange</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-full px-4 py-3 bg-black border border-white/10 hover:border-white/20 rounded-lg transition-all flex items-center justify-between text-left">
                      <div className="flex items-center gap-3">
                        {exchange ? (
                          <>
                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                              <ExchangeIcon exchange={exchange} size={20} className="w-full h-full p-1.5" />
                            </div>
                            <div>
                              <div className="font-semibold text-sm text-white/90">{exchangeDataMap[exchange].displayName}</div>
                              <div className="text-xs text-white/60">{exchangeDataMap[exchange].description}</div>
                            </div>
                          </>
                        ) : (
                          <span className="text-white/60">Choose an exchange...</span>
                        )}
                      </div>
                      <ChevronDown className="w-4 h-4 text-white/40" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-black border-white/10 w-[var(--radix-dropdown-menu-trigger-width)] text-white">
                      {exchangeList.map((ex) => (
                        <DropdownMenuItem
                          key={ex.id}
                          onClick={() => setExchange(ex.id)}
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 text-white focus:bg-white/5 focus:text-white"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                            <ExchangeIcon exchange={ex.id} size={20} className="w-full h-full p-1.5" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-sm text-white/90">{ex.displayName}</div>
                            <div className="text-xs text-white/60">{exchangeDataMap[ex.id]?.description}</div>
                          </div>
                          {ex.id === 'binance' && (
                            <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-xs px-1.5 py-0">
                              Popular
                            </Badge>
                          )}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem
                        onClick={handleRequestExchange}
                        className="flex items-center gap-3 p-3 cursor-pointer border-t border-white/10 mt-1 hover:bg-white/5 text-white focus:bg-white/5 focus:text-white"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                          <Plus className="w-4 h-4 text-white/60" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm flex items-center gap-2 text-white/90">
                            <Mail className="w-3 h-3" />
                            Request Exchange
                          </div>
                          <div className="text-xs text-white/60">Don't see your exchange?</div>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Continue Button */}
                  {exchange && (
                    <button
                      onClick={() => setStep(2)}
                      className="w-full px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-lg font-medium text-white/90 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      Continue
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Right: Data Preview */}
                <div className="space-y-4">
                  <Label className="text-xs font-medium text-white/80 uppercase tracking-wider">What you'll get</Label>
                  {selectedExchangeData ? (
                    <div className="bg-black border border-white/10 rounded-lg p-5 sm:p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                          <ExchangeIcon exchange={exchange} size={24} className="w-full h-full p-2" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base text-white/90">{selectedExchangeData.displayName}</h3>
                          <p className="text-xs text-white/60">{selectedExchangeData.description}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="w-4 h-4 text-white/60" />
                          <span className="text-xs font-medium text-white/80 uppercase tracking-wider">You'll see:</span>
                        </div>
                        <ul className="space-y-2.5 ml-6">
                          {selectedExchangeData.dataPoints.map((point, idx) => (
                            <li key={idx} className="text-sm text-white/70 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-white/60 flex-shrink-0" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* Data Limitations Note */}
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-start gap-2 text-xs text-white/60">
                          <Info className="w-4 h-4 text-white/50 flex-shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-white/80 font-medium">Complete your picture</p>
                            <p>
                              {exchange === 'binance' ? (
                                <>
                                  API connection supports both spot and futures trading data. Data retrieval is subject to exchange rate limits and may not include your complete trading history. For comprehensive analysis, you can supplement this by uploading additional trade history CSV files directly from your exchange's account settings or data export section.
                                </>
                              ) : (
                                <>
                                  API connection supports spot trading data. For futures trading analysis, please upload CSV files directly from your exchange's account settings or data export section. API data retrieval is subject to exchange rate limits and may not include your complete trading history.
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-black border border-white/10 rounded-lg p-5 sm:p-6 flex items-center justify-center min-h-[200px]">
                      <div className="text-center space-y-2">
                        <Info className="w-8 h-8 text-white/30 mx-auto" />
                        <p className="text-sm text-white/60">Select an exchange to see what data will be fetched</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Minimal Security Badge */}
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-white/60">
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/50" />
                <span>Read-only access</span>
                <Separator className="mx-1 text-white/10" />
                <span>Encrypted storage</span>
              </div>
            </div>
          </div>
          
          {/* Demo Link */}
          <div className="flex items-center justify-end">
            <button
              onClick={onTryDemo}
              className="text-purple-400 hover:text-purple-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
            >
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" />
              Try Demo Instead
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  // Step 2: Enter API Keys
  if (step === 2) {
    return renderWithModal(
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
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
                className="absolute left-0 top-0 text-white/60 hover:text-white/90 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
            )}
            <div className="flex items-center justify-center gap-2 mb-4">
              <TrendingUp className="w-8 h-8 text-white/80" />
              <h1 className="text-2xl font-semibold text-white/90">TradeClarity</h1>
            </div>
          </div>

          {/* Progress */}
          <StepProgress currentStep={1} totalSteps={2} />
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Form */}
            <div className="relative overflow-hidden bg-black border border-white/10 rounded-xl p-6 sm:p-8">
              <div className="relative space-y-5 sm:space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <ExchangeIcon exchange={exchange} size={24} className="w-full h-full p-2" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-white/90">Connect {currentExchange.config.displayName}</h2>
                    <p className="text-white/60">Enter your read-only API credentials</p>
                  </div>
                </div>
              </div>
              
              {/* API Key Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="api-key" className="text-white/80">
                    API Key
                  </Label>
                  <button
                    onClick={() => setShowHelpModal(true)}
                    className="flex items-center gap-1 text-xs text-white/60 hover:text-white/90 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                    How to get this?
                  </button>
                </div>
                <div className="relative">
                  <Input 
                    id="api-key"
                    type="text" 
                    value={apiKey} 
                    onChange={(e) => {
                      setApiKey(e.target.value)
                      validateApiKey(e.target.value)
                    }}
                    placeholder={`Paste your ${currentExchange.config.displayName} API key`} 
                    className={`bg-black border text-white placeholder-white/40 pr-10 ${
                      apiKeyValid === true ? 'border-white/30 focus:ring-white/20' :
                      apiKeyValid === false ? 'border-red-500/50 focus:ring-red-500/30' :
                      'border-white/10 focus:ring-white/20'
                    }`}
                    disabled={status === 'connecting'} 
                  />
                  {apiKeyValid === true && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 z-10" />
                  )}
                  {apiKeyValid === false && (
                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400 z-10" />
                  )}
                </div>
                {apiKeyValid === true && (
                  <div className="text-xs text-white/60 flex items-center gap-1">
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
                  <Label htmlFor="api-secret" className="text-white/80">API Secret</Label>
                  <button
                    onClick={() => setShowHelpModal(true)}
                    className="flex items-center gap-1 text-xs text-white/60 hover:text-white/90 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                    How to get this?
                  </button>
                </div>
                <div className="relative">
                  <Input 
                    id="api-secret"
                    type={showSecret ? "text" : "password"} 
                    value={apiSecret} 
                    onChange={(e) => {
                      setApiSecret(e.target.value)
                      validateApiSecret(e.target.value)
                    }}
                    placeholder="Paste your API secret" 
                    className={`bg-black border text-white placeholder-white/40 pr-20 ${
                      apiSecretValid === true ? 'border-white/30 focus:ring-white/20' :
                      apiSecretValid === false ? 'border-red-500/50 focus:ring-red-500/30' :
                      'border-white/10 focus:ring-white/20'
                    }`}
                    disabled={status === 'connecting'} 
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                    {apiSecretValid === true && <CheckCircle className="w-5 h-5 text-white/60" />}
                    {apiSecretValid === false && <AlertCircle className="w-5 h-5 text-red-400" />}
                    <button 
                      onClick={() => setShowSecret(!showSecret)} 
                      className="text-white/40 hover:text-white/80 transition-colors"
                      type="button"
                    >
                      {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                {apiSecretValid === true && (
                  <div className="text-xs text-white/60 flex items-center gap-1">
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
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <AlertDescription className="text-red-400 text-sm">{submitError || error}</AlertDescription>
                </Alert>
              )}

              {((isSubmitting || status === 'connecting') && !submitError && !error) && (
                <Alert className="bg-white/5 border-white/10">
                  <Loader2 className="w-5 h-5 text-white/60 animate-spin" />
                  <AlertDescription className="text-white/70 text-sm">{localProgress || progress || 'Connecting...'}</AlertDescription>
                </Alert>
              )}

              {/* Security Info */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 sm:p-4 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <Lock className="w-4 h-4 text-white/60 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-white/80 font-medium">Your data is secure</p>
                    <p className="text-white/60">Keys are encrypted and securely stored. We only read your trade history.</p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || status === 'connecting' || !apiKey || !apiSecret || apiKeyValid === false || apiSecretValid === false}
                className="w-full px-6 py-3.5 sm:py-4 bg-emerald-400/10 hover:bg-emerald-400/15 border border-emerald-400/30 hover:border-emerald-400/40 disabled:bg-white/5 disabled:border-white/10 disabled:cursor-not-allowed rounded-lg font-medium transition-all text-base sm:text-lg flex items-center justify-center gap-2 group text-emerald-400 hover:text-emerald-300 disabled:text-white/40 mt-2"
              >
                {(isSubmitting || status === 'connecting') ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Connect Exchange
                  </>
                )}
              </button>
              </div>
            </div>
            
            {/* Right: Preview & Instructions */}
            <div className="space-y-6">
              {/* What Happens Next */}
              <div className="relative overflow-hidden bg-black border border-white/10 rounded-xl p-6 space-y-4">
                <div className="relative">
                <h3 className="font-semibold text-base text-white/90 flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-white/60" />
                  Almost there! You'll see your analytics in 30 seconds
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Brain className="w-4 h-4 text-white/60" />
                    </div>
                    <div>
                      <div className="font-medium text-sm mb-1 text-white/90">AI-Powered Analysis</div>
                      <div className="text-xs text-white/60">Vega analyzes thousands of trades to uncover hidden patterns</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Target className="w-4 h-4 text-white/60" />
                    </div>
                    <div>
                      <div className="font-medium text-sm mb-1 text-white/90">Trading Psychology Score</div>
                      <div className="text-xs text-white/60">AI-detected behavioral patterns and discipline rating</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Zap className="w-4 h-4 text-white/60" />
                    </div>
                    <div>
                      <div className="font-medium text-sm mb-1 text-white/90">Smart AI Recommendations</div>
                      <div className="text-xs text-white/60">Personalized insights to improve your win rate</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Clock className="w-4 h-4 text-white/60" />
                    </div>
                    <div>
                      <div className="font-medium text-sm mb-1 text-white/90">Pattern Detection</div>
                      <div className="text-xs text-white/60">AI identifies when you trade best and worst</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <BarChart3 className="w-4 h-4 text-white/60" />
                    </div>
                    <div>
                      <div className="font-medium text-sm mb-1 text-white/90">Behavioral Insights</div>
                      <div className="text-xs text-white/60">Discover emotional trading patterns and weaknesses</div>
                    </div>
                  </div>
                </div>
                </div>
              </div>
              
              {/* Quick Guide */}
              <div className="bg-black border border-white/10 rounded-xl p-4 sm:p-5">
                <button
                  onClick={() => setShowHelpModal(true)}
                  className="w-full flex items-center justify-center gap-2 text-white/60 hover:text-white/90 transition-colors text-sm font-medium group"
                >
                  <FileText className="w-4 h-4" />
                  <span>Need help finding your API keys?</span>
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Back */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="text-white/60 hover:text-white/90 transition-colors text-sm font-medium"
            >
              ← Back
            </button>
            <button
              onClick={onTryDemo}
              className="text-purple-400 hover:text-purple-300 transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              Try Demo Instead
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  return renderWithModal(null)
}