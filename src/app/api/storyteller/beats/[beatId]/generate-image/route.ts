import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { beats, episodes, projects } from '@/db'
import { eq } from 'drizzle-orm'
import { generateStoryboard } from '@/domains/storyteller/tasks/generate-storyboard.task'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { resolveApiframeApiKey, resolveStoryboardModel } from '@/shared/ai/image-model-env'

export async function POST(req: Request, props: { params: Promise<{ beatId: string }> }) {
  const params = await props.params
  try {
    const { beatId } = params
    const body = await req.json()
    const { prompt, config } = body
    const clientKey = typeof config?.apiKey === 'string' ? config.apiKey : undefined
    const apiKey = resolveApiframeApiKey(clientKey)

    if (!prompt || !apiKey) {
      return NextResponse.json({ error: API_ERROR.MISSING_PROMPT_OR_API_KEY }, { status: 400 })
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
      return NextResponse.json({ error: API_ERROR.BEAT_PROJECT_NOT_FOUND }, { status: 404 })
    }

    const projectId = beatData.projectId

    // 2. Trigger Background Task
    console.log(`${API_LOG_PREFIX.BEAT_IMAGE_TRIGGER} ${beatId}`)

    const handle = await generateStoryboard.trigger({
      beatId,
      projectId,
      prompt,
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
    console.error(API_LOG_PREFIX.BEAT_IMAGE_ERROR, error)
    return NextResponse.json({ error: API_ERROR.INTERNAL_ERROR }, { status: 500 })
  }
}
