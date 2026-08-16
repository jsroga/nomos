import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { episodes, projects } from '@/db'
import { eq } from 'drizzle-orm'
import { generateCombinedStoryboard } from '@/domains/storyteller/tasks/generate-combined-storyboard.task'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { resolveApiframeApiKey, resolveStoryboardModel } from '@/shared/ai/image-model-env'

export async function POST(req: Request, props: { params: Promise<{ episodeId: string }> }) {
  const params = await props.params
  try {
    const { episodeId } = params
    const body = await req.json()
    const { beats, config } = body
    const clientKey = typeof config?.apiKey === 'string' ? config.apiKey : undefined
    const apiKey = resolveApiframeApiKey(clientKey)

    if (!beats || !Array.isArray(beats) || beats.length === 0 || !apiKey) {
      return NextResponse.json({ error: API_ERROR.MISSING_BEATS_OR_API_KEY }, { status: 400 })
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
      return NextResponse.json({ error: API_ERROR.EPISODE_PROJECT_NOT_FOUND }, { status: 404 })
    }

    const projectId = episodeData.projectId

    // 2. Trigger Background Task
    console.log(`${API_LOG_PREFIX.COMBINED_STORYBOARD_TRIGGER} ${episodeId}`)

    const handle = await generateCombinedStoryboard.trigger({
      episodeId,
      projectId,
      beats,
      providerConfig: {
        ...config,
        apiKey,
        modelId: config?.modelId || resolveStoryboardModel(),
      },
    })

    return NextResponse.json({
      success: true,
      handleId: handle.id,
    })
  } catch (error) {
    console.error(API_LOG_PREFIX.COMBINED_STORYBOARD_ERROR, error)
    return NextResponse.json({ error: API_ERROR.INTERNAL_ERROR }, { status: 500 })
  }
}
