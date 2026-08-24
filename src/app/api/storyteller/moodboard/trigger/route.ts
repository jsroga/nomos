import { NextRequest, NextResponse } from 'next/server'
import { triggerOwnedRun } from '@/shared/jobs'
import { db } from '@/db/client'
import { projects } from '@/db'
import { verifyProjectAccess } from '@/domains/storyteller/server'
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

    const { projectId, providerConfig, promptIndex } = await req.json()

    if (!projectId) {
      return NextResponse.json({ error: API_ERROR.MISSING_PROJECT_ID_PARAM }, { status: 400 })
    }

    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    })

    if (!project) {
      return NextResponse.json({ error: API_ERROR.PROJECT_NOT_FOUND }, { status: 404 })
    }

    const { context, pack } = await loadVisualOverviewContext(projectId)
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
