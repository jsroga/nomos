import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { projects, storyPlans } from '@/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/shared/auth/auth'
import { recordFromJson } from '@/shared/data/deep-merge'

/** Copy only the listed keys whose values are truthy — used to let storyPlans overrides win over seriesBible fields without a wall of conditional spreads. */
function pickPresent<K extends string>(
  source: Record<string, unknown>,
  keys: readonly K[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of keys) {
    const value = source[key]
    if (value) out[key] = value
  }
  return out
}

/** storyPlans-table fields that override the flattened seriesBible when present. */
const STORY_PLAN_OVERRIDE_KEYS = [
  'genre',
  'tone',
  'centralTheme',
  'worldDescription',
  'worldRules',
  'factions',
  'inspirations',
  'keyCharacters',
  'sequences',
  'executiveSummary',
  'soundtracks',
  'plotTwists',
  'styleReference',
] as const

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

    const seriesBible = recordFromJson(projectData.seriesBible)
    const storyPlan = recordFromJson(storyPlanData?.content)

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
    const storyPlanOverrides = pickPresent(storyPlan, STORY_PLAN_OVERRIDE_KEYS)
    const bible = {
      // From seriesBible (projects table) - now flattened
      ...flattenedBible,
      // masterPrompt is a top-level column, not inside seriesBible
      ...(projectData.masterPrompt ? { masterPrompt: projectData.masterPrompt } : {}),
      // Story plan fields (storyPlans table) - override if present
      ...storyPlanOverrides,
      // Include nested storyPlan for components expecting it
      storyPlan,
      // User decisions if stored
      userDecisions: seriesBible.userDecisions || storyPlan.userDecisions || {},
    }

    console.log('[Bible API] Returning bible with keys:', Object.keys(bible))
    console.log(
      '[Bible API] worldDescription present?',
      !!(storyPlanOverrides.worldDescription || flattenedBible.worldDescription)
    )
    return NextResponse.json({ bible, seriesBible, storyPlan })
  } catch (error) {
    console.error('Error fetching bible:', error)
    return NextResponse.json({ error: 'Failed to fetch bible' }, { status: 500 })
  }
}
