import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
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
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { FsDirectory } from '@/shared/data/constants/protocol'

interface SaveModelPayload {
  projectId: string
  filename: string
  modelUrl: string
}

export async function validateSaveModelRequest(
  request: NextRequest,
  userId: string
): Promise<NextResponse | { payload: SaveModelPayload; sanitizedPath: string; safeFilename: string }> {
  const { projectId, filename, modelUrl } = await request.json()

  if (!projectId || !filename || !modelUrl) {
    return NextResponse.json({ error: API_ERROR.MISSING_REQUIRED_FIELDS }, { status: 400 })
  }

  if (!isValidProjectId(projectId)) {
    return NextResponse.json({ error: API_ERROR.INVALID_PROJECT_ID_FORMAT }, { status: 400 })
  }

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
  if (!project || project.userId !== userId) {
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

  return { payload: { projectId, filename, modelUrl }, sanitizedPath, safeFilename }
}

export async function fetchAndWriteModelFile(
  modelUrl: string,
  sanitizedPath: string
): Promise<NextResponse | null> {
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
  return null
}
