// lib/AuthContext.js
'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from './supabase';
import { trackAuth } from './analytics';

const AuthContext = createContext({});

// OPTIMIZATION: Pre-check localStorage synchronously before React hydration
// This allows us to set initial state without waiting for async auth check
function getInitialUserFromStorage() {
  if (typeof window === 'undefined') return null;
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;
    
    const projectRef = supabaseUrl.split('//')[1]?.split('.')[0];
    if (!projectRef) return null;
    
    // Check multiple possible session key formats (Supabase may use different formats)
    const possibleKeys = [
      `sb-${projectRef}-auth-token`,
      `sb-${projectRef}-auth-token-code-verifier`,
      // Also check for any key that starts with sb- and contains auth
      ...Object.keys(localStorage).filter(key => 
        key.startsWith(`sb-${projectRef}`) && key.includes('auth')
      )
    ];
    
    for (const sessionKey of possibleKeys) {
      const sessionData = localStorage.getItem(sessionKey);
      if (!sessionData) continue;
      
      try {
        const parsed = JSON.parse(sessionData);
        if (parsed?.user && parsed?.access_token) {
          // Check if token is not expired (with 60s buffer)
          const expiresAt = parsed.expires_at;
          if (expiresAt && expiresAt * 1000 > Date.now() + 60000) {
            return parsed.user;
          }
        }
      } catch (e) {
        // Try next key
        continue;
      }
    }
  } catch (e) {
    // Silent fail - will fall back to async check
  }
  return null;
}

export function AuthProvider({ children }) {
  // OPTIMIZATION: Initialize with cached user from localStorage for instant hydration
  const [user, setUser] = useState(() => getInitialUserFromStorage());
  const [loading, setLoading] = useState(() => {
    // If we have a cached user, we're not loading
    return getInitialUserFromStorage() === null;
  });
  
  // Use ref to track if session check is done (prevents stale closure issues)
  const sessionCheckDoneRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    let timeoutId = null;

    // OPTIMIZATION: If we already have a user from localStorage, just verify it's still valid
    const hasInitialUser = user !== null;
    if (hasInitialUser) {
      sessionCheckDoneRef.current = true;
    }

    // Listen for localStorage changes from other tabs (cross-tab session sync)
    const handleStorageChange = (e) => {
      if (!mounted) return;
      
      // Check if it's a Supabase auth-related localStorage change
      if (e.key && (e.key.includes('supabase') || e.key.includes('auth') || e.key.startsWith('sb-'))) {
        // Re-check session when localStorage changes (important for new tabs)
        console.log('[AuthContext] Storage change detected from another tab, re-checking session:', e.key);
        checkUser();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);

    // Optimized session check - faster with better error handling
    const checkUser = async () => {
      try {
        console.log('[AuthContext] Checking session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.warn('[AuthContext] Error getting session:', error.message);
          if (!sessionCheckDoneRef.current) {
            setUser(null);
            setLoading(false);
            sessionCheckDoneRef.current = true;
            console.log('[AuthContext] Session check complete - no user (error)');
          }
        } else {
          const hasUser = !!session?.user;
          console.log('[AuthContext] Session check complete:', { hasUser, userId: session?.user?.id });
          
          if (!sessionCheckDoneRef.current) {
            setUser(session?.user ?? null);
            setLoading(false);
            sessionCheckDoneRef.current = true;
          } else if (session?.user?.id !== user?.id) {
            // User changed - update
            console.log('[AuthContext] User changed, updating state');
            setUser(session?.user ?? null);
          }
        }
      } catch (error) {
        if (!mounted) return;
        console.error('[AuthContext] Exception in checkUser:', error);
        if (!sessionCheckDoneRef.current) {
          setUser(null);
          setLoading(false);
          sessionCheckDoneRef.current = true;
          console.log('[AuthContext] Session check complete - no user (exception)');
        }
      }
    };

    // OPTIMIZATION: Reduced timeout from 4s to 1.5s - most auth checks complete in <500ms
    timeoutId = setTimeout(() => {
      if (!mounted) return;
      if (!sessionCheckDoneRef.current) {
        console.warn('[AuthContext] Auth check timeout - proceeding without auth');
        setLoading(false);
        sessionCheckDoneRef.current = true;
      }
    }, 1500);

    // Listen for auth changes FIRST (this fires immediately with INITIAL_SESSION if session exists)
    // This is critical for new tabs - INITIAL_SESSION fires before getSession() completes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('[AuthContext] Auth state change:', { event, hasSession: !!session, hasUser: !!session?.user });
      
      // Always update user state from the event (this is the source of truth)
      setUser(session?.user ?? null);
      setLoading(false);
      sessionCheckDoneRef.current = true;
      
      // Clear timeout since we got a response
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // For INITIAL_SESSION, we're done - don't need to check again
      if (event === 'INITIAL_SESSION') {
        console.log('[AuthContext] INITIAL_SESSION received, auth state initialized');
        return;
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

          // Track authentication events
          if (event === 'SIGNED_IN') {
            const authMethod = session.user.app_metadata?.provider || 
                             session.user.identities?.[0]?.provider || 
                             'unknown'
            
            // If no existing user record, this is likely a signup
            if (!existingUser) {
              trackAuth.signup(authMethod)
            } else {
              trackAuth.login(authMethod)
            }
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
        // Track signout
        trackAuth.signout()
        // Don't clear - keep it for next time they want to sign in
        // localStorage.removeItem('lastGoogleEmail');
      }
    });

    // Always call checkUser to verify session from cookies (works across tabs)
    // Even if we have an initial user from localStorage, we need to verify from cookies
    // This ensures new tabs get the correct session state
    checkUser();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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