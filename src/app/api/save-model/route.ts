import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import { requireAuth } from '@/shared/auth/auth'
import { db } from '@/db/client'
import { projects } from '@/db'
import { eq } from 'drizzle-orm'
import {
  sanitizePath,
  sanitizeFilename,
  isValidProjectId,
  isAllowedUrl,
  safeFetch,
  secureLog,
} from '@/shared/auth/security'
import { getErrorMessage } from '@/shared/errors/error-utils'

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, filename, modelUrl } = await request.json()

    if (!projectId || !filename || !modelUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate project ID format
    if (!isValidProjectId(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 })
    }

    // Verify user owns the project
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Sanitize filename
    const safeFilename = sanitizeFilename(filename)
    if (!safeFilename) {
      secureLog.warn('Invalid filename rejected', { filename })
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    // SSRF protection on modelUrl
    const urlCheck = isAllowedUrl(modelUrl)
    if (!urlCheck.allowed) {
      secureLog.warn('SSRF attempt blocked in save-model', { modelUrl, reason: urlCheck.reason })
      return NextResponse.json({ error: 'URL not allowed' }, { status: 403 })
    }

    // Construct safe file path
    const relativePath = `${projectId}/assets/${safeFilename}`
    const { safe, sanitizedPath, error } = sanitizePath(relativePath, 'projects')

    if (!safe || !sanitizedPath) {
      secureLog.warn('Path traversal blocked in save-model', { relativePath, error })
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    // Ensure directory exists
    const dir = sanitizedPath.substring(0, sanitizedPath.lastIndexOf('/'))
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Fetch the model file with SSRF protection
    const response = await safeFetch(modelUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch model: ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()

    // Validate file size (max 100MB)
    if (buffer.byteLength > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 413 })
    }

    fs.writeFileSync(sanitizedPath, Buffer.from(buffer))

    return NextResponse.json({
      success: true,
      path: `/projects/${projectId}/assets/${safeFilename}`,
    })
  } catch (error: unknown) {
    secureLog.error('Error saving model:', { message: getErrorMessage(error) })
    return NextResponse.json({ error: 'Failed to save model' }, { status: 500 })
  }
}
