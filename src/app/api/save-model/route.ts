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
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { ApiErrorMessage, FsDirectory } from '@/shared/data/constants/protocol'

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: ApiErrorMessage.UNAUTHORIZED }, { status: 401 })
    }

    const { projectId, filename, modelUrl } = await request.json()

    if (!projectId || !filename || !modelUrl) {
      return NextResponse.json({ error: API_ERROR.MISSING_REQUIRED_FIELDS }, { status: 400 })
    }

    if (!isValidProjectId(projectId)) {
      return NextResponse.json({ error: API_ERROR.INVALID_PROJECT_ID_FORMAT }, { status: 400 })
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: API_ERROR.ACCESS_DENIED }, { status: 403 })
    }

    const safeFilename = sanitizeFilename(filename)
    if (!safeFilename) {
      secureLog.warn(API_ERROR.INVALID_FILENAME_REJECTED, { filename })
      return NextResponse.json({ error: API_ERROR.INVALID_FILENAME }, { status: 400 })
    }

    const urlCheck = isAllowedUrl(modelUrl)
    if (!urlCheck.allowed) {
      secureLog.warn(API_LOG_PREFIX.SSRF_BLOCKED_SAVE_MODEL, { modelUrl, reason: urlCheck.reason })
      return NextResponse.json({ error: API_ERROR.URL_NOT_ALLOWED }, { status: 403 })
    }

    const relativePath = `${projectId}/assets/${safeFilename}`
    const { safe, sanitizedPath, error } = sanitizePath(relativePath, FsDirectory.Projects)

    if (!safe || !sanitizedPath) {
      secureLog.warn(API_LOG_PREFIX.PATH_TRAVERSAL_SAVE_MODEL, { relativePath, error })
      return NextResponse.json({ error: API_ERROR.INVALID_FILE_PATH }, { status: 400 })
    }

    const dir = sanitizedPath.substring(0, sanitizedPath.lastIndexOf('/'))
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const response = await safeFetch(modelUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch model: ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()

    if (buffer.byteLength > 100 * 1024 * 1024) {
      return NextResponse.json({ error: API_ERROR.FILE_TOO_LARGE_100MB }, { status: 413 })
    }

    fs.writeFileSync(sanitizedPath, Buffer.from(buffer))

    return NextResponse.json({
      success: true,
      path: `/projects/${projectId}/assets/${safeFilename}`,
    })
  } catch (error: unknown) {
    secureLog.error(API_LOG_PREFIX.SAVE_MODEL_ERROR, { message: getErrorMessage(error) })
    return NextResponse.json({ error: API_ERROR.FAILED_SAVE_MODEL }, { status: 500 })
  }
}
