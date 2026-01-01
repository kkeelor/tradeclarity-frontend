// app/components/AuthModal.js
'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { TrendingUp, Lock, Loader2, AlertCircle, Eye, EyeOff, Mail, Shield, Sparkles, X, User, ChevronRight, Plus } from 'lucide-react';
import { signUpWithEmail, signInWithEmail, signInWithGoogle } from '@/lib/auth';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';

export default function AuthModal({ open, onOpenChange, onAuthSuccess }) {
  const pathname = usePathname();
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

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setMode('signin');
      setEmail('');
      setPassword('');
      setName('');
      setError('');
      setShowPassword(false);
      setShowGoogleEmailModal(false);
      setShowAccountPicker(false);
    }
  }, [open]);

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
        
        if (data.user && data.session) {
          toast.success('Account Created', {
            description: 'Welcome to TradeClarity!',
            duration: 3000
          });
          
          setTimeout(() => {
            if (onAuthSuccess) {
              onAuthSuccess(data.user);
            }
            onOpenChange(false);
            window.location.reload();
          }, 500);
        } else {
          toast.success('Account Created', {
            description: 'Please check your email to verify your account',
            duration: 5000
          });
        }
      } else {
        const { data, error } = await signInWithEmail(email, password);
        if (error) throw error;
        
        if (data.user) {
          if (onAuthSuccess) {
            onAuthSuccess(data.user);
          }
          onOpenChange(false);
          window.location.reload();
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
      // Store current page URL so callback can redirect back here
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname + window.location.search;
        const redirectPath = currentPath;
        
        // Pass redirect path as query param in callback URL
        const callbackUrl = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectPath)}`;
        
        // Use custom callback URL with redirect path
        const { supabase } = await import('@/lib/supabase');
        
        const options = {
          redirectTo: callbackUrl
        };
        
        if (forceAccountSelection) {
          options.queryParams = {
            prompt: 'select_account consent'
          };
        }
        
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options
        });
        
        if (error) throw error;
        // Google redirects automatically
      } else {
        // Pass current pathname as redirect path, or default to /dashboard
        const redirectPath = pathname && pathname !== '/' ? pathname : '/dashboard';
        const { data, error } = await signInWithGoogle(forceAccountSelection, redirectPath);
        if (error) throw error;
      }
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
    
    if (allAccounts.length <= 1) {
      handleGoogleAuth(true);
    } else {
      setShowAccountPicker(true);
    }
  };

  const handleSelectPreviousAccount = (email) => {
    localStorage.setItem('lastGoogleEmail', email);
    setCachedEmail(email);
    setShowAccountPicker(false);
    handleGoogleAuth(false);
  };

  const handleAddNewAccount = () => {
    setShowAccountPicker(false);
    handleGoogleAuth(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 mb-4">
                <TrendingUp className="w-8 h-8 text-emerald-400" />
                <h1 className="text-2xl font-bold text-white">TradeClarity</h1>
              </div>
              <DialogTitle className="text-xl font-bold">
                {mode === 'signup' ? 'Create your account' : ''}
              </DialogTitle>
              <DialogDesc className="text-slate-400">
                {mode === 'signup' 
                  ? 'Start analyzing your trades in minutes' 
                  : 'Sign in to access your trading analytics'}
              </DialogDesc>
            </div>
          </DialogHeader>

          <div className="relative overflow-hidden space-y-5 pt-4">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5" />
            <div className="relative">
              {/* Google OAuth Button */}
              <button
                onClick={handleGoogleButtonClick}
                disabled={loading}
                className="w-full h-11 flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:hover:scale-100"
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
                <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-slate-100">Choose Account</DialogTitle>
                    <DialogDesc className="text-slate-400">Select which account you'd like to sign in with:</DialogDesc>
                  </DialogHeader>
                  
                  <div className="space-y-3">
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
                </DialogContent>
              </Dialog>

              {/* Account Picker Modal */}
              {(() => {
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
                const uniqueAccounts = [...new Set(allAccounts)];
                
                return (
                  <Dialog open={showAccountPicker} onOpenChange={setShowAccountPicker}>
                    <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-slate-100">All Google Accounts</DialogTitle>
                        <DialogDesc className="text-slate-400">Select an account or add a new one:</DialogDesc>
                      </DialogHeader>
                      
                      <div className="space-y-3 max-h-96 overflow-y-auto">
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

                        {uniqueAccounts.length === 0 && (
                          <div className="text-center py-4 text-sm text-slate-400">
                            No previous accounts found
                          </div>
                        )}

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
                    </DialogContent>
                  </Dialog>
                );
              })()}

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-slate-800/50 text-slate-400">Or continue with email</span>
                </div>
              </div>

              {/* Email/Password Form */}
              <Form {...form}>
                <form onSubmit={handleEmailAuth} className="space-y-5">
                {mode === 'signup' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-sm text-slate-300">
                      Name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="h-11 bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:ring-emerald-500/30"
                      required={mode === 'signup'}
                      disabled={loading}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm text-slate-300">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-10 h-11 bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:ring-emerald-500/30"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm text-slate-300">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="pl-10 pr-12 h-11 bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:ring-emerald-500/30"
                      required
                      disabled={loading}
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors z-10"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {mode === 'signup' && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-xs font-medium text-slate-400 mb-1">Password requirements:</p>
                      <div className="space-y-1 text-xs text-slate-400">
                        <div className={`flex items-center gap-2 ${password.length >= 8 ? 'text-emerald-400' : ''}`}>
                          <span>{password.length >= 8 ? '+' : '-'}</span>
                          <span>At least 8 characters</span>
                        </div>
                        <div className={`flex items-center gap-2 ${/[a-zA-Z]/.test(password) ? 'text-emerald-400' : ''}`}>
                          <span>{/[a-zA-Z]/.test(password) ? '+' : '-'}</span>
                          <span>At least one letter</span>
                        </div>
                        <div className={`flex items-center gap-2 ${/\d/.test(password) ? 'text-emerald-400' : ''}`}>
                          <span>{/\d/.test(password) ? '+' : '-'}</span>
                          <span>At least one digit</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <AlertDescription className="text-red-400 text-sm">{error}</AlertDescription>
                  </Alert>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02] disabled:hover:scale-100 disabled:shadow-none"
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
                </Form>

                {/* Toggle Mode */}
                <div className="text-center pt-2">
                  {mode === 'signin' ? (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-400">Don't have an account?</p>
                      <button
                        onClick={() => {
                          setMode('signup');
                          setError('');
                        }}
                        className="text-base font-semibold text-emerald-400 hover:text-emerald-300 transition-colors underline decoration-2 underline-offset-2"
                        disabled={loading}
                      >
                        Sign up
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm">
                      <span className="text-slate-400">Already have an account? </span>
                      <button
                        onClick={() => {
                          setMode('signin');
                          setError('');
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                        disabled={loading}
                      >
                        Sign in
                      </button>
                    </div>
                  )}
                </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
