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

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      setUser(session?.user ?? null);
      setLoading(false);

      // If user signs in with Google for first time, create user record
      if (event === 'SIGNED_IN' && session?.user) {
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