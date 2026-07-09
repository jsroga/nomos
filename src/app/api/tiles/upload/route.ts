import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import sharp from 'sharp'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/shared/data/api-utils'
import { formFile, formInt, formString } from '@/shared/data/form-data-guards'

const TILE_SIZE = 1024

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const formData = await request.formData()
    const file = formFile(formData, 'file')
    const projectId = formString(formData, 'projectId')
    const x = formInt(formData, 'x')
    const y = formInt(formData, 'y')

    if (!file || !projectId || x === null || y === null) {
      return NextResponse.json(
        { error: 'Missing required fields: file, projectId, x, y' },
        { status: 400 }
      )
    }

    // Verify project access
    const hasAccess = await verifyProjectAccess(supabase, projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PNG, JPEG, and WebP are allowed.' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const resizedBuffer = await sharp(buffer)
      .resize(TILE_SIZE, TILE_SIZE, { fit: 'cover', position: 'center' })
      .png()
      .toBuffer()

    const filename = `tiles/${projectId}/${x}_${y}_${Date.now()}.png`

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN not configured' }, { status: 500 })
    }

    const blob = await put(filename, resizedBuffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: 'image/png',
    })

    // Save to database using authenticated client (RLS enforced)
    const { data: tile, error } = await supabase
      .from('tiles')
      .upsert(
        {
          project_id: projectId,
          x,
          y,
          tile_prompt: `Uploaded tile at (${x}, ${y})`,
          image_filename: blob.url,
        },
        { onConflict: 'project_id,x,y' }
      )
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, url: blob.url, tile })
  }),
  { maxRequests: 30, windowMs: 60000 }
)
