import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { characters } from '@/db'
import { verifyCharacterAccess, verifyProjectAccess } from '@/shared/auth'
import { eq } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { characterId, projectId, croppedImageDataUrl, variantIndex } = body

    if (!characterId || !projectId || !croppedImageDataUrl) {
      return NextResponse.json(
        { error: 'characterId, projectId, and croppedImageDataUrl are required' },
        { status: 400 }
      )
    }

    // Verify access
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Verify character access (if not a temp character)
    if (
      !characterId.startsWith('temp-') &&
      !(await verifyCharacterAccess(characterId, session.user.id))
    ) {
      return NextResponse.json({ error: 'Character not found or access denied' }, { status: 404 })
    }

    const matches = croppedImageDataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!matches) {
      return NextResponse.json({ error: 'Invalid image data URL format' }, { status: 400 })
    }

    const imageType = matches[1]
    const base64Data = matches[2]
    const buffer = Buffer.from(base64Data, 'base64')

    const filename = `portrait_${characterId}_v${variantIndex || 'cropped'}_${Date.now()}.${imageType}`
    const projectDir = path.join(process.cwd(), 'public', 'projects', projectId, 'portraits')

    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

    const filePath = path.join(projectDir, filename)
    fs.writeFileSync(filePath, buffer)

    const localPath = `/projects/${projectId}/portraits/${filename}`

    // Only update if not a temp character
    if (!characterId.startsWith('temp-')) {
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
    console.error('Error saving portrait variant:', error)
    return NextResponse.json(
      {
        error: 'Failed to save portrait variant',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
