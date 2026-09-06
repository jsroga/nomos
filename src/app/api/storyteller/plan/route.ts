import { NextRequest, NextResponse } from 'next/server'
import { episodes, projects, storyPlans } from '@/db'
import { db } from '@/db/client'
import {
  episodeStoryPlanResponse,
  verifyEpisodeAccess,
} from '@/domains/storyteller/server'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/shared/auth/auth'
import { persistBibleOwnedPlanFields } from '@/domains/storyteller/core/io/persist-bible-owned-plan'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { QueryParam, HttpStatus } from '@/shared/data/constants/protocol'
import { recordFromJson } from '@/shared/data/json-guards'
import { patchStoryPlanSequence, splitStoryPlanForEpisodeWrite } from './plan-patch-helpers'
import { PlanSaveField, planSaveRequestSchema } from '@/domains/storyteller/core/io/plan-patch'

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
      if (!(await tryProjectScope(projectId, session.user.id))) {
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

    const parsed = planSaveRequestSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: API_ERROR.INVALID_PAYLOAD },
        { status: HttpStatus.BAD_REQUEST }
      )
    }
    const episodeId = parsed.data[PlanSaveField.EpisodeId]
    const projectId = parsed.data[PlanSaveField.ProjectId]
    const storyPlan = parsed.data[PlanSaveField.StoryPlan]
    const approved = parsed.data[PlanSaveField.Approved]
    const currentPhase = parsed.data[PlanSaveField.CurrentPhase]

    if (episodeId) {
      if (!(await verifyEpisodeAccess(episodeId, session.user.id))) {
        return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (storyPlan !== undefined) {
        updateData.storyPlan = await splitStoryPlanForEpisodeWrite({
          episodeId,
          projectId,
          storyPlan,
        })
      }
      if (approved !== undefined) updateData.planApproved = approved
      if (currentPhase !== undefined) updateData.currentPhase = currentPhase

      const [updated] = await db
        .update(episodes)
        .set(updateData)
        .where(eq(episodes.id, episodeId))
        .returning()

      return NextResponse.json({ success: true, episode: updated })
    } else if (projectId) {
      if (!(await tryProjectScope(projectId, session.user.id))) {
        return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
      }

      if (storyPlan !== undefined) {
        const planRecord = recordFromJson(storyPlan)
        await persistBibleOwnedPlanFields(projectId, planRecord)
        await db
          .insert(storyPlans)
          .values({ projectId, content: planRecord, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: storyPlans.projectId,
            set: { content: planRecord, updatedAt: new Date() },
          })
      }

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
