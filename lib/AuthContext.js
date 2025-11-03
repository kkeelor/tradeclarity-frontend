// lib/AuthContext.js
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session on mount
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        // Silently handle - no session is not an error
        console.log('No active session');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // Set a timeout fallback in case auth check hangs
    const timeoutId = setTimeout(() => {
      console.warn('Auth check timeout - setting loading to false');
      setLoading(false);
    }, 5000); // 5 second timeout

    checkUser().finally(() => {
      clearTimeout(timeoutId);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      setUser(session?.user ?? null);
      setLoading(false);

      // If user signs in with Google for first time, create user record
      if (event === 'SIGNED_IN' && session?.user) {
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

        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!existingUser) {
          // Create user record for Google OAuth users
          await supabase.from('users').insert({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
            google_id: session.user.user_metadata?.sub,
            auth_provider: 'google',
            email_verified: true,
            last_login: new Date().toISOString()
          });
        } else {
          // Update last_login
          await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', session.user.id);
        }
      }

      // Clear cached email on sign out
      if (event === 'SIGNED_OUT') {
        // Don't clear - keep it for next time they want to sign in
        // localStorage.removeItem('lastGoogleEmail');
      }
    });

    return () => {
      subscription?.unsubscribe();
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