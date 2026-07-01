import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, storyPlans } from '@/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

/**
 * GET /api/storyteller/bible?projectId=xxx
 *
 * Fetches the series bible and story plan for a project.
 * Used by the frontend to refresh the Bible state after agent tool updates.
 */
export async function GET(req: Request) {
  try {
    const { session, error } = await requireAuth()
    if (error || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    // Fetch project with seriesBible and storyPlan in parallel
    const [projectData, storyPlanData] = await Promise.all([
      db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .then(r => r[0]),
      db
        .select()
        .from(storyPlans)
        .where(eq(storyPlans.projectId, projectId))
        .then(r => r[0]),
    ])

    if (!projectData) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check ownership
    if (projectData.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const seriesBible = (projectData.seriesBible as Record<string, unknown>) || {}
    const storyPlan = (storyPlanData?.content as Record<string, unknown>) || {}

    // The update_world_bible tool may save fields under category keys like 'Setting', 'History', etc.
    // We need to flatten these nested category objects to top-level fields
    const knownCategories = [
      'General',
      'Setting',
      'History',
      'Magic',
      'Factions',
      'Technology',
      'Culture',
    ]
    const flattenedBible: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(seriesBible)) {
      if (knownCategories.includes(key) && typeof value === 'object' && value !== null) {
        // Flatten nested category object - merge its fields to top level
        Object.assign(flattenedBible, value)
      } else {
        // Keep top-level fields as-is
        flattenedBible[key] = value
      }
    }

    // Merge bible and story plan into unified response
    // The frontend expects fields at top level
    const bible = {
      // From seriesBible (projects table) - now flattened
      ...flattenedBible,
      // masterPrompt is a top-level column, not inside seriesBible
      ...(projectData.masterPrompt && { masterPrompt: projectData.masterPrompt }),
      // Story plan fields (storyPlans table) - override if present
      ...(storyPlan.genre && { genre: storyPlan.genre }),
      ...(storyPlan.tone && { tone: storyPlan.tone }),
      ...(storyPlan.centralTheme && { centralTheme: storyPlan.centralTheme }),
      ...(storyPlan.worldDescription && { worldDescription: storyPlan.worldDescription }),
      ...(storyPlan.worldRules && { worldRules: storyPlan.worldRules }),
      ...(storyPlan.factions && { factions: storyPlan.factions }),
      ...(storyPlan.inspirations && { inspirations: storyPlan.inspirations }),
      ...(storyPlan.keyCharacters && { keyCharacters: storyPlan.keyCharacters }),
      ...(storyPlan.sequences && { sequences: storyPlan.sequences }),
      ...(storyPlan.executiveSummary && { executiveSummary: storyPlan.executiveSummary }),
      ...(storyPlan.soundtracks && { soundtracks: storyPlan.soundtracks }),
      ...(storyPlan.plotTwists && { plotTwists: storyPlan.plotTwists }),
      ...(storyPlan.styleReference && { styleReference: storyPlan.styleReference }),
      // Include nested storyPlan for components expecting it
      storyPlan,
      // User decisions if stored
      userDecisions: seriesBible.userDecisions || storyPlan.userDecisions || {},
    }

    console.log('[Bible API] Returning bible with keys:', Object.keys(bible))
    console.log('[Bible API] worldDescription present?', !!bible.worldDescription)
    return NextResponse.json({ bible, seriesBible, storyPlan })
  } catch (error) {
    console.error('Error fetching bible:', error)
    return NextResponse.json({ error: 'Failed to fetch bible' }, { status: 500 })
  }
}
