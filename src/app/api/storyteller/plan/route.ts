import { NextRequest, NextResponse } from 'next/server'
import { episodes, projects, storyPlans } from '@/db'
import { db } from '@/db/client'
import { verifyEpisodeAccess, verifyProjectAccess } from '@/domains/storyteller/server'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/shared/auth/auth'
import { episodeStoryPlanResponse } from '@/domains/storyteller/core/entities/story-plan-wire'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { QueryParam } from '@/shared/data/constants/protocol'
import { patchStoryPlanSequence } from './plan-patch-helpers'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const episodeId = searchParams.get(QueryParam.EpisodeId)
  const projectId = searchParams.get(QueryParam.ProjectId)

  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    if (episodeId) {
      if (!(await verifyEpisodeAccess(episodeId, session.user.id))) {
        return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
      }

      const [episode] = await db
        .select({
          storyPlan: episodes.storyPlan,
          planApproved: episodes.planApproved,
          currentPhase: episodes.currentPhase,
          posterUrl: episodes.posterUrl,
          posterPrompt: episodes.posterPrompt,
          scriptContent: episodes.scriptContent,
          title: episodes.title,
        })
        .from(episodes)
        .where(eq(episodes.id, episodeId))
        .limit(1)

      if (!episode) {
        return NextResponse.json({ error: API_ERROR.EPISODE_NOT_FOUND }, { status: 404 })
      }

      return NextResponse.json(
        episodeStoryPlanResponse({
          storyPlan: episode.storyPlan,
          planApproved: episode.planApproved,
          currentPhase: episode.currentPhase,
          scriptContent: episode.scriptContent,
          title: episode.title,
          posterUrl: episode.posterUrl,
          posterPrompt: episode.posterPrompt,
          projectId,
        })
      )
    } else if (projectId) {
      if (!(await verifyProjectAccess(projectId, session.user.id))) {
        return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
      }

      const [plan] = await db
        .select()
        .from(storyPlans)
        .where(eq(storyPlans.projectId, projectId))
        .limit(1)

      if (!plan) {
        const [project] = await db
          .select({ storyPlan: projects.storyPlan })
          .from(projects)
          .where(eq(projects.id, projectId))
          .limit(1)

        if (project?.storyPlan) {
          return NextResponse.json({ storyPlan: project.storyPlan })
        }

        return NextResponse.json({ storyPlan: null })
      }

      return NextResponse.json({ storyPlan: plan.content })
    } else {
      return NextResponse.json({ error: API_ERROR.EPISODE_OR_PROJECT_ID_REQUIRED }, { status: 400 })
    }
  } catch (error) {
    console.error(API_LOG_PREFIX.ERROR_FETCHING_STORY_PLAN, error)
    return NextResponse.json({ error: API_ERROR.FAILED_FETCH_STORY_PLAN }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    const body = await req.json()
    const { episodeId, projectId, storyPlan, approved, currentPhase } = body

    if (episodeId) {
      if (!(await verifyEpisodeAccess(episodeId, session.user.id))) {
        return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (storyPlan !== undefined) updateData.storyPlan = storyPlan
      if (approved !== undefined) updateData.planApproved = approved
      if (currentPhase !== undefined) updateData.currentPhase = currentPhase

      const [updated] = await db
        .update(episodes)
        .set(updateData)
        .where(eq(episodes.id, episodeId))
        .returning()

      return NextResponse.json({ success: true, episode: updated })
    } else if (projectId) {
      if (!(await verifyProjectAccess(projectId, session.user.id))) {
        return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
      }

      await db
        .insert(storyPlans)
        .values({ projectId, content: storyPlan, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: storyPlans.projectId,
          set: { content: storyPlan, updatedAt: new Date() },
        })

      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: API_ERROR.EPISODE_OR_PROJECT_ID_REQUIRED }, { status: 400 })
    }
  } catch (error) {
    console.error(API_LOG_PREFIX.ERROR_SAVING_STORY_PLAN, error)
    return NextResponse.json({ error: API_ERROR.FAILED_SAVE_STORY_PLAN }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })

    return patchStoryPlanSequence(req, session.user.id)
  } catch (error) {
    console.error(API_LOG_PREFIX.ERROR_UPDATING_SEQUENCE, error)
    return NextResponse.json({ error: API_ERROR.FAILED_UPDATE_SEQUENCE }, { status: 500 })
  }
}
