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