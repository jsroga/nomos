import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { beats, episodes, projects } from '@/db'
import { eq } from 'drizzle-orm'
import { generateStoryboard } from '@/trigger/generate-storyboard'

export async function POST(req: Request, props: { params: Promise<{ beatId: string }> }) {
  const params = await props.params
  try {
    const { beatId } = params
    const { prompt, config } = await req.json()

    if (!prompt || !config || !config.apiKey) {
      return NextResponse.json({ error: 'Missing prompt or API key' }, { status: 400 })
    }

    // 1. Get Project ID
    const beatData = await db
      .select({
        projectId: projects.id,
      })
      .from(beats)
      .innerJoin(episodes, eq(beats.episodeId, episodes.id))
      .innerJoin(projects, eq(episodes.projectId, projects.id))
      .where(eq(beats.id, beatId))
      .execute()
      .then(rows => rows[0])

    if (!beatData) {
      return NextResponse.json({ error: 'Beat/Project not found' }, { status: 404 })
    }

    const projectId = beatData.projectId

    // 2. Trigger Background Task
    console.log(`[API] Triggering storyboard generation for beat ${beatId}`)

    const handle = await generateStoryboard.trigger({
      beatId,
      projectId,
      prompt,
      providerConfig: config,
    })

    return NextResponse.json({
      success: true,
      handleId: handle.id,
    })
  } catch (error) {
    console.error('Error triggering beat image generation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
