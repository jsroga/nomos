import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/client'
import { episodes } from '@/db'
import { verifyEpisodeAccess } from '@/domains/storyteller/server'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { eq } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { BufferEncoding } from '@/shared/data/constants/protocol'
import {
  StorytellerImageVariantLabel,
  StorytellerStorageSegment,
} from '@/domains/storyteller/core/storyteller-page-wire'

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const body = await req.json()
    const { episodeId, projectId, croppedImageDataUrl, variantIndex } = body

    if (!episodeId || !projectId || !croppedImageDataUrl) {
      return NextResponse.json({ error: API_ERROR.EPISODE_POSTER_FIELDS_REQUIRED }, { status: 400 })
    }

    // Verify access
    if (!(await tryProjectScope(projectId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }
    if (!(await verifyEpisodeAccess(episodeId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.EPISODE_ACCESS_DENIED }, { status: 404 })
    }

    const matches = croppedImageDataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!matches) {
      return NextResponse.json({ error: API_ERROR.INVALID_IMAGE_DATA_URL }, { status: 400 })
    }

    const imageType = matches[1]
    const base64Data = matches[2]
    const buffer = Buffer.from(base64Data, BufferEncoding.Base64)

    const filename = `poster_${episodeId}_v${variantIndex || StorytellerImageVariantLabel.Cropped}_${Date.now()}.${imageType}`
    const projectDir = path.join(
      process.cwd(),
      StorytellerStorageSegment.Public,
      StorytellerStorageSegment.Projects,
      projectId,
      StorytellerStorageSegment.Episodes
    )

    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

    const filePath = path.join(projectDir, filename)
    fs.writeFileSync(filePath, buffer)

    const localPath = `/${StorytellerStorageSegment.Projects}/${projectId}/${StorytellerStorageSegment.Episodes}/${filename}`

    await db.update(episodes).set({ posterUrl: localPath }).where(eq(episodes.id, episodeId))

    return NextResponse.json({ success: true, posterUrl: localPath, variantIndex })
  } catch (error) {
    console.error(API_LOG_PREFIX.EPISODE_POSTER_VARIANT_ERROR, error)
    return NextResponse.json(
      {
        error: API_ERROR.FAILED_SAVE_EPISODE_POSTER_VARIANT,
        details: error instanceof Error ? error.message : API_ERROR.UNKNOWN_ERROR,
      },
      { status: 500 }
    )
  }
}
