import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/client'
import { episodes, projects } from '@/db'
import { verifyProjectAccess } from '@/domains/storyteller/server'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/shared/auth/auth'
import { isValidProjectId } from '@/shared/auth/security'
import { persistBibleOwnedPlanFields } from '@/domains/storyteller/core/io/persist-bible-owned-plan'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import {
  bibleOwnedBackfillFromEpisodes,
  cleanProjectResponse,
  patchStorytellerProject,
} from './project-route-helpers'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  try {
    if (!isValidProjectId(params.id)) {
      return NextResponse.json({ error: API_ERROR.PROJECT_NOT_FOUND }, { status: 400 })
    }

    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    if (!(await verifyProjectAccess(params.id, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, params.id),
      with: {
        seriesBibleTable: true,
        storyPlanTable: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: API_ERROR.PROJECT_NOT_FOUND }, { status: 404 })
    }

    const episodeRows = await db
      .select({ storyPlan: episodes.storyPlan })
      .from(episodes)
      .where(eq(episodes.projectId, params.id))
    const episodePlans = episodeRows.map(row => row.storyPlan)
    const backfill = bibleOwnedBackfillFromEpisodes(project, episodePlans)
    if (Object.keys(backfill).length > 0) {
      try {
        await persistBibleOwnedPlanFields(params.id, backfill)
      } catch (error) {
        console.error(API_LOG_PREFIX.PROJECT_FETCH_ERROR, error)
      }
    }
    const { seriesBible, storyPlan } = cleanProjectResponse(project, episodePlans)

    return NextResponse.json({
      ...project,
      seriesBible,
      storyPlan,
      seriesBibleTable: undefined,
      storyPlanTable: undefined,
    })
  } catch (error) {
    console.error(API_LOG_PREFIX.PROJECT_FETCH_ERROR, error)
    return NextResponse.json({ error: API_ERROR.FAILED_FETCH_PROJECT }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  try {
    if (!isValidProjectId(params.id)) {
      return NextResponse.json({ error: API_ERROR.PROJECT_NOT_FOUND }, { status: 400 })
    }

    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    if (!(await verifyProjectAccess(params.id, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    return patchStorytellerProject(params.id, req)
  } catch (error) {
    console.error(API_LOG_PREFIX.PROJECT_UPDATE_ERROR, error)
    return NextResponse.json({ error: API_ERROR.FAILED_UPDATE_PROJECT }, { status: 500 })
  }
}
