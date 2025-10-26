// app/api/auth/signout/route.js
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    console.log('🔴 [API] Sign out route called')
    const supabase = createClient()

    console.log('🔴 [API] Calling supabase.auth.signOut()')
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('🔴 [API] Sign out error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('🔴 [API] Sign out successful')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('🔴 [API] Catch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
