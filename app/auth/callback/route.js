// app/auth/callback/route.js
import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  console.log('\n🟢 ===== CALLBACK ROUTE HIT =====');
  
  const requestUrl = new URL(request.url);
  console.log('🟢 Full URL:', requestUrl.href);
  
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  
  console.log('🟢 Code present:', !!code);
  console.log('🟢 Code value:', code?.substring(0, 20) + '...');
  console.log('🟢 Error param:', error);

  if (error) {
    console.error('❌ OAuth error from URL:', error);
    const errorDescription = requestUrl.searchParams.get('error_description') || '';
    const errorCode = requestUrl.searchParams.get('error_code') || '';
    
    // Check if it's a database error that we can recover from
    // Supabase may report database errors during user creation, but the user might still be authenticated
    const isDatabaseError = errorDescription?.toLowerCase().includes('database') || 
                            errorDescription?.toLowerCase().includes('saving');
    
    if (isDatabaseError) {
      console.log('ℹ️ Database error detected, checking if user is still authenticated...');
      
      // Try to check if user is authenticated despite the error
      // The auth user might exist even if the users table record creation failed
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('✅ User is authenticated despite database error. User ID:', session.user.id);
          // User is authenticated - redirect to dashboard
          // AuthContext will handle creating/updating the user record
          return NextResponse.redirect(`${requestUrl.origin}/dashboard?warning=database_error`);
        } else {
          console.log('❌ User is not authenticated. Database error prevented auth.');
          // User is not authenticated - show error
          return NextResponse.redirect(`${requestUrl.origin}/analyze?error=${error}&error_code=${errorCode}&error_description=${encodeURIComponent(errorDescription)}`);
        }
      } catch (checkError) {
        console.error('❌ Error checking session:', checkError);
        // If we can't check, assume error and redirect with error info
        return NextResponse.redirect(`${requestUrl.origin}/analyze?error=${error}&error_code=${errorCode}&error_description=${encodeURIComponent(errorDescription)}`);
      }
    }
    
    // For other errors, redirect with error info
    return NextResponse.redirect(`${requestUrl.origin}/analyze?error=${error}&error_code=${errorCode}&error_description=${encodeURIComponent(errorDescription)}`);
  }

  if (!code) {
    console.error('❌ No code in callback');
    return NextResponse.redirect(`${requestUrl.origin}/analyze?error=no_code`);
  }

  try {
    console.log('🟢 Creating Supabase client...');
    const supabase = createClient();
    
    console.log('🟢 Calling exchangeCodeForSession...');
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    console.log('🟢 Exchange result:', {
      hasData: !!data,
      hasSession: !!data?.session,
      hasUser: !!data?.user,
      error: exchangeError
    });
    
    if (exchangeError) {
      console.error('❌ Exchange error details:', {
        message: exchangeError.message,
        status: exchangeError.status,
        name: exchangeError.name
      });
      return NextResponse.redirect(`${requestUrl.origin}/dashboard?error=exchange_failed&details=${encodeURIComponent(exchangeError.message)}`);
    }

    if (!data.session || !data.user) {
      console.error('❌ No session or user in response');
      return NextResponse.redirect(`${requestUrl.origin}/dashboard?error=no_session`);
    }

    console.log('✅ Session created!', {
      userId: data.user.id,
      email: data.user.email
    });

    // Create user in custom users table
    // Note: A database trigger may have already created the record, so we handle errors gracefully
    try {
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (checkError) {
        console.error('⚠️ Error checking for existing user:', checkError);
        // Continue anyway - trigger may have created it
      }

      console.log('🟢 Existing user check:', !!existingUser);

      if (!existingUser) {
        console.log('🟢 Creating user record...');
        
        const userData = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || 
                data.user.user_metadata?.name || 
                data.user.email?.split('@')[0],
          google_id: data.user.user_metadata?.sub,
          auth_provider: 'google',
          email_verified: true,
          last_login: new Date().toISOString()
        };

        console.log('🟢 User data to insert:', userData);

        const { error: insertError } = await supabase
          .from('users')
          .insert(userData);

        if (insertError) {
          // Check if it's a duplicate key error (trigger may have already created it)
          const isDuplicateError = insertError.message?.includes('duplicate') || 
                                   insertError.code === '23505' ||
                                   insertError.message?.includes('already exists');
          
          if (isDuplicateError) {
            console.log('ℹ️ User record already exists (likely created by trigger), updating last_login...');
            // Try to update last_login instead
            await supabase
              .from('users')
              .update({ last_login: new Date().toISOString() })
              .eq('id', data.user.id);
          } else {
            console.error('❌ Insert error:', insertError);
            // Don't fail auth - user can still use the app
          }
        } else {
          console.log('✅ User created successfully!');
        }
      } else {
        console.log('🟢 Updating last_login for existing user...');
        const { error: updateError } = await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.user.id);
        
        if (updateError) {
          console.error('⚠️ Error updating last_login:', updateError);
          // Non-critical error, continue anyway
        }
      }
    } catch (userRecordError) {
      // Catch any unexpected errors in user record management
      console.error('⚠️ Unexpected error managing user record:', userRecordError);
      // Don't fail auth - user can still use the app
    }

    console.log('🟢 Redirecting to /dashboard...');
    return NextResponse.redirect(`${requestUrl.origin}/dashboard`);

  } catch (err) {
    console.error('❌ Callback route exception:', err);
    console.error('❌ Error stack:', err.stack);
    return NextResponse.redirect(`${requestUrl.origin}/dashboard?error=callback_exception&details=${encodeURIComponent(err.message)}`);
  }
}