import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { withAuth, withRateLimit, verifyProjectAccess, type AuthenticatedRequest } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const body = await request.json()
    const { projectId, filename, imageData } = body

    if (!projectId || !filename) {
      return NextResponse.json({ error: 'Missing projectId or filename' }, { status: 400 })
    }

    if (!imageData) {
      return NextResponse.json({ error: 'Missing imageData' }, { status: 400 })
    }

    // Verify project access
    const hasAccess = await verifyProjectAccess(supabase, projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = path.basename(filename)
    if (sanitizedFilename !== filename && !filename.startsWith('assets/')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    const projectDir = path.join(process.cwd(), 'public', 'projects', projectId)
    const filePath = path.join(projectDir, filename)
    const fileDir = path.dirname(filePath)

    // Ensure directory exists
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true })
    }

    // Remove data:image prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')

    if (!base64Data || base64Data.length === 0) {
      return NextResponse.json({ error: 'Empty image data' }, { status: 400 })
    }

    const buffer = Buffer.from(base64Data, 'base64')
    if (buffer.length === 0) {
      return NextResponse.json({ error: 'Invalid base64 data' }, { status: 400 })
    }

    fs.writeFileSync(filePath, buffer)

    const stats = fs.statSync(filePath)
    return NextResponse.json({
      success: true,
      path: `/projects/${projectId}/${filename}`,
      size: stats.size,
    })
  }),
  { maxRequests: 60, windowMs: 60000 }
)
