// app/analyze/components/AuthScreen.js
'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Lock, Loader2, AlertCircle, Eye, EyeOff, Mail, Shield, Sparkles, X, User, ChevronRight, Plus } from 'lucide-react';
import { signUpWithEmail, signInWithEmail, signInWithGoogle } from '@/lib/auth';
import { toast } from 'sonner';

export default function AuthScreen({ onAuthSuccess }) {
  const [mode, setMode] = useState('signin'); // 'signin' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showGoogleEmailModal, setShowGoogleEmailModal] = useState(false);
  const [cachedEmail, setCachedEmail] = useState(null);
  const [previousGoogleAccounts, setPreviousGoogleAccounts] = useState([]);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  // Check for cached emails on mount
  useEffect(() => {
    const cached = localStorage.getItem('lastGoogleEmail');
    const previousAccounts = localStorage.getItem('previousGoogleAccounts');
    
    if (cached) {
      setCachedEmail(cached);
    }
    
    if (previousAccounts) {
      try {
        const accounts = JSON.parse(previousAccounts);
        // Filter out cached email from previous accounts for the first modal
        setPreviousGoogleAccounts(accounts.filter(acc => acc !== cached));
      } catch (e) {
        console.error('Error parsing previous accounts:', e);
      }
    }
  }, []);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await signUpWithEmail(email, password, name);
        if (error) throw error;

        setError('');
        toast.success('Account Created', {
          description: 'Check your email to verify your account!',
          duration: 10000
        });
      } else {
        const { data, error } = await signInWithEmail(email, password);
        if (error) throw error;
        
        if (data.user) {
          onAuthSuccess(data.user);
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async (forceAccountSelection = false) => {
    setError('');
    setLoading(true);
    setShowGoogleEmailModal(false);

    try {
      const { data, error } = await signInWithGoogle(forceAccountSelection);
      if (error) throw error;
      // Google redirects automatically, so we don't need to handle success here
    } catch (err) {
      setError(err.message || 'Google signin failed');
      setLoading(false);
    }
  };

  const handleGoogleButtonClick = () => {
    if (cachedEmail || previousGoogleAccounts.length > 0) {
      setShowGoogleEmailModal(true);
    } else {
      handleGoogleAuth(false);
    }
  };

  const handleUseCachedEmail = () => {
    handleGoogleAuth(false);
  };

  const handleChooseAnother = () => {
    setShowGoogleEmailModal(false);
    // Get all accounts to check if there are multiple
    const allAccounts = [];
    if (cachedEmail) allAccounts.push(cachedEmail);
    const previousAccountsStr = localStorage.getItem('previousGoogleAccounts');
    if (previousAccountsStr) {
      try {
        const previous = JSON.parse(previousAccountsStr);
        previous.forEach(email => {
          if (!allAccounts.includes(email)) allAccounts.push(email);
        });
      } catch (e) {
        console.error('Error parsing accounts:', e);
      }
    }
    
    // If only one account exists, go straight to Google account picker
    if (allAccounts.length <= 1) {
      handleGoogleAuth(true); // Force account selection
    } else {
      setShowAccountPicker(true);
    }
  };

  const handleSelectPreviousAccount = (email) => {
    // Update cached email to the selected one
    localStorage.setItem('lastGoogleEmail', email);
    setCachedEmail(email);
    setShowAccountPicker(false);
    handleGoogleAuth(false);
  };

  const handleAddNewAccount = () => {
    // Clear current cached email hint so Google shows account picker
    setShowAccountPicker(false);
    handleGoogleAuth(true); // Force account selection
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 mb-4">
            <TrendingUp className="w-10 h-10 text-emerald-400" />
            <h1 className="text-3xl font-bold">TradeClarity</h1>
          </div>
          <h2 className="text-2xl font-bold">
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-slate-400">
            {mode === 'signup' 
              ? 'Start analyzing your trades in minutes' 
              : 'Sign in to continue your analysis'}
          </p>
        </div>

        {/* Main Auth Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-800/20 border border-slate-700/50 rounded-2xl p-8 space-y-6 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full opacity-50" />
          <div className="relative">
          {/* Google OAuth Button */}
          <button
            onClick={handleGoogleButtonClick}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 text-gray-900 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Google Email Selection Modal */}
          {showGoogleEmailModal && (cachedEmail || previousGoogleAccounts.length > 0) && (
            <>
              <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                onClick={() => setShowGoogleEmailModal(false)}
              />
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="relative bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                  <button
                    onClick={() => setShowGoogleEmailModal(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-slate-100 mb-2">Choose Account</h3>
                    <p className="text-sm text-slate-400">Select which account you'd like to sign in with:</p>
                  </div>

                  <div className="space-y-3">
                    {/* Cached Email Option */}
                    {cachedEmail && (
                      <button
                        onClick={handleUseCachedEmail}
                        disabled={loading}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-semibold text-slate-100">Continue with</div>
                          <div className="text-xs text-emerald-400">{cachedEmail}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}

                    {/* Previous Accounts */}
                    {previousGoogleAccounts.map((email, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectPreviousAccount(email)}
                        disabled={loading}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600 hover:border-slate-500 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-600/50 border border-slate-500 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-semibold text-slate-100">Sign in with</div>
                          <div className="text-xs text-slate-400">{email}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}

                    {/* Choose Another Option */}
                    <button
                      onClick={handleChooseAnother}
                      disabled={loading}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-700/50 border border-slate-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-semibold text-slate-100">Use a different account</div>
                        <div className="text-xs text-slate-400">Sign in with another Google account</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Account Picker Modal - Shows when "Use a different account" is clicked */}
          {showAccountPicker && (() => {
            // Get all accounts (cached + previous, removing duplicates)
            const allAccounts = [];
            if (cachedEmail) {
              allAccounts.push(cachedEmail);
            }
            const previousAccountsStr = localStorage.getItem('previousGoogleAccounts');
            if (previousAccountsStr) {
              try {
                const previous = JSON.parse(previousAccountsStr);
                previous.forEach(email => {
                  if (!allAccounts.includes(email)) {
                    allAccounts.push(email);
                  }
                });
              } catch (e) {
                console.error('Error parsing accounts:', e);
              }
            }
            // Remove duplicates and sort (cached first)
            const uniqueAccounts = [...new Set(allAccounts)];
            
            return (
              <>
                <div 
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                  onClick={() => setShowAccountPicker(false)}
                />
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                  <div className="relative bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                    <button
                      onClick={() => setShowAccountPicker(false)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-slate-100 mb-2">All Google Accounts</h3>
                      <p className="text-sm text-slate-400">Select an account or add a new one:</p>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {/* All Accounts */}
                      {uniqueAccounts.map((email, idx) => {
                        const isLastUsed = email === cachedEmail;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleSelectPreviousAccount(email)}
                            disabled={loading}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group ${
                              isLastUsed
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50'
                                : 'bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600 hover:border-slate-500'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 ${
                              isLastUsed
                                ? 'bg-emerald-500/20 border-emerald-500/30'
                                : 'bg-slate-600/50 border-slate-500'
                            }`}>
                              <User className={`w-5 h-5 ${isLastUsed ? 'text-emerald-400' : 'text-slate-400'}`} />
                            </div>
                            <div className="flex-1 text-left">
                              <div className="text-sm font-semibold text-slate-100">{email}</div>
                              {isLastUsed && (
                                <div className="text-xs text-emerald-400">Last used</div>
                              )}
                            </div>
                            <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${
                              isLastUsed ? 'text-emerald-400' : 'text-slate-400'
                            }`} />
                          </button>
                        );
                      })}

                      {/* Show message if no accounts */}
                      {uniqueAccounts.length === 0 && (
                        <div className="text-center py-4 text-sm text-slate-400">
                          No previous accounts found
                        </div>
                      )}

                      {/* Add New Account */}
                      <button
                        onClick={handleAddNewAccount}
                        disabled={loading}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-white/[0.05] hover:bg-white/[0.08] border-2 border-dashed border-white/20 hover:border-white/30 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group mt-4"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-700/50 border border-slate-600 flex items-center justify-center flex-shrink-0">
                          <Plus className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-semibold text-slate-100">Add new Google account</div>
                          <div className="text-xs text-slate-400">Sign in with a different account</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800 text-slate-400">Or continue with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-white placeholder-slate-500"
                  required={mode === 'signup'}
                  disabled={loading}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-white placeholder-slate-500"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="????????"
                  className="w-full pl-10 pr-12 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-white placeholder-slate-500"
                  required
                  disabled={loading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {mode === 'signup' && (
                <p className="text-xs text-slate-400">
                  Must be at least 6 characters
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-105 disabled:hover:scale-100 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
                </>
              ) : (
                <>
                  {mode === 'signup' ? 'Create Account' : 'Sign In'}
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="text-center text-sm">
            <span className="text-slate-400">
              {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
            </span>
            {' '}
            <button
              onClick={() => {
                setMode(mode === 'signup' ? 'signin' : 'signup');
                setError('');
              }}
              className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              disabled={loading}
            >
              {mode === 'signup' ? 'Sign in' : 'Sign up'}
            </button>
          </div>

          {/* Security Badge */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900/60 to-slate-900/40 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5" />
            <div className="relative flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-emerald-300 mb-1">Your Data is Secure</div>
                <div className="text-xs text-slate-300">Industry-standard encryption ? Secure key storage ? Complete data privacy</div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}