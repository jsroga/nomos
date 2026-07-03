import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { episodes, projects } from '@/db'
import { eq } from 'drizzle-orm'
import { generateCombinedStoryboard } from '@/trigger/generate-combined-storyboard'

export async function POST(req: Request, props: { params: Promise<{ episodeId: string }> }) {
  const params = await props.params
  try {
    const { episodeId } = params
    const { beats, config } = await req.json()

    if (!beats || !Array.isArray(beats) || beats.length === 0 || !config || !config.apiKey) {
      return NextResponse.json({ error: 'Missing beats or API key' }, { status: 400 })
    }

    // 1. Get Project ID
    const episodeData = await db
      .select({
        projectId: projects.id,
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
    console.log(`[API] Triggering combined storyboard generation for episode ${episodeId}`)

    const handle = await generateCombinedStoryboard.trigger({
      episodeId,
      projectId,
      beats,
      providerConfig: config,
    })

    return NextResponse.json({
      success: true,
      handleId: handle.id,
    })
  } catch (error) {
    console.error('Error triggering combined storyboard generation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
