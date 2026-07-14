import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import {
  withAuth,
  withRateLimit,
  verifyProjectAccess,
  type AuthenticatedRequest,
} from '@/shared/data/api-utils'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import {
  BufferEncoding,
  FsDirectory,
} from '@/shared/data/constants/protocol'

// eslint-disable-next-line local/no-magic-string -- Next.js segment config must be a statically analyzable literal (user-approved exception, 2026-07-09)
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { supabase }: AuthenticatedRequest) => {
    const body = await request.json()
    const { projectId, filename, imageData } = body

    if (!projectId || !filename) {
      return NextResponse.json({ error: API_ERROR.MISSING_PROJECT_ID_OR_FILENAME }, { status: 400 })
    }

    if (!imageData) {
      return NextResponse.json({ error: API_ERROR.MISSING_IMAGE_DATA }, { status: 400 })
    }

    const hasAccess = await verifyProjectAccess(supabase, projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const sanitizedFilename = path.basename(filename)
    if (sanitizedFilename !== filename && !filename.startsWith('assets/')) {
      return NextResponse.json({ error: API_ERROR.INVALID_FILENAME }, { status: 400 })
    }

    const projectDir = path.join(process.cwd(), FsDirectory.Public, FsDirectory.Projects, projectId)
    const filePath = path.resolve(projectDir, filename)

    if (!filePath.startsWith(projectDir + path.sep) && filePath !== projectDir) {
      return NextResponse.json({ error: API_ERROR.INVALID_FILENAME }, { status: 400 })
    }

    const fileDir = path.dirname(filePath)

    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true })
    }

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')

    if (!base64Data || base64Data.length === 0) {
      return NextResponse.json({ error: API_ERROR.EMPTY_IMAGE_DATA }, { status: 400 })
    }

    const buffer = Buffer.from(base64Data, BufferEncoding.Base64)
    if (buffer.length === 0) {
      return NextResponse.json({ error: API_ERROR.INVALID_BASE64_DATA }, { status: 400 })
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
