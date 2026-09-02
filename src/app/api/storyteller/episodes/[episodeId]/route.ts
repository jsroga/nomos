import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/client'
import { episodes } from '@/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/shared/auth/auth'
import { verifyEpisodeAccess } from '@/domains/storyteller/server'
import { recordFromJson } from '@/shared/data/json-guards'
import { omitBibleOwnedPlanFields } from '@/domains/storyteller/core/utils/bible-populated-fields'
import { storyPlanRecordFromJson } from '@/domains/storyteller/core/entities/story-plan-wire'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { HttpStatus } from '@/shared/data/constants/protocol'
import {
  EPISODE_PATCH_ALLOWED_COLUMNS,
  EpisodePatchAlias,
} from './constants/episode-patch'

/**
 * Every method here reads or writes one tenant's episode, so each one
 * authenticates and then verifies ownership. A caller who is signed in but does
 * not own the episode gets 404, not 403 — 403 would confirm the id exists.
 */
async function requireEpisodeAccess(episodeId: string): Promise<NextResponse | null> {
  const { session } = await requireAuth()
  if (!session) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
  }

  const access = await verifyEpisodeAccess(episodeId, session.user.id)
  if (!access.hasAccess) {
    return NextResponse.json(
      { error: API_ERROR.EPISODE_NOT_FOUND },
      { status: HttpStatus.NOT_FOUND }
    )
  }

  return null
}

export async function GET(_req: NextRequest, props: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = await props.params
  try {
    const denied = await requireEpisodeAccess(episodeId)
    if (denied) return denied

    const episode = await db.query.episodes.findFirst({ where: eq(episodes.id, episodeId) })

    if (!episode) {
      return NextResponse.json(
        { error: API_ERROR.EPISODE_NOT_FOUND },
        { status: HttpStatus.NOT_FOUND }
      )
    }

    return NextResponse.json(episode)
  } catch (error) {
    console.error(API_LOG_PREFIX.EPISODE_FETCH_ERROR, error)
    return NextResponse.json(
      { error: API_ERROR.FAILED_FETCH_EPISODE },
      { status: HttpStatus.INTERNAL }
    )
  }
}

/** Keep only columns a caller is allowed to write. */
function pickAllowedColumns(body: Record<string, unknown>): Record<string, unknown> {
  const update: Record<string, unknown> = {}
  for (const column of EPISODE_PATCH_ALLOWED_COLUMNS) {
    if (body[column] !== undefined) update[column] = body[column]
  }
  return update
}

async function currentStoryPlan(
  episodeId: string,
  pending: unknown
): Promise<Record<string, unknown>> {
  if (pending !== undefined) return storyPlanRecordFromJson(pending)
  const episode = await db.query.episodes.findFirst({ where: eq(episodes.id, episodeId) })
  return storyPlanRecordFromJson(episode?.storyPlan)
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = await props.params
  try {
    const denied = await requireEpisodeAccess(episodeId)
    if (denied) return denied

    const body = recordFromJson(await req.json())
    const { posterUrl, storyboardUrl } = body
    const updateData = pickAllowedColumns(body)

    // Wire aliases: the client has sent all three spellings historically.
    const promptAlias = body[EpisodePatchAlias.EpisodePrompt] ?? body[EpisodePatchAlias.MasterPromptSnake]
    if (promptAlias !== undefined) updateData.masterPrompt = promptAlias

    // posterUrl is a column *and* is mirrored into the plan.
    if (posterUrl) {
      const plan = await currentStoryPlan(episodeId, updateData.storyPlan)
      updateData.storyPlan = omitBibleOwnedPlanFields({ ...plan, posterUrl })
    }

    // premise merges into the plan rather than replacing the column.
    if (body.premise !== undefined) {
      const plan = await currentStoryPlan(episodeId, updateData.storyPlan)
      updateData.storyPlan = omitBibleOwnedPlanFields({
        ...plan,
        premise: { ...recordFromJson(plan.premise), ...recordFromJson(body.premise) },
      })
      delete updateData.premise
    }

    // storyboardUrl has no column yet, so it lives in the plan.
    if (storyboardUrl) {
      const plan = await currentStoryPlan(episodeId, updateData.storyPlan)
      updateData.storyPlan = omitBibleOwnedPlanFields({ ...plan, storyboardUrl })
    }

    if (updateData.storyPlan !== undefined) {
      updateData.storyPlan = omitBibleOwnedPlanFields(recordFromJson(updateData.storyPlan))
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: API_ERROR.NO_UPDATES_PROVIDED })
    }

    const [updatedEpisode] = await db
      .update(episodes)
      .set(updateData)
      .where(eq(episodes.id, episodeId))
      .returning()

    return NextResponse.json(updatedEpisode)
  } catch (error) {
    console.error(API_LOG_PREFIX.EPISODE_UPDATE_ERROR, error)
    return NextResponse.json(
      { error: API_ERROR.FAILED_UPDATE_EPISODE },
      { status: HttpStatus.INTERNAL }
    )
  }
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = await props.params
  try {
    const denied = await requireEpisodeAccess(episodeId)
    if (denied) return denied

    await db.delete(episodes).where(eq(episodes.id, episodeId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(API_LOG_PREFIX.EPISODE_DELETE_ERROR, error)
    return NextResponse.json(
      { error: API_ERROR.FAILED_DELETE_EPISODE },
      { status: HttpStatus.INTERNAL }
    )
  }
}
