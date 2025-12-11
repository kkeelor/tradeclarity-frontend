// app/analyze/components/AuthScreen.js
'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Lock, Loader2, AlertCircle, Eye, EyeOff, Mail, Shield, Sparkles, X, User, ChevronRight, Plus } from 'lucide-react';
import { signUpWithEmail, signInWithEmail, signInWithGoogle } from '@/lib/auth';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';

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
  
  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
      name: ''
    }
  });

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
        // Validate password requirements
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters long');
        }
        if (!/[a-zA-Z]/.test(password)) {
          throw new Error('Password must contain at least one letter');
        }
        if (!/\d/.test(password)) {
          throw new Error('Password must contain at least one digit');
        }
        
        const { data, error } = await signUpWithEmail(email, password, name);
        if (error) throw error;

        setError('');
        
        // Check if user is already confirmed (email confirmation disabled)
        if (data.user && data.session) {
          // User is immediately authenticated - redirect to dashboard
          toast.success('Account Created', {
            description: 'Welcome to TradeClarity!',
            duration: 3000
          });
          
          // Small delay to show toast, then redirect
          setTimeout(() => {
            if (onAuthSuccess) {
              onAuthSuccess(data.user);
            } else {
              // Fallback: redirect to dashboard
              window.location.href = '/dashboard';
            }
          }, 500);
        } else {
          // Email confirmation required (shouldn't happen if disabled, but handle gracefully)
          toast.success('Account Created', {
            description: 'Please check your email to verify your account',
            duration: 5000
          });
        }
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
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 selection:bg-emerald-500/30">
      {/* Background blobs for minimal aesthetic */}
      <div className="fixed top-1/4 -left-64 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="fixed bottom-1/4 -right-64 w-96 h-96 bg-cyan-500/5 rounded-full blur-[128px] pointer-events-none" />

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Logo */}
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white/90">
              {mode === 'signup' ? 'Create an account' : 'Welcome back'}
            </h1>
            <p className="text-white/50 text-sm">
              {mode === 'signup' 
                ? 'Start analyzing your trades in minutes' 
                : 'Enter your details to access your dashboard'}
            </p>
          </div>
        </div>

        {/* Main Auth Card */}
        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <div className="space-y-6">
            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleButtonClick}
              disabled={loading}
              className="w-full h-12 flex items-center justify-center gap-3 bg-white text-black hover:bg-white/90 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
            <Dialog open={showGoogleEmailModal && (cachedEmail || previousGoogleAccounts.length > 0)} onOpenChange={setShowGoogleEmailModal}>
              <DialogContent className="bg-zinc-900 border-white/10 max-w-md p-6">
                <DialogHeader>
                  <DialogTitle className="text-white/90">Choose Account</DialogTitle>
                  <DialogDesc className="text-white/50">Select which account you'd like to sign in with:</DialogDesc>
                </DialogHeader>
                
                <div className="space-y-2 mt-4">
                  {/* Cached Email Option */}
                  {cachedEmail && (
                    <button
                      onClick={handleUseCachedEmail}
                      disabled={loading}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-emerald-400">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-white/90">Continue with</div>
                        <div className="text-xs text-white/50">{cachedEmail}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}

                  {/* Previous Accounts */}
                  {previousGoogleAccounts.map((email, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectPreviousAccount(email)}
                      disabled={loading}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 text-white/40">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-white/90">Sign in with</div>
                        <div className="text-xs text-white/50">{email}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}

                  {/* Choose Another Option */}
                  <button
                    onClick={handleChooseAnother}
                    disabled={loading}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 text-white/40">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-white/90">Use a different account</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Account Picker Modal */}
            {(() => {
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
              const uniqueAccounts = [...new Set(allAccounts)];
              
              return (
                <Dialog open={showAccountPicker} onOpenChange={setShowAccountPicker}>
                  <DialogContent className="bg-zinc-900 border-white/10 max-w-md p-6">
                    <DialogHeader>
                      <DialogTitle className="text-white/90">All Google Accounts</DialogTitle>
                      <DialogDesc className="text-white/50">Select an account or add a new one:</DialogDesc>
                    </DialogHeader>
                    
                    <div className="space-y-2 mt-4 max-h-96 overflow-y-auto">
                      {uniqueAccounts.map((email, idx) => {
                        const isLastUsed = email === cachedEmail;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleSelectPreviousAccount(email)}
                            disabled={loading}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group ${
                              isLastUsed
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20'
                                : 'bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isLastUsed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'
                            }`}>
                              <User className="w-5 h-5" />
                            </div>
                            <div className="flex-1 text-left">
                              <div className="text-sm font-medium text-white/90">{email}</div>
                              {isLastUsed && (
                                <div className="text-xs text-emerald-400">Last used</div>
                              )}
                            </div>
                            <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${
                              isLastUsed ? 'text-emerald-400' : 'text-white/30'
                            }`} />
                          </button>
                        );
                      })}

                      <button
                        onClick={handleAddNewAccount}
                        disabled={loading}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-transparent hover:bg-white/5 border border-dashed border-white/20 hover:border-white/30 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group mt-4"
                      >
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 text-white/40">
                          <Plus className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-white/90">Add new Google account</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </div>
                  </DialogContent>
                </Dialog>
              );
            })()}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#121214] px-2 text-white/40">Or continue with email</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <Form {...form}>
              <form onSubmit={handleEmailAuth} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-medium text-white/70">
                    Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="h-11 bg-black/50 border-white/10 text-white placeholder-white/20 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    required={mode === 'signup'}
                    disabled={loading}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-white/70">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 h-11 bg-black/50 border-white/10 text-white placeholder-white/20 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium text-white/70">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="pl-10 pr-12 h-11 bg-black/50 border-white/10 text-white placeholder-white/20 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    required
                    disabled={loading}
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'signup' && (
                  <div className="pt-1 space-y-1">
                    <p className="text-[10px] font-medium text-white/40 mb-1.5">Password strength:</p>
                    <div className="grid grid-cols-3 gap-1">
                      <div className={`h-1 rounded-full transition-all ${password.length >= 8 ? 'bg-emerald-500' : 'bg-white/10'}`} />
                      <div className={`h-1 rounded-full transition-all ${/[a-zA-Z]/.test(password) && password.length >= 4 ? 'bg-emerald-500' : 'bg-white/10'}`} />
                      <div className={`h-1 rounded-full transition-all ${/\d/.test(password) && password.length >= 6 ? 'bg-emerald-500' : 'bg-white/10'}`} />
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : (
                  <>
                    {mode === 'signup' ? 'Create Account' : 'Sign In'}
                  </>
                )}
              </button>
            </form>
            </Form>

            {/* Toggle Mode */}
            <div className="text-center">
              {mode === 'signin' ? (
                <p className="text-sm text-white/40">
                  Don't have an account?{' '}
                  <button
                    onClick={() => {
                      setMode('signup');
                      setError('');
                    }}
                    className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors hover:underline underline-offset-4"
                    disabled={loading}
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p className="text-sm text-white/40">
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setMode('signin');
                      setError('');
                    }}
                    className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors hover:underline underline-offset-4"
                    disabled={loading}
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
