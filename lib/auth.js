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
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          name: name,
          auth_provider: 'email'
        }
      }
    });

    if (error) throw error;

    // Create user record in our users table
    // Note: A database trigger may have already created the record, so we handle errors gracefully
    if (data.user) {
      try {
        // Check if user already exists (trigger may have created it)
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (checkError) {
          console.warn('⚠️ Error checking for existing user:', checkError);
          // Continue anyway - trigger may have created it
        }

        if (!existingUser) {
          // User doesn't exist, create the record
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              name: name,
              auth_provider: 'email',
              email_verified: data.user.email_confirmed_at ? true : false
            });

          if (insertError) {
            // Check if it's a duplicate key error (trigger may have already created it)
            const isDuplicateError = insertError.message?.includes('duplicate') || 
                                     insertError.code === '23505' ||
                                     insertError.message?.includes('already exists');
            
            if (isDuplicateError) {
              console.log('ℹ️ User record already exists (likely created by trigger), skipping insert');
            } else {
              console.error('❌ Error creating user record:', {
                message: insertError.message,
                code: insertError.code,
                details: insertError.details,
                hint: insertError.hint
              });
            }
          }
        } else {
          console.log('ℹ️ User record already exists, skipping insert');
        }
      } catch (userRecordError) {
        // Catch any unexpected errors in user record management
        console.error('⚠️ Unexpected error managing user record:', {
          message: userRecordError?.message,
          error: userRecordError
        });
        // Don't fail auth - user can still use the app
      }
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
 * @param {boolean} forceAccountSelection - If true, forces Google to show account picker
 */
export async function signInWithGoogle(forceAccountSelection = false) {
  try {
    console.log('🔵 Step 1: Starting Google signin...');
    console.log('🔵 Redirect URL will be:', `${window.location.origin}/auth/callback`);
    console.log('🔵 Force account selection:', forceAccountSelection);
    
    const options = {
      redirectTo: `${window.location.origin}/auth/callback`
    };

    // If forceAccountSelection is true, add query params to force account picker
    if (forceAccountSelection) {
      // Force Google to show account picker by using select_account prompt
      // Also add consent to ensure fresh selection
      options.queryParams = {
        prompt: 'select_account consent'
      };
    }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options
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
 * Request password reset email
 */
export async function resetPasswordForEmail(email) {
  try {
    const redirectTo = `${window.location.origin}/reset-password`
    console.log('🔵 [resetPasswordForEmail] Requesting password reset', {
      email: email,
      redirectTo: redirectTo,
      origin: window.location.origin
    })

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo
    });

    console.log('🔵 [resetPasswordForEmail] Response', {
      hasData: !!data,
      hasError: !!error,
      errorMessage: error?.message,
      errorStatus: error?.status,
      errorName: error?.name,
      fullError: error
    })

    if (error) throw error;
    console.log('✅ [resetPasswordForEmail] Password reset email sent successfully')
    return { data, error: null };
  } catch (error) {
    console.error('❌ [resetPasswordForEmail] Password reset error:', {
      message: error.message,
      status: error.status,
      name: error.name,
      fullError: error
    });
    return { data: null, error };
  }
}

/**
 * Update user password (used after clicking reset link)
 */
export async function updatePassword(newPassword) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Update password error:', error);
    return { data: null, error };
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}