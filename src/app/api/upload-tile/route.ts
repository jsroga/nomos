import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/shared/data/api-utils'



export const dynamic = 'force-dynamic'

export const POST = withRateLimit(
  withAuth<any>(async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const { projectId, x, y, imageBase64, prompt } = await request.json()

    if (!projectId || x === undefined || y === undefined || !imageBase64) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, x, y, imageBase64' },
        { status: 400 }
      )
    }

    // Verify project access
    const hasAccess = await verifyProjectAccess(supabase, projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Generate filename
    const filename = `${x}_${y}_${Date.now()}.png`

    // Ensure project directory exists
    const projectDir = path.join(process.cwd(), 'public', 'projects', projectId)
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')

    // Save image to filesystem
    const buffer = Buffer.from(base64Data, 'base64')
    const filePath = path.join(projectDir, filename)
    fs.writeFileSync(filePath, buffer)

    // Update database using authenticated client (RLS enforced)
    const { data, error } = await (supabase as any)
      .from('tiles')
      .upsert(
        {
          project_id: projectId,
          x,
          y,
          tile_prompt: prompt || `Uploaded tile at (${x}, ${y})`,
          image_filename: filename,
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
      filename,
      imageUrl: `/projects/${projectId}/${filename}`,
      tile: data,
    })
  }),
  { maxRequests: 30, windowMs: 60000 }
)
