// lib/AuthContext.js
'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from './supabase';
import { trackAuth } from './analytics';

const AuthContext = createContext({});

// BroadcastChannel name for cross-tab auth sync
const AUTH_CHANNEL_NAME = 'tradeclarity-auth-sync';

export function AuthProvider({ children }) {
  // Start with null user - will be set by onAuthStateChange
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Use ref to track if session check is done (prevents stale closure issues)
  const sessionCheckDoneRef = useRef(false);
  const broadcastChannelRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId = null;

    // Set up BroadcastChannel for cross-tab communication
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        broadcastChannelRef.current = new BroadcastChannel(AUTH_CHANNEL_NAME);
        
        broadcastChannelRef.current.onmessage = (event) => {
          if (!mounted) return;
          
          const { type, userId } = event.data;
          console.log('[AuthContext] BroadcastChannel message received:', { type, userId });
          
          if (type === 'AUTH_STATE_CHANGED') {
            // Another tab logged in/out - refresh session
            console.log('[AuthContext] Auth state changed in another tab, refreshing session...');
            checkUser();
          }
        };
      } catch (error) {
        console.warn('[AuthContext] BroadcastChannel not supported or failed:', error);
      }
    }

    // Broadcast auth state changes to other tabs
    const broadcastAuthChange = (eventType, userId) => {
      if (broadcastChannelRef.current && typeof window !== 'undefined') {
        try {
          broadcastChannelRef.current.postMessage({
            type: 'AUTH_STATE_CHANGED',
            event: eventType,
            userId: userId
          });
          console.log('[AuthContext] Broadcasted auth change to other tabs:', { event: eventType, userId });
        } catch (error) {
          console.warn('[AuthContext] Failed to broadcast auth change:', error);
        }
      }
    };

    // Session check function - reads from cookies (works across tabs)
    const checkUser = async () => {
      try {
        console.log('[AuthContext] Checking session from cookies...');
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
          const currentUserId = session?.user?.id;
          console.log('[AuthContext] Session check complete:', { hasUser, userId: currentUserId });
          
          if (!sessionCheckDoneRef.current) {
            // Initial check - set user and loading state
            setUser(session?.user ?? null);
            setLoading(false);
            sessionCheckDoneRef.current = true;
          } else if (currentUserId !== user?.id) {
            // User changed - update state
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

    // Fallback timeout - if INITIAL_SESSION doesn't fire, proceed anyway
    timeoutId = setTimeout(() => {
      if (!mounted) return;
      if (!sessionCheckDoneRef.current) {
        console.warn('[AuthContext] Auth check timeout - proceeding without auth');
        setLoading(false);
        sessionCheckDoneRef.current = true;
      }
    }, 2000);

    // Listen for auth changes - this is the primary way to detect sessions
    // INITIAL_SESSION fires immediately when a session exists (critical for new tabs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('[AuthContext] Auth state change:', { event, hasSession: !!session, hasUser: !!session?.user, userId: session?.user?.id });
      
      // Always update user state from the event (this is the source of truth)
      const newUser = session?.user ?? null;
      setUser(newUser);
      setLoading(false);
      sessionCheckDoneRef.current = true;
      
      // Clear timeout since we got a response
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // Broadcast auth state changes to other tabs (except for INITIAL_SESSION to avoid loops)
      if (event !== 'INITIAL_SESSION' && event !== 'TOKEN_REFRESHED') {
        broadcastAuthChange(event, newUser?.id);
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

    // Call checkUser as a fallback - but onAuthStateChange should handle it first
    // This ensures we have a session even if INITIAL_SESSION doesn't fire
    checkUser();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
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