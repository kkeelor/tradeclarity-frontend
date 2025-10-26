// app/api/files/list/route.js
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's files
    const { data: files, error: filesError } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (filesError) {
      console.error('Error fetching files:', filesError)
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
    }

    return NextResponse.json({ files })
  } catch (error) {
    console.error('List route error:', error)
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
  }
}
