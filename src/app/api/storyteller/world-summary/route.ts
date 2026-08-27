import { NextRequest, NextResponse } from 'next/server'
import { projects } from '@/db'
import { db } from '@/db/client'
import { ProjectForbidden, projectScope, type ProjectScope } from '@/shared/auth/project-scope'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { QueryParam } from '@/shared/data/constants/protocol'
import { buildMergedBibleFromProject } from './_lib/build-merged-bible'
import { fetchProjectCast } from './_lib/fetch-project-cast'
import { generateWorldGenPrompt } from './_lib/generate-world-gen-prompt'
import { buildWorldSummaryContent } from './_lib/world-summary-content'

export async function GET(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get(QueryParam.ProjectId)
    if (!projectId) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ID_REQUIRED }, { status: 400 })
    }

    let scope: ProjectScope
    try {
      scope = await projectScope(projectId, session.user.id)
    } catch (error) {
      if (!(error instanceof ProjectForbidden)) throw error
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

    const bible = buildMergedBibleFromProject(project)
    const cast = await fetchProjectCast(projectId)
    const { summary, fallbackPrompt } = await buildWorldSummaryContent(scope, bible, cast)
    const worldGenPrompt = await generateWorldGenPrompt(bible, fallbackPrompt)

    return NextResponse.json({
      summarize: summary,
      worldGenPrompt,
    })
  } catch (error) {
    console.error(API_LOG_PREFIX.WORLD_SUMMARY_ERROR, error)
    return NextResponse.json({ error: API_ERROR.INTERNAL_SERVER_ERROR }, { status: 500 })
  }
}
