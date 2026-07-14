import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { projects, storyPlans } from '@/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/shared/auth/auth'
import { recordFromJson } from '@/shared/data/deep-merge'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { BibleCategoryKey, QueryParam, StoryPlanFieldKey } from '@/shared/data/constants/protocol'

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

const STORY_PLAN_OVERRIDE_KEYS = [
  StoryPlanFieldKey.Genre,
  StoryPlanFieldKey.Tone,
  StoryPlanFieldKey.CentralTheme,
  StoryPlanFieldKey.WorldDescription,
  StoryPlanFieldKey.WorldRules,
  StoryPlanFieldKey.Factions,
  StoryPlanFieldKey.Inspirations,
  StoryPlanFieldKey.KeyCharacters,
  StoryPlanFieldKey.Sequences,
  StoryPlanFieldKey.ExecutiveSummary,
  StoryPlanFieldKey.Soundtracks,
  StoryPlanFieldKey.PlotTwists,
  StoryPlanFieldKey.StyleReference,
] as const

const KNOWN_BIBLE_CATEGORIES: readonly BibleCategoryKey[] = [
  BibleCategoryKey.General,
  BibleCategoryKey.Setting,
  BibleCategoryKey.History,
  BibleCategoryKey.Magic,
  BibleCategoryKey.Factions,
  BibleCategoryKey.Technology,
  BibleCategoryKey.Culture,
]

function isBibleCategoryKey(value: string): value is BibleCategoryKey {
  return KNOWN_BIBLE_CATEGORIES.some(category => category === value)
}

export async function GET(req: Request) {
  try {
    const { session, error } = await requireAuth()
    if (error || !session) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get(QueryParam.ProjectId)

    if (!projectId) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ID_QUERY_REQUIRED }, { status: 400 })
    }

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
      return NextResponse.json({ error: API_ERROR.PROJECT_NOT_FOUND }, { status: 404 })
    }

    if (projectData.userId !== session.user.id) {
      return NextResponse.json({ error: API_ERROR.FORBIDDEN }, { status: 403 })
    }

    const seriesBible = recordFromJson(projectData.seriesBible)
    const storyPlan = recordFromJson(storyPlanData?.content)

    const flattenedBible: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(seriesBible)) {
      if (isBibleCategoryKey(key) && typeof value === 'object' && value !== null) {
        Object.assign(flattenedBible, value)
      } else {
        flattenedBible[key] = value
      }
    }

    const storyPlanOverrides = pickPresent(storyPlan, STORY_PLAN_OVERRIDE_KEYS)
    const bible = {
      ...flattenedBible,
      ...(projectData.masterPrompt ? { masterPrompt: projectData.masterPrompt } : {}),
      ...storyPlanOverrides,
      storyPlan,
      userDecisions: seriesBible.userDecisions || storyPlan.userDecisions || {},
    }

    console.log(API_LOG_PREFIX.BIBLE_RETURNING_KEYS, Object.keys(bible))
    console.log(
      API_LOG_PREFIX.BIBLE_WORLD_DESCRIPTION_PRESENT,
      !!(storyPlanOverrides.worldDescription || flattenedBible.worldDescription)
    )
    return NextResponse.json({ bible, seriesBible, storyPlan })
  } catch (error) {
    console.error(API_LOG_PREFIX.ERROR_FETCHING_BIBLE, error)
    return NextResponse.json({ error: API_ERROR.FAILED_FETCH_BIBLE }, { status: 500 })
  }
}
