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
    return NextResponse.redirect(`${requestUrl.origin}/analyze?error=${error}`);
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
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle();

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
        console.error('❌ Insert error:', insertError);
        // Don't fail auth, just log it
      } else {
        console.log('✅ User created successfully!');
      }
    } else {
      console.log('🟢 Updating last_login for existing user...');
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.user.id);
    }

    console.log('🟢 Redirecting to /dashboard...');
    return NextResponse.redirect(`${requestUrl.origin}/dashboard`);

  } catch (err) {
    console.error('❌ Callback route exception:', err);
    console.error('❌ Error stack:', err.stack);
    return NextResponse.redirect(`${requestUrl.origin}/dashboard?error=callback_exception&details=${encodeURIComponent(err.message)}`);
  }
}