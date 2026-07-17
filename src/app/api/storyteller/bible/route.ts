import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { projects, storyPlans } from '@/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { QueryParam } from '@/shared/data/constants/protocol'
import { buildBibleResponse, parseBibleSources } from './bible-get-helpers'

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

    const sources = parseBibleSources(projectData, storyPlanData)
    const response = buildBibleResponse(sources)

    console.log(API_LOG_PREFIX.BIBLE_RETURNING_KEYS, Object.keys(response.bible))
    console.log(
      API_LOG_PREFIX.BIBLE_WORLD_DESCRIPTION_PRESENT,
      !!(response.storyPlanOverrides.worldDescription || response.flattenedBible.worldDescription)
    )
    return NextResponse.json({
      bible: response.bible,
      seriesBible: response.seriesBible,
      storyPlan: response.storyPlan,
    })
  } catch (error) {
    console.error(API_LOG_PREFIX.ERROR_FETCHING_BIBLE, error)
    return NextResponse.json({ error: API_ERROR.FAILED_FETCH_BIBLE }, { status: 500 })
  }
}
