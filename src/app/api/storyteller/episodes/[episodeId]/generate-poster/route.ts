import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { episodes, projects } from '@/domains/storyteller/db/schema'
import { eq } from 'drizzle-orm'
import { tasks } from '@trigger.dev/sdk/v3'
import type { generatePoster } from '@/trigger/generate-poster'
import { resolveStyleReferenceUrls } from '@/config/style-presets'

export async function POST(req: Request, props: { params: Promise<{ episodeId: string }> }) {
  const params = await props.params
  try {
    const { episodeId } = params
    const body = await req.json()
    const { prompt, config } = body
    // Use LegNext (The Next Leg) API Key
    const apiKey = config?.apiKey || process.env.LEGNEXT_API_KEY
    console.log(
      `[API] Poster Gen - Config Key present: ${!!config?.apiKey}, Env Key present: ${!!process.env.LEGNEXT_API_KEY}`
    )

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // 1. Get Project ID and Style References
    const episodeData = await db
      .select({
        projectId: projects.id,
        styleReferenceUrls: projects.styleReferenceUrls,
        stylePreset: projects.stylePreset,
      })
      .from(episodes)
      .innerJoin(projects, eq(episodes.projectId, projects.id))
      .where(eq(episodes.id, episodeId))
      .execute()
      .then(rows => rows[0])

    if (!episodeData) {
      return NextResponse.json({ error: 'Episode/Project not found' }, { status: 404 })
    }

    const { projectId } = episodeData
    const styleReferenceUrls = resolveStyleReferenceUrls(episodeData)

    // 2. Trigger Background Task
    console.log(`[API] Triggering poster generation for episode ${episodeId}`)

    const handle = await tasks.trigger<typeof generatePoster>('generate-poster', {
      prompt,
      projectId,
      episodeId,
      apiKey,
      styleReferenceUrls: (styleReferenceUrls as string[]) || [],
    })

    return NextResponse.json({
      success: true,
      handleId: handle.id,
    })
  } catch (error) {
    console.error('Error triggering poster generation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
