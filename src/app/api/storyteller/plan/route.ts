import { NextRequest, NextResponse } from 'next/server'
import { episodes, projects, storyPlans } from '@/db'
import { db } from '@/db/client'
import { verifyEpisodeAccess, verifyProjectAccess } from '@/domains/storyteller/server'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/shared/auth/auth'
import {
  episodeStoryPlanResponse,
  storyPlanRecordFromJson,
} from '@/domains/storyteller/core/entities/story-plan-wire'
import { readNumber, recordArrayFromJson, recordFromJson } from '@/shared/data/json-guards'

// GET: Fetch story plan for an episode or project
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const episodeId = searchParams.get('episodeId')
  const projectId = searchParams.get('projectId')

  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (episodeId) {
      if (!(await verifyEpisodeAccess(episodeId, session.user.id))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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
        return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
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
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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
      return NextResponse.json({ error: 'Episode ID or Project ID is required' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error fetching story plan:', error)
    return NextResponse.json({ error: 'Failed to fetch story plan' }, { status: 500 })
  }
}

// POST: Save/update story plan
export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { episodeId, projectId, storyPlan, approved, currentPhase } = body

    if (episodeId) {
      if (!(await verifyEpisodeAccess(episodeId, session.user.id))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      const updateData: any = { updatedAt: new Date() }
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
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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
      return NextResponse.json({ error: 'Episode ID or Project ID is required' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error saving story plan:', error)
    return NextResponse.json({ error: 'Failed to save story plan' }, { status: 500 })
  }
}

// PATCH: Update individual sequence in story plan
export async function PATCH(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { episodeId, projectId, sequenceId, updates } = body

    if (!sequenceId || !updates) {
      return NextResponse.json({ error: 'Sequence ID and updates are required' }, { status: 400 })
    }

    let existingPlan = storyPlanRecordFromJson(null)

    if (episodeId) {
      if (!(await verifyEpisodeAccess(episodeId, session.user.id))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      const [episode] = await db
        .select({ storyPlan: episodes.storyPlan })
        .from(episodes)
        .where(eq(episodes.id, episodeId))
        .limit(1)
      existingPlan = storyPlanRecordFromJson(episode?.storyPlan)
    } else if (projectId) {
      if (!(await verifyProjectAccess(projectId, session.user.id))) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      const [plan] = await db
        .select()
        .from(storyPlans)
        .where(eq(storyPlans.projectId, projectId))
        .limit(1)

      existingPlan = storyPlanRecordFromJson(plan?.content)

      if (Object.keys(existingPlan).length === 0) {
        const [project] = await db
          .select({ storyPlan: projects.storyPlan })
          .from(projects)
          .where(eq(projects.id, projectId))
          .limit(1)
        existingPlan = storyPlanRecordFromJson(project?.storyPlan)
      }
    }

    const sequences = recordArrayFromJson(existingPlan.sequences)
    if (sequences.length === 0) {
      return NextResponse.json({ error: 'No existing plan found' }, { status: 404 })
    }

    const updatedSequences = sequences.map(seq => {
      const seqId = seq.id
      if (seqId === sequenceId || String(seqId) === String(sequenceId)) {
        return { ...seq, ...recordFromJson(updates) }
      }
      return seq
    })

    const updatedPlan = { ...existingPlan, sequences: updatedSequences }

    if (episodeId) {
      await db
        .update(episodes)
        .set({ storyPlan: updatedPlan, updatedAt: new Date() })
        .where(eq(episodes.id, episodeId))
    } else if (projectId) {
      await db
        .insert(storyPlans)
        .values({ projectId, content: updatedPlan, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: storyPlans.projectId,
          set: { content: updatedPlan, updatedAt: new Date() },
        })
    }

    return NextResponse.json({ success: true, storyPlan: updatedPlan })
  } catch (error) {
    console.error('Error updating sequence:', error)
    return NextResponse.json({ error: 'Failed to update sequence' }, { status: 500 })
  }
}
