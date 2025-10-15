// app/analyze/components/LoginForm.js

import { useState } from 'react'
import { TrendingUp, Lock, Loader2, AlertCircle, Eye, EyeOff, HelpCircle, Sparkles } from 'lucide-react'

export default function LoginForm({ 
  exchangeList, 
  exchange, 
  setExchange, 
  currentExchange, 
  onConnect,
  onTryDemo,
  status, 
  error, 
  progress 
}) {
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)

  const handleSubmit = () => {
    onConnect(apiKey, apiSecret)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 mb-4">
            <TrendingUp className="w-10 h-10 text-emerald-400" />
            <h1 className="text-3xl font-bold">TradeClarity</h1>
          </div>
          <p className="text-slate-400">Discover your hidden trading patterns</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Select Exchange</label>
            <div className="grid grid-cols-2 gap-3">
              {exchangeList.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setExchange(ex.id)}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    exchange === ex.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {ex.icon} {ex.displayName}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium text-slate-300">
                {currentExchange.config.displayName} API Key
              </label>
              <div className="group relative">
                <HelpCircle className="w-4 h-4 text-slate-500 cursor-help" />
                <div className="absolute left-0 bottom-6 hidden group-hover:block bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs w-64 z-10">
                  <p className="text-slate-300 mb-2">Create API keys at {currentExchange.config.website}</p>
                  <p className="text-emerald-400">✓ Enable Read Only</p>
                  <p className="text-red-400">✗ NO trading permissions</p>
                </div>
              </div>
            </div>
            <input 
              type="text" 
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)} 
              placeholder={`Enter your ${currentExchange.config.displayName} API key`} 
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-400 transition-colors text-white placeholder-slate-500" 
              disabled={status === 'connecting'} 
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">API Secret</label>
            <div className="relative">
              <input 
                type={showSecret ? "text" : "password"} 
                value={apiSecret} 
                onChange={(e) => setApiSecret(e.target.value)} 
                placeholder="Enter your API secret" 
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-400 transition-colors text-white placeholder-slate-500 pr-12" 
                disabled={status === 'connecting'} 
              />
              <button 
                onClick={() => setShowSecret(!showSecret)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                type="button"
              >
                {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {progress && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin flex-shrink-0" />
              <p className="text-emerald-400 text-sm">{progress}</p>
            </div>
          )}

          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-slate-300 font-medium">Your data is secure</p>
                <p className="text-slate-400">Keys are encrypted and never stored. We only read your trade history.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={handleSubmit} 
              disabled={status === 'connecting' || !apiKey || !apiSecret} 
              className="w-full px-6 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all text-lg"
            >
              {status === 'connecting' ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </span>
              ) : (
                `Analyze My ${currentExchange.config.displayName} Trades`
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-800/50 px-2 text-slate-400">or</span>
              </div>
            </div>

            <button
              onClick={onTryDemo}
              disabled={status === 'connecting'}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all text-lg flex items-center justify-center gap-2 group"
            >
              <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              Try Demo with Sample Data
            </button>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              How to Create {currentExchange.config.displayName} API Keys
            </h3>
            <ol className="space-y-3 text-sm text-slate-300">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-400/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <div>
                  <span className="font-medium">Log into {currentExchange.config.displayName}</span>
                  <p className="text-slate-400 text-xs mt-1">Go to {currentExchange.config.website} and sign in to your account</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-400/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <div>
                  <span className="font-medium">Navigate to API Management</span>
                  <p className="text-slate-400 text-xs mt-1">Click your profile → API Management</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-400/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <div>
                  <span className="font-medium">Create New API Key</span>
                  <p className="text-slate-400 text-xs mt-1">Choose "System Generated" and give it a label like "TradeClarity"</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-400/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                <div>
                  <span className="font-medium">Enable Read-Only Permission</span>
                  <p className="text-slate-400 text-xs mt-1">
                    <span className="text-emerald-400">✓</span> Check "Enable Reading" only
                    <br />
                    <span className="text-red-400">✗</span> Leave "Enable Spot & Margin Trading" OFF
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-400/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold">5</span>
                <div>
                  <span className="font-medium">Copy Your Keys</span>
                  <p className="text-slate-400 text-xs mt-1">Copy the API Key and Secret Key and paste them above</p>
                </div>
              </li>
            </ol>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400">
                <span className="font-semibold">Important:</span> Never enable trading permissions. We only need read access to view your trade history.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}