import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { put } from '@vercel/blob'
import sharp from 'sharp'

const TILE_SIZE = 1024

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string
    const x = parseInt(formData.get('x') as string)
    const y = parseInt(formData.get('y') as string)

    if (!file || !projectId || isNaN(x) || isNaN(y)) {
      return NextResponse.json(
        { error: 'Missing required fields: file, projectId, x, y' },
        { status: 400 }
      )
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PNG, JPEG, and WebP are allowed.' },
        { status: 400 }
      )
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Resize to 512x512 (1:1 aspect ratio)
    const resizedBuffer = await sharp(buffer)
      .resize(TILE_SIZE, TILE_SIZE, {
        fit: 'cover', // Crop to fill 512x512
        position: 'center',
      })
      .png()
      .toBuffer()

    // Generate filename
    const filename = `tiles/${projectId}/${x}_${y}_${Date.now()}.png`

    // Upload to Vercel Blob
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN not configured' }, { status: 500 })
    }

    const blob = await put(filename, resizedBuffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: 'image/png',
    })

    // Save to database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: tile, error } = await supabase
      .from('tiles')
      .upsert(
        {
          project_id: projectId,
          x,
          y,
          tile_prompt: `Uploaded tile at (${x}, ${y})`,
          image_filename: blob.url, // Store the full Vercel Blob URL
        },
        { onConflict: 'project_id,x,y' }
      )
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      url: blob.url,
      tile,
    })
  } catch (error: any) {
    console.error('Error uploading tile:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
