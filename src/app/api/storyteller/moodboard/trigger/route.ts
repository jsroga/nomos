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
import { OpenAiChatRole, OpenAiModel } from '@/shared/data/constants/protocol'
import {
  StorytellerMoodboardDefault,
  StorytellerMoodboardPromptCategory,
  StorytellerMoodboardProvider,
} from '@/domains/storyteller/core/storyteller-page-wire'

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  return new OpenAI({ apiKey })
}

const MOODBOARD_PROMPT_TYPES = [
  StorytellerMoodboardPromptCategory.Environment,
  StorytellerMoodboardPromptCategory.DailyLife,
  StorytellerMoodboardPromptCategory.CharacterPortrait,
] as const

export async function POST(req: NextRequest) {
  try {
    const openai = getOpenAIClient()
    if (!openai) {
      return NextResponse.json({ error: API_ERROR.OPENAI_API_KEY_NOT_CONFIGURED }, { status: 500 })
    }

    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const { projectId, providerConfig, styleReference, promptIndex } = await req.json()

    if (!projectId) {
      return NextResponse.json({ error: API_ERROR.MISSING_PROJECT_ID_PARAM }, { status: 400 })
    }

    // Verify project access
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    // Fetch Project Bible Data and Settings
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    })

    if (!project) {
      return NextResponse.json({ error: API_ERROR.PROJECT_NOT_FOUND }, { status: 404 })
    }

    // Get style references from project settings (preset or custom URLs)
    const styleReferenceUrls = resolveStyleReferenceUrls(project)
    if (styleReference) {
      styleReferenceUrls.push(styleReference)
    }

    // Get bible data
    const bible = recordFromJson(project.seriesBible)
    const projectTitle =
      readString(bible.title) ?? project.name ?? StorytellerMoodboardDefault.UntitledProject
    const genre = readString(bible.genre) ?? StorytellerMoodboardDefault.UnknownGenre
    const tone = readString(bible.tone) ?? StorytellerMoodboardDefault.AtmosphericTone
    const worldDesc =
      readString(bible.worldDescription) ?? project.description ?? projectTitle

    let prompts: string[] = []

    try {
      let systemPrompt = `You are a creative director for a film or game project. Generate 3 distinct, highly visual image generation prompts for an AI art generator (like Midjourney or Imagen).
Project: ${projectTitle}
Genre: ${genre}
Tone: ${tone}
World Description: ${worldDesc}

The prompts should correspond to these categories:
1. Environment/Landscape
2. Daily Life/Scene
3. Character Portrait

Output ONLY the 3 prompts as a JSON array of strings. Do not include markdown formatting or numbering.`

      if (typeof promptIndex === 'number' && promptIndex >= 0 && promptIndex < 3) {
        systemPrompt = `You are a creative director. Generate ONE highly visual image generation prompt for:
Project: ${projectTitle}
Genre: ${genre}
Tone: ${tone}
World Description: ${worldDesc}

The prompt must be for the category: "${MOODBOARD_PROMPT_TYPES[promptIndex]}"

Output ONLY the single prompt string.`
      }

      const gptResponse = await openai.chat.completions.create({
        model: OpenAiModel.Gpt4o,
        messages: [{ role: OpenAiChatRole.System, content: systemPrompt }],
        temperature: 0.7,
      })

      const content = gptResponse.choices[0]?.message?.content?.trim() || ''

      if (typeof promptIndex === 'number' && promptIndex >= 0 && promptIndex < 3) {
        prompts = [content.replace(/^"|"$/g, '')]
      } else {
        try {
          const cleanContent = content
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim()
          prompts = JSON.parse(cleanContent)
        } catch (e) {
          console.warn(API_LOG_PREFIX.MOODBOARD_GPT_PARSE_FALLBACK, e)
          prompts = [
            `Movie concept art, ${projectTitle}, ${genre}, ${tone}. ${worldDesc}. Wide environment shot.`,
            `Movie concept art, ${projectTitle}, ${genre}, ${tone}. ${worldDesc}. Daily life scene.`,
            `Movie concept art, ${projectTitle}, ${genre}, ${tone}. ${worldDesc}. Character portrait.`,
          ]
        }
      }
    } catch (openaiError) {
      console.error(API_LOG_PREFIX.MOODBOARD_OPENAI_FAILED, openaiError)
      const baseContext = `Project: ${projectTitle}. Genre: ${genre}. Tone: ${tone}. World: ${worldDesc}.`
      const allPrompts = [
        `${baseContext} Wide establishing shot of the main environment. Grand scale.`,
        `${baseContext} Street level view of daily life in this world. Atmospheric.`,
        `${baseContext} Portrait of a typical inhabitant or faction member. Character study.`,
      ]

      if (typeof promptIndex === 'number' && promptIndex >= 0 && promptIndex < allPrompts.length) {
        prompts = [allPrompts[promptIndex]]
      } else {
        prompts = allPrompts
      }
    }

    // Use env LEGNEXT_API_KEY when client didn't send one (e.g. key configured only on server)
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
