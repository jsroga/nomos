import { NextResponse } from 'next/server'
import { requireAuth } from '@/shared/auth/auth'
import { episodeScope, type EpisodeScope } from '@/domains/storyteller/server'
import { ProjectForbidden } from '@/shared/auth/project-scope'
import { HttpStatus } from '@/shared/data/constants/protocol'
import { triggerOwnedRun } from '@/shared/jobs'
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

    // Ownership is checked before the key is resolved and before anything is
    // queued: this endpoint spends money, so the check gates the spend.
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json(
        { error: API_ERROR.UNAUTHORIZED },
        { status: HttpStatus.UNAUTHORIZED }
      )
    }
    let scope: EpisodeScope
    try {
      scope = await episodeScope(episodeId, session.user.id)
    } catch (error) {
      if (!(error instanceof ProjectForbidden)) throw error
      return NextResponse.json(
        { error: API_ERROR.EPISODE_PROJECT_NOT_FOUND },
        { status: HttpStatus.NOT_FOUND }
      )
    }

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

    // The scope already resolved the owning project, so the JOIN that used to
    // repeat that lookup is gone.
    const { projectId } = scope
    const { context } = await loadVisualOverviewContext(scope)
    if (!isVisualOverviewReady(context)) {
      return NextResponse.json({ error: API_ERROR.OVERVIEW_REQUIRED }, { status: 400 })
    }

    console.log(`${API_LOG_PREFIX.POSTER_TRIGGER} ${episodeId}`)

    const handle = await triggerOwnedRun<typeof generatePoster>(TRIGGER_TASK_ID.GENERATE_POSTER, {
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
