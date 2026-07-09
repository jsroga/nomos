import { NextRequest, NextResponse } from 'next/server'
import { characters, projects } from '@/db'
import { db } from '@/db/client'
import {
  bibleToPrompt,
  bibleToVisualPrompt,
  ragService,
  type SeriesBible,
} from '@/domains/storyteller/server'
import { verifyProjectAccess } from '@/domains/storyteller/server'
import { eq } from 'drizzle-orm'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import { requireAuth } from '@/shared/auth/auth'
import {
  firstNonEmptyRecord,
  namedRecordsFromJson,
  readString,
  recordArrayFromJson,
  recordFromJson,
} from '@/shared/data/json-guards'

export async function GET(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Verify project access
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      with: {
        seriesBibleTable: true,
        storyPlanTable: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Priority 1: Use dedicated series_bibles / story_plans table content
    // Priority 2: Use project.series_bible / project.story_plan column (legacy/fallback)
    const rawBible = firstNonEmptyRecord(project.seriesBibleTable?.content, project.seriesBible)
    const rawStoryPlan = firstNonEmptyRecord(project.storyPlanTable?.content, project.storyPlan)
    const bible: SeriesBible = { ...rawBible }

    const storyPlanWorldRules = recordArrayFromJson(rawStoryPlan.worldRules)
    const storyPlanFactions = namedRecordsFromJson(rawStoryPlan.factions)
    if (storyPlanWorldRules.length > 0) bible.worldRules = storyPlanWorldRules
    if (storyPlanFactions.length > 0) bible.factions = storyPlanFactions
    if (!bible.setting && rawStoryPlan.setting) bible.setting = rawStoryPlan.setting
    if (!bible.worldDescription && rawStoryPlan.worldDescription) {
      bible.worldDescription = readString(rawStoryPlan.worldDescription)
    }

    const updatedFields = recordFromJson(rawBible.updatedFields)
    const updatedWorldRules = recordArrayFromJson(updatedFields.worldRules)
    const updatedFactions = namedRecordsFromJson(updatedFields.factions)
    if (updatedWorldRules.length > 0) bible.worldRules = updatedWorldRules
    if (updatedFactions.length > 0) bible.factions = updatedFactions

    console.log('[WorldSummary] Project fetched:', {
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
      console.warn('Series Bible not created, returning empty summary')
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
        'world_rule',
        'important world logic and atmosphere',
        3
      )

      if (ragResults.length > 0) {
        summary += '\n\n=== ADDITIONAL CONTEXT (RAG) ===\n'
        ragResults.forEach(r => {
          summary += `- ${r.content}\n`
        })
      }
    } catch (e) {
      console.warn('Failed to fetch RAG context:', e)
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
      bible.tone?.join(', '),
    ]
      .filter(Boolean)
      .join('. ')

    let worldGenPrompt = fallbackPrompt

    if (contextSnippet.trim()) {
      try {
        const googleKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
        const model = googleKey
          ? createGoogleGenerativeAI({ apiKey: googleKey })('gemini-2.0-flash')
          : createOpenAI({ apiKey: process.env.OPENAI_API_KEY })('gpt-4o-mini')

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
        console.warn('[WorldSummary] AI prompt generation failed, using fallback:', e)
      }
    }

    return NextResponse.json({
      summarize: summary,
      worldGenPrompt,
    })
  } catch (error) {
    console.error('Error serving world summary:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
