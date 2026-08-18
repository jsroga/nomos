import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { episodes, projects } from '@/db'
import { eq } from 'drizzle-orm'
import { tasks } from '@trigger.dev/sdk/v3'
import type { generatePoster } from '@/domains/storyteller/tasks/generate-poster.task'
import { resolveStyleReferenceUrls } from '@/shared/data/constants/style-presets'
import { API_ERROR, API_LOG_PREFIX, TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { resolveApiframeApiKey, resolveEpisodePosterModel } from '@/shared/ai/image-model-env'

export async function POST(req: Request, props: { params: Promise<{ episodeId: string }> }) {
  const params = await props.params
  try {
    const { episodeId } = params
    const body = await req.json()
    const { prompt, config } = body
    const clientKey = typeof config?.apiKey === 'string' ? config.apiKey : undefined
    const apiKey = resolveApiframeApiKey(clientKey)
    console.log(
      `${API_LOG_PREFIX.POSTER_GEN_CONFIG} ${Boolean(clientKey)}, Env Key present: ${Boolean(process.env.APIFRAME_API_KEY)}`
    )

    if (!prompt) {
      return NextResponse.json({ error: API_ERROR.PROMPT_REQUIRED }, { status: 400 })
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          error: API_ERROR.APIFRAME_API_KEY_NOT_PROVIDED,
          message: API_ERROR.APIFRAME_API_KEY_CONFIGURE,
        },
        { status: 500 },
      )
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
      return NextResponse.json({ error: API_ERROR.EPISODE_PROJECT_NOT_FOUND }, { status: 404 })
    }

    const { projectId } = episodeData
    const styleReferenceUrls = resolveStyleReferenceUrls(episodeData)

    // 2. Trigger Background Task
    console.log(`${API_LOG_PREFIX.POSTER_TRIGGER} ${episodeId}`)

    const handle = await tasks.trigger<typeof generatePoster>(TRIGGER_TASK_ID.GENERATE_POSTER, {
      prompt,
      projectId,
      episodeId,
      apiKey,
      styleReferenceUrls: styleReferenceUrls ?? [],
      modelId: resolveEpisodePosterModel(),
    })

    return NextResponse.json({
      success: true,
      handleId: handle.id,
    })
  } catch (error) {
    console.error(API_LOG_PREFIX.POSTER_ERROR, error)
    return NextResponse.json({ error: API_ERROR.INTERNAL_ERROR }, { status: 500 })
  }
}
