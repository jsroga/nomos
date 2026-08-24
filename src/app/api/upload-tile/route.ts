import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import {
  withAuth,
  withRateLimit,
  type AuthenticatedRequest } from '@/shared/data/api-utils'
import { verifyProjectAccess } from '@/shared/auth/project-access'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { DB_COLUMN, DB_TABLE, DB_UPSERT } from '@/shared/data/constants/db-tables'
import { BufferEncoding, FsDirectory } from '@/shared/data/constants/protocol'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session, supabase }: AuthenticatedRequest) => {
    const { projectId, x, y, imageBase64, prompt } = await request.json()

    if (!projectId || x === undefined || y === undefined || !imageBase64) {
      return NextResponse.json({ error: API_ERROR.UPLOAD_TILE_FIELDS_REQUIRED }, { status: 400 })
    }

    // Verify project access
    const hasAccess = await verifyProjectAccess(projectId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    // Generate filename
    const filename = `${x}_${y}_${Date.now()}.png`

    // Ensure project directory exists
    const projectDir = path.join(process.cwd(), FsDirectory.Public, FsDirectory.Projects, projectId)
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')

    // Save image to filesystem
    const buffer = Buffer.from(base64Data, BufferEncoding.Base64)
    const filePath = path.join(projectDir, filename)
    fs.writeFileSync(filePath, buffer)

    // Update database using authenticated client (RLS enforced)
    const { data, error } = await supabase
      .from(DB_TABLE.TILES)
      .upsert(
        {
          [DB_COLUMN.PROJECT_ID]: projectId,
          x,
          y,
          tile_prompt: prompt || `Uploaded tile at (${x}, ${y})`,
          image_filename: filename,
        },
        { onConflict: DB_UPSERT.TILES_PROJECT_XY }
      )
      .select()
      .single()

    if (error) {
      console.error(API_LOG_PREFIX.UPLOAD_TILE_DB_ERROR, error)
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
