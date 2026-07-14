import { NextRequest, NextResponse } from 'next/server'
import { characters, projects } from '@/db'
import { db } from '@/db/client'
import {
  bibleToPrompt,
  bibleToVisualPrompt,
  ragService,
} from '@/domains/storyteller/server'
import { verifyProjectAccess } from '@/domains/storyteller/server'
import { eq } from 'drizzle-orm'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import { requireAuth } from '@/shared/auth/auth'
import {
  firstNonEmptyRecord,
  readString,
  recordFromJson,
} from '@/shared/data/json-guards'
import {
  mergeNamedRecords,
  mergeWorldRules,
  seriesBibleFromRecord,
} from '@/domains/storyteller/services/context/series-bible-from-record'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { GoogleModel, OpenAiModel, QueryParam } from '@/shared/data/constants/protocol'
import {
  StorytellerRagEntityType,
  StorytellerRagQuery,
  StorytellerRagSummaryFormat,
  StorytellerTextSeparator,
} from '@/domains/storyteller/core/storyteller-page-wire'

export async function GET(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get(QueryParam.ProjectId)

    if (!projectId) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ID_REQUIRED }, { status: 400 })
    }

    // Verify project access
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
    }

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      with: {
        seriesBibleTable: true,
        storyPlanTable: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: API_ERROR.PROJECT_NOT_FOUND }, { status: 404 })
    }

    // Priority 1: Use dedicated series_bibles / story_plans table content
    // Priority 2: Use project.series_bible / project.story_plan column (legacy/fallback)
    const rawBible = firstNonEmptyRecord(project.seriesBibleTable?.content, project.seriesBible)
    const rawStoryPlan = firstNonEmptyRecord(project.storyPlanTable?.content, project.storyPlan)
    const bible = seriesBibleFromRecord({ ...rawBible, ...rawStoryPlan })

    const mergedWorldRules = mergeWorldRules(
      rawStoryPlan.worldRules,
      rawBible.worldRules,
      recordFromJson(rawBible.updatedFields).worldRules,
    )
    if (mergedWorldRules.length > 0) bible.worldRules = mergedWorldRules

    const mergedFactions = mergeNamedRecords(
      rawStoryPlan.factions,
      rawBible.factions,
      recordFromJson(rawBible.updatedFields).factions,
    )
    if (mergedFactions.length > 0) bible.factions = mergedFactions

    const storyPlanSetting = recordFromJson(rawStoryPlan.setting)
    if (
      !bible.setting.time &&
      !bible.setting.place &&
      !bible.setting.socialContext &&
      Object.keys(storyPlanSetting).length > 0
    ) {
      bible.setting = {
        time: readString(storyPlanSetting.time) ?? '',
        place: readString(storyPlanSetting.place) ?? '',
        socialContext: readString(storyPlanSetting.socialContext) ?? '',
      }
    }

    const storyPlanWorldDescription = readString(rawStoryPlan.worldDescription)
    if (!bible.worldDescription && storyPlanWorldDescription) {
      bible.worldDescription = storyPlanWorldDescription
    }

    console.log(API_LOG_PREFIX.WORLD_SUMMARY_PROJECT_FETCHED, {
      id: project.id,
      hasSeriesBibleTable: !!project.seriesBibleTable,
      hasStoryPlanTable: !!project.storyPlanTable,
      bibleContentKeys: Object.keys(bible),
      bibleTitle: bible.title,
      bibleSetting: bible.setting,
      bibleRules: bible.worldRules?.length,
      fromStoryPlan: !!rawStoryPlan
    })

    if (!bible || (!bible.title && !bible.logline && !bible.premise)) {
      console.warn(API_LOG_PREFIX.WORLD_SUMMARY_BIBLE_EMPTY)
      // Continue with empty bible effectively
    }

    // Fetch project-level cast so the summary includes character data
    const cast = await db
      .select({ name: characters.name, role: characters.role, description: characters.description })
      .from(characters)
      .where(eq(characters.projectId, projectId))

    const formattedCast = cast.map(c => ({
      ...c,
      description: c.description || undefined,
    }))

    let summary = bibleToPrompt(bible, formattedCast)
    const fallbackPrompt = bibleToVisualPrompt(bible, formattedCast)

    try {
      const ragResults = await ragService.retrieveByType(
        projectId,
        StorytellerRagEntityType.WorldRule,
        StorytellerRagQuery.WorldLogic,
        3
      )

      if (ragResults.length > 0) {
        summary += StorytellerRagSummaryFormat.ContextHeader
        ragResults.forEach(r => {
          summary += `${StorytellerRagSummaryFormat.BulletPrefix}${r.content}${StorytellerRagSummaryFormat.LineBreak}`
        })
      }
    } catch (e) {
      console.warn(API_LOG_PREFIX.WORLD_SUMMARY_RAG_FAILED, e)
    }

    // Build a compact context snippet for the style-prompt agent
    const contextSnippet = [
      bible.worldDescription,
      bible.setting?.place,
      bible.setting?.time,
      bible.setting?.socialContext,
      ...(bible.worldRules?.slice(0, 3).map(r =>
        typeof r === 'string' ? r : (r.description || r.name || '')
      ) ?? []),
      ...(bible.visualMotifs?.slice(0, 4) ?? []),
      ...(bible.colorPalette?.slice(0, 4) ?? []),
      bible.tone?.join(StorytellerTextSeparator.CommaSpace),
    ]
      .filter(Boolean)
      .join(StorytellerTextSeparator.PeriodSpace)

    let worldGenPrompt = fallbackPrompt

    if (contextSnippet.trim()) {
      try {
        const googleKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
        const model = googleKey
          ? createGoogleGenerativeAI({ apiKey: googleKey })(GoogleModel.Gemini20Flash)
          : createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(OpenAiModel.Gpt4oMini)

        const { text } = await generateText({
          model,
          system: `You are a visual art director writing style descriptions for isometric tilemap generation.
Your output is used as a Midjourney/Stable Diffusion style prompt suffix.

Rules:
- Write EXACTLY 1-2 sentences, no more.
- Focus on small physical details: surface textures, lighting quality, material wear, ambient atmosphere, colour temperature.
- Do NOT mention any game titles, franchise names, or IP names.
- Do NOT repeat the world's title or setting name.
- Do NOT use "isometric", "tilemap", "game", "2D", "tile" — those are added elsewhere.
- Output ONLY the style sentences, nothing else.`,
          prompt: `World context:
${contextSnippet}

Write 1-2 sentences describing the small visual details and atmosphere that should define this world's art style.`,
          maxOutputTokens: 120,
          temperature: 0.7,
        })

        const cleaned = text.trim().replace(/^["']|["']$/g, '')
        if (cleaned.length > 10) {
          worldGenPrompt = cleaned
        }
      } catch (e) {
        console.warn(API_LOG_PREFIX.WORLD_SUMMARY_AI_FALLBACK, e)
      }
    }

    return NextResponse.json({
      summarize: summary,
      worldGenPrompt,
    })
  } catch (error) {
    console.error(API_LOG_PREFIX.WORLD_SUMMARY_ERROR, error)
    return NextResponse.json({ error: API_ERROR.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}
