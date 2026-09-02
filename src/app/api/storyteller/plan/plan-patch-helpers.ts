import { NextRequest, NextResponse } from 'next/server'
import { episodes, projects, storyPlans } from '@/db'
import { db } from '@/db/client'
import { verifyEpisodeAccess } from '@/domains/storyteller/server'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { eq } from 'drizzle-orm'
import {
  storyPlanRecordFromJson,
} from '@/domains/storyteller/core/entities/story-plan-wire'
import { persistBibleOwnedPlanFields } from '@/domains/storyteller/core/io/persist-bible-owned-plan'
import {
  omitBibleOwnedPlanFields,
  pickBibleOwnedPlanFields,
} from '@/domains/storyteller/core/utils/bible-populated-fields'
import { recordArrayFromJson, recordFromJson } from '@/shared/data/json-guards'
import { API_ERROR } from '@/shared/data/constants/api-errors'

async function loadExistingPlan(input: {
  episodeId?: string
  projectId?: string
  userId: string
}) {
  if (input.episodeId) {
    if (!(await verifyEpisodeAccess(input.episodeId, input.userId))) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
    }

    const [episode] = await db
      .select({ storyPlan: episodes.storyPlan })
      .from(episodes)
      .where(eq(episodes.id, input.episodeId))
      .limit(1)
    return storyPlanRecordFromJson(episode?.storyPlan)
  }

  if (input.projectId) {
    if (!(await tryProjectScope(input.projectId, input.userId))) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
    }

    const [plan] = await db
      .select()
      .from(storyPlans)
      .where(eq(storyPlans.projectId, input.projectId))
      .limit(1)

    let existingPlan = storyPlanRecordFromJson(plan?.content)
    if (Object.keys(existingPlan).length === 0) {
      const [project] = await db
        .select({ storyPlan: projects.storyPlan })
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1)
      existingPlan = storyPlanRecordFromJson(project?.storyPlan)
    }
    return existingPlan
  }

  return null
}

async function projectIdForEpisode(episodeId: string, projectId?: string): Promise<string | undefined> {
  if (projectId) return projectId
  const [episode] = await db
    .select({ projectId: episodes.projectId })
    .from(episodes)
    .where(eq(episodes.id, episodeId))
    .limit(1)
  return episode?.projectId
}

/** Persist bible-owned keys on the project; return the episode-only jsonb. */
export async function splitStoryPlanForEpisodeWrite(input: {
  episodeId: string
  projectId?: string
  storyPlan: unknown
}): Promise<Record<string, unknown>> {
  const plan = recordFromJson(input.storyPlan)
  const projectId = await projectIdForEpisode(input.episodeId, input.projectId)
  if (projectId) {
    await persistBibleOwnedPlanFields(projectId, pickBibleOwnedPlanFields(plan))
  }
  return omitBibleOwnedPlanFields(plan)
}

export async function patchStoryPlanSequence(req: NextRequest, userId: string) {
  const body = await req.json()
  const { episodeId, projectId, sequenceId, updates } = body

  if (!sequenceId || !updates) {
    return NextResponse.json({ error: API_ERROR.SEQUENCE_ID_AND_UPDATES_REQUIRED }, { status: 400 })
  }

  const existingPlanResult = await loadExistingPlan({ episodeId, projectId, userId })
  if (existingPlanResult instanceof NextResponse) return existingPlanResult
  if (existingPlanResult === null) {
    return NextResponse.json({ error: API_ERROR.EPISODE_OR_PROJECT_ID_REQUIRED }, { status: 400 })
  }

  const sequences = recordArrayFromJson(existingPlanResult.sequences)
  if (sequences.length === 0) {
    return NextResponse.json({ error: API_ERROR.NO_EXISTING_PLAN }, { status: 404 })
  }

  const updatedSequences = sequences.map(seq => {
    const seqId = seq.id
    if (seqId === sequenceId || String(seqId) === String(sequenceId)) {
      return { ...seq, ...recordFromJson(updates) }
    }
    return seq
  })

  const nextPlan = {
    ...existingPlanResult,
    sequences: updatedSequences,
  }

  if (episodeId) {
    const episodePlan = await splitStoryPlanForEpisodeWrite({
      episodeId,
      projectId,
      storyPlan: nextPlan,
    })
    await db
      .update(episodes)
      .set({ storyPlan: episodePlan, updatedAt: new Date() })
      .where(eq(episodes.id, episodeId))
    return NextResponse.json({ success: true, storyPlan: episodePlan })
  }

  if (projectId) {
    await db
      .insert(storyPlans)
      .values({ projectId, content: nextPlan, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: storyPlans.projectId,
        set: { content: nextPlan, updatedAt: new Date() },
      })
  }

  return NextResponse.json({ success: true, storyPlan: nextPlan })
}
