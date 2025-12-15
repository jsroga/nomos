
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { episodes, projects } from '@/domains/storyteller/db/schema'
import { eq } from 'drizzle-orm'
import { generateEpisodePoster } from '@/trigger/generate-episode-poster'

export async function POST(req: Request, props: { params: Promise<{ episodeId: string }> }) {
    const params = await props.params;
    try {
        const { episodeId } = params
        const { prompt, config } = await req.json()

        if (!prompt || !config || !config.apiKey) {
            return NextResponse.json({ error: 'Missing prompt or API key' }, { status: 400 })
        }

        // 1. Get Project ID
        const episodeData = await db
            .select({
                projectId: projects.id
            })
            .from(episodes)
            .innerJoin(projects, eq(episodes.projectId, projects.id))
            .where(eq(episodes.id, episodeId))
            .execute()
            .then(rows => rows[0])

        if (!episodeData) {
            return NextResponse.json({ error: 'Episode/Project not found' }, { status: 404 })
        }

        const projectId = episodeData.projectId

        // 2. Trigger Background Task
        console.log(`[API] Triggering poster generation for episode ${episodeId}`)

        const handle = await generateEpisodePoster.trigger({
            episodeId,
            projectId,
            prompt,
            providerConfig: config
        })

        return NextResponse.json({
            success: true,
            handleId: handle.id
        })

    } catch (error) {
        console.error('Error triggering poster generation:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
