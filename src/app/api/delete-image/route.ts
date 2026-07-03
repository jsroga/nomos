import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { withAuth, verifyProjectAccess, type AuthenticatedRequest } from '@/shared/data/api-utils'

export const POST = withAuth(
  async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const { projectId, filename } = await request.json()

    if (!projectId || !filename) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify project access
    const hasAccess = await verifyProjectAccess(supabase, projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = path.basename(filename)
    if (sanitizedFilename !== filename) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    const filePath = path.join(process.cwd(), 'public', 'projects', projectId, filename)

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: true, message: 'File not found' })
    }
  }
)
