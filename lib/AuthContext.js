// lib/AuthContext.js
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let sessionCheckDone = false;
    let timeoutId = null;

    // Listen for localStorage changes from other tabs (cross-tab session sync)
    const handleStorageChange = (e) => {
      if (!mounted) return;
      
      // Check if it's a Supabase auth-related localStorage change
      if (e.key && (e.key.includes('supabase') || e.key.includes('auth'))) {
        // Re-check session when localStorage changes
        checkUser();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check localStorage directly on mount (in case session exists but INITIAL_SESSION didn't fire)
    // Supabase stores session in localStorage with pattern: sb-{project-ref}-auth-token
    const checkLocalStorageSession = () => {
      if (!mounted) return;
      
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (supabaseUrl) {
          const projectRef = supabaseUrl.split('//')[1]?.split('.')[0];
          if (projectRef) {
            const sessionKey = `sb-${projectRef}-auth-token`;
            const sessionData = localStorage.getItem(sessionKey);
            
            if (sessionData) {
              // Parse and check if valid
              try {
                const parsed = JSON.parse(sessionData);
                if (parsed?.access_token) {
                  // Trigger session check - but don't wait for it if it hangs
                  checkUser().catch((err) => {
                    console.error('[AuthContext] Error in checkUser after localStorage find:', err);
                  });
                }
              } catch (e) {
                console.error('[AuthContext] Error parsing session data:', e);
              }
            }
          }
        }
      } catch (error) {
        console.error('[AuthContext] Error checking localStorage:', error);
      }
    };
    
    // Check localStorage immediately and after a delay
    checkLocalStorageSession();
    setTimeout(checkLocalStorageSession, 1000);

    // Also check session directly (backup method, but INITIAL_SESSION should fire first)
    const checkUser = async () => {
      try {
        console.log('[AuthContext] Checking session via getSession()...');
        // Try to get session - Supabase uses localStorage, not cookies
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        console.log('[AuthContext] getSession() result:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email,
          hasError: !!error,
          errorMessage: error?.message
        });
        
        if (error) {
          console.warn('[AuthContext] Error getting session:', error.message);
          if (!sessionCheckDone) {
            setUser(null);
            setLoading(false);
            sessionCheckDone = true;
          }
        } else {
          // Only update if onAuthStateChange hasn't fired yet (shouldn't happen, but safety)
          if (!sessionCheckDone) {
            console.log('[AuthContext] Setting user from getSession():', session?.user?.email || 'null');
            setUser(session?.user ?? null);
            setLoading(false);
            sessionCheckDone = true;
          }
        }
      } catch (error) {
        if (!mounted) return;
        console.error('[AuthContext] Exception in checkUser:', error);
        // Silently handle - no session is not an error
        if (!sessionCheckDone) {
          setUser(null);
          setLoading(false);
          sessionCheckDone = true;
        }
      }
    };

    // Set a timeout fallback in case auth check hangs
    timeoutId = setTimeout(() => {
      if (!mounted) return;
      if (!sessionCheckDone) {
        // Before giving up, try reading from localStorage directly
        checkLocalStorageSession();
        // Give it a bit more time if localStorage has session
        setTimeout(() => {
          if (!sessionCheckDone && mounted) {
            setLoading(false);
            sessionCheckDone = true;
          }
        }, 1000);
      }
    }, 4000); // Increased to 4 seconds to allow for localStorage sync

    // Listen for auth changes FIRST (this fires immediately with INITIAL_SESSION if session exists)
    // This is critical for new tabs - INITIAL_SESSION fires before getSession() completes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('[AuthContext] Auth state changed:', event, session?.user?.email || 'no user');
      setUser(session?.user ?? null);
      setLoading(false);
      sessionCheckDone = true;
      
      if (event === 'INITIAL_SESSION' && session?.user) {
        console.log('[AuthContext] ✅ Initial session detected for user:', session.user.email);
      }

      // Handle both INITIAL_SESSION and SIGNED_IN events for new users
      // INITIAL_SESSION fires on page load when user is already signed in
      // SIGNED_IN fires when user signs in (including first time)
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        // Store email in localStorage for future sign-ins (check if it's Google OAuth)
        if (session.user.email) {
          const isGoogleAuth = session.user.app_metadata?.provider === 'google' || 
                              session.user.identities?.some(identity => identity.provider === 'google');
          if (isGoogleAuth) {
            const currentEmail = session.user.email;
            const lastEmail = localStorage.getItem('lastGoogleEmail');
            
            // Store as last used email
            localStorage.setItem('lastGoogleEmail', currentEmail);
            
            // Add to previous accounts list if it's different
            const previousAccountsStr = localStorage.getItem('previousGoogleAccounts');
            let previousAccounts = [];
            
            if (previousAccountsStr) {
              try {
                previousAccounts = JSON.parse(previousAccountsStr);
              } catch (e) {
                console.error('Error parsing previous accounts:', e);
              }
            }
            
            // Add current email if not already in list and different from last
            if (!previousAccounts.includes(currentEmail) && currentEmail !== lastEmail) {
              previousAccounts.push(currentEmail);
              // Keep only last 5 accounts
              if (previousAccounts.length > 5) {
                previousAccounts = previousAccounts.slice(-5);
              }
              localStorage.setItem('previousGoogleAccounts', JSON.stringify(previousAccounts));
            }
          }
        }

        // Check if user record exists and create/update as needed
        // Note: A database trigger may have already created the record, so we handle errors gracefully
        try {
          const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('id', session.user.id)
            .maybeSingle();

          if (checkError) {
            console.error('Error checking for existing user:', checkError);
            // Continue anyway - user might still be able to use the app
          }

          if (!existingUser) {
            // Try to create user record (may fail if trigger already created it)
            const { error: insertError } = await supabase.from('users').insert({
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
              google_id: session.user.user_metadata?.sub,
              auth_provider: 'google',
              email_verified: true,
              last_login: new Date().toISOString()
            });

            // Ignore duplicate key errors (trigger may have already created the record)
            if (insertError && !insertError.message?.includes('duplicate') && !insertError.code?.includes('23505')) {
              console.error('Error creating user record:', insertError);
              // Don't throw - user can still use the app, record might exist from trigger
            }
          } else {
            // Update last_login
            const { error: updateError } = await supabase
              .from('users')
              .update({ last_login: new Date().toISOString() })
              .eq('id', session.user.id);
            
            if (updateError) {
              console.error('Error updating last_login:', updateError);
              // Non-critical error, continue anyway
            }
          }
        } catch (error) {
          // Catch any unexpected errors and log them, but don't break the auth flow
          console.error('Unexpected error in user record management:', error);
        }
      }

      // Clear cached email on sign out
      if (event === 'SIGNED_OUT') {
        // Don't clear - keep it for next time they want to sign in
        // localStorage.removeItem('lastGoogleEmail');
      }
    });

    // Check session (backup, but INITIAL_SESSION listener should handle it first)
    checkUser().finally(() => {
      if (mounted && sessionCheckDone && timeoutId) {
        clearTimeout(timeoutId);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}