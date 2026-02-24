import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, characters } from '@/domains/storyteller/db/schema'
import { eq } from 'drizzle-orm'
import {
  bibleToPrompt,
  bibleToVisualPrompt,
  SeriesBible,
} from '@/domains/storyteller/context/series-bible'
import { ragService } from '@/domains/storyteller/services/rag-service'
import { requireAuth } from '@/lib/auth'
import { verifyProjectAccess } from '@/domains/storyteller/lib/access-verification'

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
    const rawBible = (project.seriesBibleTable?.content ||
      project.seriesBible ||
      {}) as SeriesBible

    // StoryPlan often contains the latest world rules, factions, etc.
    const rawStoryPlan = (project.storyPlanTable?.content ||
      project.storyPlan ||
      {}) as any

    // Merge logic matching the client-side hydration for consistency
    const bible = { ...rawBible } as SeriesBible

    // If storyPlan has updated fields, apply them
    if (rawStoryPlan) {
      // Arrays that should be merged or overridden from storyPlan if present
      if (rawStoryPlan.worldRules?.length > 0) bible.worldRules = rawStoryPlan.worldRules
      if (rawStoryPlan.factions?.length > 0) bible.factions = rawStoryPlan.factions
      // If bible doesn't have setting but storyPlan does (unlikely but possible)
      if (!bible.setting && rawStoryPlan.setting) bible.setting = rawStoryPlan.setting
      // If bible lacks description but storyPlan has it
      if (!bible.worldDescription && rawStoryPlan.worldDescription) bible.worldDescription = rawStoryPlan.worldDescription

      // Also check updatedFields pattern
      if (rawBible.updatedFields) {
        if (rawBible.updatedFields.worldRules?.length > 0) bible.worldRules = rawBible.updatedFields.worldRules
        if (rawBible.updatedFields.factions?.length > 0) bible.factions = rawBible.updatedFields.factions
      }
    }

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
    const worldGenPrompt = bibleToVisualPrompt(bible, formattedCast)

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

    return NextResponse.json({
      summarize: summary,
      worldGenPrompt: worldGenPrompt,
    })
  } catch (error) {
    console.error('Error serving world summary:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
