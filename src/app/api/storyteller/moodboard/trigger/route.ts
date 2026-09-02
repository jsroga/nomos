import { NextRequest, NextResponse } from 'next/server'
import { requireSubmissionNonce, triggerOwnedRun } from '@/shared/jobs'
import { db } from '@/db/client'
import { projects } from '@/db'
import { ProjectForbidden, projectScope, type ProjectScope } from '@/shared/auth/project-scope'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/shared/auth/auth'
import { recordFromJson } from '@/shared/data/json-guards'
import { API_ERROR, API_LOG_PREFIX, TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { moodboardReplaceStyleRef } from '@/domains/storyteller/tasks/build-moodboard-locked-prompts'
import { resolveMoodboardProviderConfig } from '../_lib/moodboard-provider-config'
import {
  isVisualOverviewReady,
  loadVisualOverviewContext,
} from '@/domains/storyteller/services/visual-overview-context'
import type { generateMoodboard } from '@/domains/storyteller/tasks/generate-moodboard.task'

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const body = await req.json()
    const { projectId, providerConfig, promptIndex } = body

    if (!projectId) {
      return NextResponse.json({ error: API_ERROR.MISSING_PROJECT_ID_PARAM }, { status: 400 })
    }

    const requestId = requireSubmissionNonce(body)
    if (requestId instanceof NextResponse) return requestId

    let scope: ProjectScope
    try {
      scope = await projectScope(projectId, session.user.id)
    } catch (error) {
      if (!(error instanceof ProjectForbidden)) throw error
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    })

    if (!project) {
      return NextResponse.json({ error: API_ERROR.PROJECT_NOT_FOUND }, { status: 404 })
    }

    const { context, pack } = await loadVisualOverviewContext(scope)
    if (!isVisualOverviewReady(context)) {
      return NextResponse.json({ error: API_ERROR.OVERVIEW_REQUIRED }, { status: 400 })
    }

    const resolvedProviderConfig = resolveMoodboardProviderConfig(providerConfig)
    const apiKey = resolvedProviderConfig.apiKey
    if (!apiKey) {
      return NextResponse.json(
        { error: API_ERROR.APIFRAME_API_KEY_NOT_PROVIDED },
        { status: 500 },
      )
    }

    const bible = recordFromJson(project.seriesBible)
    const { replaceIndex, styleReferenceUrl } = moodboardReplaceStyleRef(
      bible,
      pack?.storyPlan,
      promptIndex,
    )
    const handle = await triggerOwnedRun<typeof generateMoodboard>(TRIGGER_TASK_ID.GENERATE_MOODBOARD, {
      projectId,
      requestId,
      promptIndex: typeof promptIndex === 'number' ? promptIndex : undefined,
      worldDesc: context.worldDesc,
      overview: context.overview,
      replaceIndex,
      styleReferenceUrl,
      providerConfig: {
        provider: resolvedProviderConfig.provider,
        modelId: resolvedProviderConfig.modelId,
        apiKey,
      },
    })

    return NextResponse.json({
      success: true,
      handleId: handle.id,
    })
  } catch (error) {
    console.error(API_LOG_PREFIX.MOODBOARD_TRIGGER_FAILED, error)
    return NextResponse.json({ error: API_ERROR.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}
