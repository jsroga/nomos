import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/client'
import { projects } from '@/db'
import { verifyProjectAccess } from '@/domains/storyteller/server'
import { eq } from 'drizzle-orm'
import { tasks } from '@trigger.dev/sdk/v3'
import type { generatePortrait } from '@/domains/storyteller/tasks/generate-portrait.task'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { resolveStyleReferenceUrls } from '@/shared/data/constants/style-presets'
import { API_ERROR, API_LOG_PREFIX, TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { TriggerRunStatus } from '@/shared/data/constants/protocol'
import { StorytellerTempIdPrefix } from '@/domains/storyteller/core/storyteller-page-wire'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session }: AuthenticatedRequest) => {
    const body = await request.json()
    const { prompt, projectId, characterId, apiKey: clientApiKey } = body

    if (!prompt) {
      return NextResponse.json({ error: API_ERROR.PROMPT_REQUIRED }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ID_REQUIRED_LOWER }, { status: 400 })
    }

    // Verify project access
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const effectiveCharacterId = characterId || `${StorytellerTempIdPrefix.Temp}${Date.now()}`

    const apiKey = clientApiKey || process.env.APIFRAME_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          error: API_ERROR.APIFRAME_API_KEY_NOT_PROVIDED,
          message: API_ERROR.APIFRAME_API_KEY_CONFIGURE,
        },
        { status: 401 }
      )
    }

    // Fetch project style references (preset or custom URLs)
    let styleReferenceUrls: string[] = []
    try {
      const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
      if (project && project.length > 0) {
        styleReferenceUrls = resolveStyleReferenceUrls(project[0])
      }
    } catch (error) {
      console.error(API_LOG_PREFIX.PORTRAIT_STYLE_REF_ERROR, error)
    }

    const handle = await tasks.trigger<typeof generatePortrait>(TRIGGER_TASK_ID.GENERATE_PORTRAIT, {
      prompt,
      projectId,
      characterId: effectiveCharacterId,
      apiKey,
      styleReferenceUrls,
    })

    return NextResponse.json({
      success: true,
      handleId: handle.id,
      characterId: effectiveCharacterId,
      status: TriggerRunStatus.Queued,
    })
  }),
  { maxRequests: 10, windowMs: 60000 }
)
