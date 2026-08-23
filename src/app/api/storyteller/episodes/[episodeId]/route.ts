import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { episodes } from '@/db'
import { eq } from 'drizzle-orm'
import { recordFromJson } from '@/shared/data/json-guards'
import { omitBibleOwnedPlanFields } from '@/domains/storyteller/core/utils/bible-populated-fields'
import { storyPlanRecordFromJson } from '@/domains/storyteller/core/entities/story-plan-wire'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'

export async function GET(_req: Request, props: { params: Promise<{ episodeId: string }> }) {
  const params = await props.params
  try {
    const { episodeId } = params
    const episode = await db.query.episodes.findFirst({
      where: eq(episodes.id, episodeId),
    })

    if (!episode) {
      return NextResponse.json({ error: API_ERROR.EPISODE_NOT_FOUND }, { status: 404 })
    }

    return NextResponse.json(episode)
  } catch (error) {
    console.error(API_LOG_PREFIX.EPISODE_FETCH_ERROR, error)
    return NextResponse.json({ error: API_ERROR.FAILED_FETCH_EPISODE }, { status: 500 })
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ episodeId: string }> }) {
  const params = await props.params
  try {
    const { episodeId } = params
    const body = await req.json()
    const { posterUrl, storyboardUrl, ...rest } = body

    // Start with whatever is in rest
    const updateData: Record<string, unknown> = { ...rest }

    if (posterUrl) {
      updateData.posterUrl = posterUrl
      const currentEpisode = await db.query.episodes.findFirst({
        where: eq(episodes.id, episodeId),
      })
      if (currentEpisode) {
        const currentPlan = storyPlanRecordFromJson(
          updateData.storyPlan ?? currentEpisode.storyPlan,
        )
        updateData.storyPlan = omitBibleOwnedPlanFields({
          ...currentPlan,
          posterUrl,
        })
      }
    }

    // Map episode_prompt or master_prompt to schema's masterPrompt
    if (body.episode_prompt !== undefined) {
      updateData.masterPrompt = body.episode_prompt
      delete updateData.episode_prompt
    }
    if (body.master_prompt !== undefined) {
      updateData.masterPrompt = body.master_prompt
      delete updateData.master_prompt
    }

    // Merge premise into storyPlan
    if (body.premise !== undefined) {
      const currentEpisode = await db.query.episodes.findFirst({
        where: eq(episodes.id, episodeId),
      })

      if (currentEpisode) {
        const currentPlan = storyPlanRecordFromJson(
          updateData.storyPlan ?? currentEpisode.storyPlan,
        )
        const existingPremise = recordFromJson(currentPlan.premise)
        updateData.storyPlan = omitBibleOwnedPlanFields({
          ...currentPlan,
          premise: {
            ...existingPremise,
            ...recordFromJson(body.premise),
          },
        })
      }
      delete updateData.premise
    }

    // If storyboardUrl is provided, we need to save it into the storyPlan JSONB
    // because there is no top-level column for it yet.
    if (storyboardUrl) {
      const currentEpisode = await db.query.episodes.findFirst({
        where: eq(episodes.id, episodeId),
      })

      if (currentEpisode) {
        const currentPlan = storyPlanRecordFromJson(
          updateData.storyPlan ?? currentEpisode.storyPlan
        )
        updateData.storyPlan = omitBibleOwnedPlanFields({
          ...currentPlan,
          storyboardUrl,
        })
      }
    }

    if (updateData.storyPlan !== undefined) {
      updateData.storyPlan = omitBibleOwnedPlanFields(recordFromJson(updateData.storyPlan))
    }

    // Ensure we actually have something to update
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
    return NextResponse.json({ error: API_ERROR.FAILED_UPDATE_EPISODE }, { status: 500 })
  }
}

export async function DELETE(_req: Request, props: { params: Promise<{ episodeId: string }> }) {
  const params = await props.params
  try {
    const { episodeId } = params
    await db.delete(episodes).where(eq(episodes.id, episodeId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(API_LOG_PREFIX.EPISODE_DELETE_ERROR, error)
    return NextResponse.json({ error: API_ERROR.FAILED_DELETE_EPISODE }, { status: 500 })
  }
}
