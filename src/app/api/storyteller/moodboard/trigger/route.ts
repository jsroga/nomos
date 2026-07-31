import { NextRequest, NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import { db } from '@/db/client'
import { projects } from '@/db'
import { verifyProjectAccess } from '@/domains/storyteller/server'
import { eq } from 'drizzle-orm'
import OpenAI from 'openai'
import { requireAuth } from '@/shared/auth/auth'
import { resolveStyleReferenceUrls } from '@/shared/data/constants/style-presets'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import { API_ERROR, API_LOG_PREFIX, TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { openRouterClientConfig } from '@/shared/agent-kernel/models'
import { StorytellerMoodboardProvider } from '@/domains/storyteller/core/storyteller-page-wire'
import {
  buildMoodboardProjectContext,
  generateMoodboardPrompts,
} from '../_lib/moodboard-trigger-prompts'

function getOpenRouterClient() {
  const { apiKey, baseURL } = openRouterClientConfig()
  if (!apiKey) return null
  return new OpenAI({ apiKey, baseURL })
}

export async function POST(req: NextRequest) {
  try {
    const openai = getOpenRouterClient()
    if (!openai) {
      return NextResponse.json({ error: API_ERROR.OPENROUTER_API_KEY_NOT_CONFIGURED_SERVER }, { status: 500 })
    }

    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const { projectId, providerConfig, styleReference, promptIndex } = await req.json()

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

    const styleReferenceUrls = resolveStyleReferenceUrls(project)
    if (styleReference) {
      styleReferenceUrls.push(styleReference)
    }

    const bible = recordFromJson(project.seriesBible)
    const context = buildMoodboardProjectContext({
      projectName: project.name,
      projectDescription: project.description,
      bibleTitle: readString(bible.title),
      bibleGenre: readString(bible.genre),
      bibleTone: readString(bible.tone),
      bibleWorldDescription: readString(bible.worldDescription),
    })

    const prompts = await generateMoodboardPrompts(openai, context, promptIndex)

    const resolvedProviderConfig = {
      ...providerConfig,
      styleReferenceUrls,
    }
    if (
      resolvedProviderConfig.provider === StorytellerMoodboardProvider.Midjourney &&
      !resolvedProviderConfig.apiKey &&
      process.env.LEGNEXT_API_KEY
    ) {
      resolvedProviderConfig.apiKey = process.env.LEGNEXT_API_KEY
    }

    const handle = await tasks.trigger(TRIGGER_TASK_ID.GENERATE_MOODBOARD, {
      projectId,
      prompts,
      styleReference: undefined,
      replaceIndex: typeof promptIndex === 'number' ? promptIndex : undefined,
      providerConfig: resolvedProviderConfig,
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
