// app/api/files/upload/route.js
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const MAX_FILE_SIZE = 1 * 1024 * 1024 // 1MB
const ALLOWED_TYPES = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf']
const MAX_FILES_PER_USER = 10

export async function POST(request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('files')

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Check current file count
    const { count } = await supabase
      .from('file_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (count >= MAX_FILES_PER_USER) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES_PER_USER} files allowed` },
        { status: 400 }
      )
    }

    const uploaded = []
    const errors = []

    for (const file of files) {
      try {
        // Validate file
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: File too large (max 1MB)`)
          continue
        }

        // Create unique filename
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('trade-files')
          .upload(fileName, buffer, {
            contentType: file.type,
            upsert: false
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          errors.push(`${file.name}: ${uploadError.message}`)
          continue
        }

        // Save metadata to database
        const { data: dbData, error: dbError } = await supabase
          .from('file_uploads')
          .insert({
            user_id: user.id,
            filename: file.name,
            storage_path: fileName,
            size: file.size,
            mime_type: file.type
          })
          .select()
          .single()

        if (dbError) {
          console.error('Database error:', dbError)
          // Try to clean up uploaded file
          await supabase.storage.from('trade-files').remove([fileName])
          errors.push(`${file.name}: Failed to save metadata`)
          continue
        }

        uploaded.push(dbData)
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error)
        errors.push(`${file.name}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      uploaded,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('Upload route error:', error)
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    )
  }
}
