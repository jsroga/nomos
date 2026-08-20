import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { episodes, projects } from '@/db'
import { eq } from 'drizzle-orm'
import { tasks } from '@trigger.dev/sdk/v3'
import type { generatePoster } from '@/domains/storyteller/tasks/generate-poster.task'
import { API_ERROR, API_LOG_PREFIX, TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { resolveApiframeApiKey } from '@/shared/ai/image-model-env'
import { readString } from '@/shared/data/json-guards'
import {
  isVisualOverviewReady,
  loadVisualOverviewContext,
} from '@/domains/storyteller/services/visual-overview-context'

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

    if (!apiKey) {
      return NextResponse.json(
        {
          error: API_ERROR.APIFRAME_API_KEY_NOT_PROVIDED,
          message: API_ERROR.APIFRAME_API_KEY_CONFIGURE,
        },
        { status: 500 },
      )
    }

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

    const { projectId } = episodeData
    const { context } = await loadVisualOverviewContext(projectId)
    if (!isVisualOverviewReady(context)) {
      return NextResponse.json({ error: API_ERROR.OVERVIEW_REQUIRED }, { status: 400 })
    }

    console.log(`${API_LOG_PREFIX.POSTER_TRIGGER} ${episodeId}`)

    const handle = await tasks.trigger<typeof generatePoster>(TRIGGER_TASK_ID.GENERATE_POSTER, {
      extraPrompt: readString(prompt) ?? '',
      worldDesc: context.worldDesc,
      overview: context.overview,
      projectId,
      episodeId,
      apiKey,
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
