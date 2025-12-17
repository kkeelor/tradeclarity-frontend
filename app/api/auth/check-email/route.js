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
    
    // Check if user exists by email using admin API
    const { data: userData, error } = await adminClient.auth.admin.getUserByEmail(normalizedEmail)

    if (error) {
      // If error is "User not found", email doesn't exist
      if (error.message?.includes('not found') || error.status === 404) {
        return NextResponse.json({ exists: false })
      }
      // Other errors (permissions, etc.)
      console.error('Error checking email:', error)
      // For security, don't reveal if email exists on error
      // Return false to prevent email enumeration
      return NextResponse.json({ exists: false })
    }

    // User exists if we got user data
    const exists = !!userData?.user

    return NextResponse.json({ exists })
  } catch (error) {
    console.error('Error in check-email route:', error)
    // For security, don't reveal if email exists on error
    return NextResponse.json({ exists: false })
  }
}
