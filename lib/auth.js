// lib/auth.js
import { supabase } from './supabase';

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email, password, name) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          auth_provider: 'email'
        }
      }
    });

    if (error) throw error;

    // Create user record in our users table
    if (data.user) {
      const { error: dbError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          name: name,
          auth_provider: 'email',
          email_verified: false
        });

      if (dbError) console.error('Error creating user record:', dbError);
    }

    return { data, error: null };
  } catch (error) {
    console.error('Signup error:', error);
    return { data: null, error };
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // Update last_login timestamp
    if (data.user) {
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.user.id);
    }

    return { data, error: null };
  } catch (error) {
    console.error('Login error:', error);
    return { data: null, error };
  }
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  try {
    console.log('🔵 Step 1: Starting Google signin...');
    console.log('🔵 Redirect URL will be:', `${window.location.origin}/auth/callback`);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    console.log('🔵 Step 2: OAuth response:', { data, error });
    
    if (error) {
      console.error('❌ OAuth error:', error);
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('❌ Catch block error:', error);
    return { data: null, error };
  }
}

/**
 * Sign out
 */
export async function signOut() {
  try {
    console.log('🔴 [auth.js] Starting signOut...');
    // Sign out with 'local' scope to only clear the current tab
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    console.log('🔴 [auth.js] Supabase signOut response:', { error });
    if (error) throw error;
    console.log('🔴 [auth.js] SignOut successful');
    return { error: null };
  } catch (error) {
    console.error('🔴 [auth.js] Signout error:', error);
    return { error };
  }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    console.error('Get user error:', error);
    return { user: null, error };
  }
}

/**
 * Get current session
 */
export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { session, error: null };
  } catch (error) {
    console.error('Get session error:', error);
    return { session: null, error };
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}