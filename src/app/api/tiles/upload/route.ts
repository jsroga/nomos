import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import sharp from 'sharp'
import {
  withAuth,
  withRateLimit,
  type AuthenticatedRequest } from '@/shared/data/api-utils'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { formFile, formInt, formString } from '@/shared/data/form-data-guards'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import {
  BlobAccess,
  ContentType,
  FormField,
  SharpFit,
  SharpPosition,
} from '@/shared/data/constants/protocol'
import { DB_TABLE, DB_UPSERT } from '@/shared/data/constants/db-tables'

const TILE_SIZE = 1024

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const formData = await request.formData()
    const file = formFile(formData, FormField.File)
    const projectId = formString(formData, FormField.ProjectId)
    const x = formInt(formData, 'x')
    const y = formInt(formData, 'y')

    if (!file || !projectId || x === null || y === null) {
      return NextResponse.json({ error: API_ERROR.MISSING_TILE_UPLOAD_FIELDS }, { status: 400 })
    }

    const scope = await tryProjectScope(projectId, session.user.id)
    if (!scope) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: API_ERROR.INVALID_TILE_FILE_TYPE }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const resizedBuffer = await sharp(buffer)
      .resize(TILE_SIZE, TILE_SIZE, { fit: SharpFit.Cover, position: SharpPosition.Center })
      .png()
      .toBuffer()

    const filename = `${DB_TABLE.TILES}/${scope.projectId}/${x}_${y}_${Date.now()}.png`

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: API_ERROR.BLOB_TOKEN_NOT_CONFIGURED }, { status: 500 })
    }

    const blob = await put(filename, resizedBuffer, {
      access: BlobAccess.Public,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: ContentType.Png,
    })

    const { data: tile, error } = await supabase
      .from(DB_TABLE.TILES)
      .upsert(
        {
          project_id: scope.projectId,
          x,
          y,
          tile_prompt: `Uploaded tile at (${x}, ${y})`,
          image_filename: blob.url,
        },
        { onConflict: DB_UPSERT.TILES_PROJECT_XY }
      )
      .select()
      .single()

    if (error) {
      console.error(API_LOG_PREFIX.UPLOAD_TILE_DB_ERROR, error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, url: blob.url, tile })
  }),
  { maxRequests: 30, windowMs: 60000 }
)
