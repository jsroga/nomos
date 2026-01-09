import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { episodes } from '@/domains/storyteller/db/schema'
import { eq } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { episodeId, projectId, croppedImageDataUrl, variantIndex } = body

        if (!episodeId || !projectId || !croppedImageDataUrl) {
            return NextResponse.json(
                { error: 'episodeId, projectId, and croppedImageDataUrl are required' },
                { status: 400 }
            )
        }

        // Convert data URL to buffer
        const matches = croppedImageDataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
        if (!matches) {
            return NextResponse.json({ error: 'Invalid image data URL format' }, { status: 400 })
        }

        const imageType = matches[1]
        const base64Data = matches[2]
        const buffer = Buffer.from(base64Data, 'base64')

        // Save the cropped poster
        const filename = `poster_${episodeId}_v${variantIndex || 'cropped'}_${Date.now()}.${imageType}`
        const projectDir = path.join(process.cwd(), 'public', 'projects', projectId, 'episodes')

        if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir, { recursive: true })
        }

        const filePath = path.join(projectDir, filename)
        fs.writeFileSync(filePath, buffer)

        // Update episode in database with the cropped poster URL
        const localPath = `/projects/${projectId}/episodes/${filename}`

        await db
            .update(episodes)
            .set({ posterUrl: localPath })
            .where(eq(episodes.id, episodeId))

        return NextResponse.json({
            success: true,
            posterUrl: localPath,
            variantIndex,
        })
    } catch (error) {
        console.error('Error saving episode poster variant:', error)
        return NextResponse.json(
            {
                error: 'Failed to save episode poster variant',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
