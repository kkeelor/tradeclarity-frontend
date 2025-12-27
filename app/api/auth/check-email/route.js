// app/api/auth/check-email/route.js
import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required', exists: false },
        { status: 400 }
      )
    }

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim()

    // Use admin client to check if user exists
    const adminClient = createAdminClient()
    
    // Method 1: Try getUserByEmail (if it exists in the API)
    try {
      const { data: userData, error } = await adminClient.auth.admin.getUserByEmail(normalizedEmail)
      
      if (!error && userData?.user) {
        console.log(`✅ Email found via getUserByEmail: ${normalizedEmail}`)
        return NextResponse.json({ exists: true })
      }
      
      // If getUserByEmail doesn't exist or returns error, fall through to Method 2
      if (error && !error.message?.includes('not found') && error.status !== 404) {
        console.warn('getUserByEmail error (trying alternative):', error.message)
      }
    } catch (methodError) {
      // Method doesn't exist or failed, try alternative
      console.log('getUserByEmail not available, trying listUsers...')
    }

    // Method 2: Check the users table directly (more reliable)
    const { data: dbUser, error: dbError } = await adminClient
      .from('users')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (!dbError && dbUser) {
      console.log(`✅ Email found in users table: ${normalizedEmail}`)
      return NextResponse.json({ exists: true })
    }

    // Method 3: Fallback to listing auth users (less efficient but works)
    try {
      const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers()
      
      if (!authError && authUsers?.users) {
        const userExists = authUsers.users.some(u => 
          u.email?.toLowerCase().trim() === normalizedEmail
        )
        
        if (userExists) {
          console.log(`✅ Email found via listUsers: ${normalizedEmail}`)
          return NextResponse.json({ exists: true })
        }
      } else if (authError) {
        console.error('Error listing users:', authError)
      }
    } catch (listError) {
      console.error('Error in listUsers fallback:', listError)
    }

    // Email not found in any method
    console.log(`❌ Email not found: ${normalizedEmail}`)
    return NextResponse.json({ exists: false })
  } catch (error) {
    console.error('Error in check-email route:', error)
    // For security, don't reveal if email exists on error
    return NextResponse.json({ exists: false })
  }
}
