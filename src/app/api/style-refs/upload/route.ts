import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import sharp from 'sharp'
import {
  withAuth,
  withRateLimit,
  type AuthenticatedRequest } from '@/shared/data/api-utils'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { formFile, formString } from '@/shared/data/form-data-guards'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { BlobAccess, ContentType, FormField } from '@/shared/data/constants/protocol'
import { isAllowedStyleRefMime, STYLE_REF_BLOB_PREFIX } from '@/domains/2d-canvas/constants/mj-sref'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session }: AuthenticatedRequest) => {
    const formData = await request.formData()
    const file = formFile(formData, FormField.File)
    const projectId = formString(formData, FormField.ProjectId)

    if (!file || !projectId) {
      return NextResponse.json({ error: API_ERROR.MISSING_FILE_OR_PROJECT_ID }, { status: 400 })
    }

    const scope = await tryProjectScope(projectId, session.user.id)
    if (!scope) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    if (!isAllowedStyleRefMime(file.type)) {
      return NextResponse.json({ error: API_ERROR.INVALID_TILE_FILE_TYPE }, { status: 400 })
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: API_ERROR.BLOB_TOKEN_NOT_CONFIGURED }, { status: 500 })
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      const pngBuffer = await sharp(buffer).png().toBuffer()
      const filename = `${STYLE_REF_BLOB_PREFIX}/${scope.projectId}/${Date.now()}.png`
      const blob = await put(filename, pngBuffer, {
        access: BlobAccess.Public,
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: ContentType.Png,
      })
      return NextResponse.json({ success: true, url: blob.url })
    } catch (error) {
      console.error(API_LOG_PREFIX.STYLE_REFS_UPLOAD_FAILED, error)
      return NextResponse.json({ error: API_ERROR.STYLE_REF_UPLOAD_FAILED }, { status: 500 })
    }
  }),
  { maxRequests: 30, windowMs: 60000 }
)
