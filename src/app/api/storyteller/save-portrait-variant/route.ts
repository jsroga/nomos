import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/client'
import { characters } from '@/db'
import { verifyCharacterAccess } from '@/domains/storyteller/server'
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
  StorytellerTempIdPrefix,
} from '@/domains/storyteller/core/storyteller-page-wire'

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const body = await req.json()
    const { characterId, projectId, croppedImageDataUrl, variantIndex } = body

    if (!characterId || !projectId || !croppedImageDataUrl) {
      return NextResponse.json({ error: API_ERROR.CHARACTER_FIELDS_REQUIRED }, { status: 400 })
    }

    // Verify access
    if (!(await tryProjectScope(projectId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    // Verify character access (if not a temp character)
    if (
      !characterId.startsWith(StorytellerTempIdPrefix.Temp) &&
      !(await verifyCharacterAccess(characterId, session.user.id))
    ) {
      return NextResponse.json({ error: API_ERROR.CHARACTER_ACCESS_DENIED }, { status: 404 })
    }

    const matches = croppedImageDataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!matches) {
      return NextResponse.json({ error: API_ERROR.INVALID_IMAGE_DATA_URL }, { status: 400 })
    }

    const imageType = matches[1]
    const base64Data = matches[2]
    const buffer = Buffer.from(base64Data, BufferEncoding.Base64)

    const filename = `portrait_${characterId}_v${variantIndex || StorytellerImageVariantLabel.Cropped}_${Date.now()}.${imageType}`
    const projectDir = path.join(
      process.cwd(),
      StorytellerStorageSegment.Public,
      StorytellerStorageSegment.Projects,
      projectId,
      StorytellerStorageSegment.Portraits
    )

    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

    const filePath = path.join(projectDir, filename)
    fs.writeFileSync(filePath, buffer)

    const localPath = `/${StorytellerStorageSegment.Projects}/${projectId}/${StorytellerStorageSegment.Portraits}/${filename}`

    // Only update if not a temp character
    if (!characterId.startsWith(StorytellerTempIdPrefix.Temp)) {
      await db
        .update(characters)
        .set({ portraitUrl: localPath })
        .where(eq(characters.id, characterId))
    }

    return NextResponse.json({
      success: true,
      portraitUrl: localPath,
      variantIndex,
    })
  } catch (error) {
    console.error(API_LOG_PREFIX.PORTRAIT_VARIANT_ERROR, error)
    return NextResponse.json(
      {
        error: API_ERROR.FAILED_SAVE_PORTRAIT_VARIANT,
        details: error instanceof Error ? error.message : API_ERROR.UNKNOWN_ERROR,
      },
      { status: 500 }
    )
  }
}
