import { NextRequest, NextResponse } from 'next/server'
import { ProjectForbidden, projectScope, type ProjectScope } from '@/shared/auth/project-scope'
import { requireSubmissionNonce, triggerOwnedRun } from '@/shared/jobs'
import type { generatePortrait } from '@/domains/storyteller/tasks/generate-portrait.task'
import { withAuth, withRateLimit, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { API_ERROR, TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { TriggerRunStatus } from '@/shared/data/constants/protocol'
import { resolveApiframeApiKey } from '@/shared/ai/image-model-env'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import { buildCharacterPortraitPrompt } from '@/domains/storyteller/tasks/constants/character-portrait-prompt'
import { isPortraitCharacterUuid } from '@/domains/storyteller/tasks/constants/generate-portrait-wire'
import {
  isVisualSubjectConfigured,
  generateOverviewVisualSubject,
} from '@/domains/storyteller/services/visual-subject-llm'
import { VisualSubjectKind } from '@/domains/storyteller/services/constants/visual-overview'

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session }: AuthenticatedRequest) => {
    const body = recordFromJson(await request.json())
    const description = readString(body.description)?.trim() ?? ''
    const projectId = readString(body.projectId)
    const characterId = readString(body.characterId)
    const clientApiKey = readString(body.apiKey)

    if (!description) {
      return NextResponse.json({ error: API_ERROR.DESCRIPTION_REQUIRED }, { status: 400 })
    }

    const requestId = requireSubmissionNonce(body)
    if (requestId instanceof NextResponse) return requestId

    if (!projectId) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ID_REQUIRED_LOWER }, { status: 400 })
    }

    let scope: ProjectScope
    try {
      scope = await projectScope(projectId, session.user.id)
    } catch (error) {
      if (!(error instanceof ProjectForbidden)) throw error
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    if (!isVisualSubjectConfigured()) {
      return NextResponse.json({ error: API_ERROR.OPENROUTER_API_KEY_NOT_CONFIGURED_SERVER }, { status: 500 })
    }

    const scene = await generateOverviewVisualSubject(
      scope,
      description,
      VisualSubjectKind.Portrait,
    )
    if (scene === null) {
      return NextResponse.json({ error: API_ERROR.OVERVIEW_REQUIRED }, { status: 400 })
    }

    const prompt = buildCharacterPortraitPrompt(scene)
    if (!prompt) {
      return NextResponse.json({ error: API_ERROR.DESCRIPTION_REQUIRED }, { status: 400 })
    }

    const apiKey = resolveApiframeApiKey(clientApiKey)
    if (!apiKey) {
      return NextResponse.json(
        {
          error: API_ERROR.APIFRAME_API_KEY_NOT_PROVIDED,
          message: API_ERROR.APIFRAME_API_KEY_CONFIGURE,
        },
        { status: 500 }
      )
    }

    const persistedCharacterId = isPortraitCharacterUuid(characterId) ? characterId : undefined

    const handle = await triggerOwnedRun<typeof generatePortrait>(TRIGGER_TASK_ID.GENERATE_PORTRAIT, {
      prompt,
      projectId,
      requestId,
      apiKey,
      ...(persistedCharacterId ? { characterId: persistedCharacterId } : {}),
    })

    return NextResponse.json({
      success: true,
      handleId: handle.id,
      ...(persistedCharacterId ? { characterId: persistedCharacterId } : {}),
      status: TriggerRunStatus.Queued,
    })
  }),
  { maxRequests: 10, windowMs: 60000 }
)
