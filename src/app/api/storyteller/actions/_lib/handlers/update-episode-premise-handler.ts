import { episodes } from '@/db'
import { db } from '@/db/client'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { ApiErrorMessage, ActionApiResultType, HttpStatus } from '@/shared/data/constants/protocol'
import { persistBibleOwnedPlanFields } from '@/domains/storyteller/core/io/persist-bible-owned-plan'
import { omitBibleOwnedPlanFields } from '@/domains/storyteller/core/utils/bible-populated-fields'
import { recordFromJson } from '@/shared/data/deep-merge'
import type { ActionHandler } from '../action-handler-context'

export const handleUpdateEpisodePremise: ActionHandler = async (ctx, action) => {
  const { premise } = action.payload
  if (!ctx.episodeId) {
    return NextResponse.json(
      { error: ApiErrorMessage.EPISODE_ID_REQUIRED },
      { status: HttpStatus.BAD_REQUEST }
    )
  }

  const [existing] = await db.select().from(episodes).where(eq(episodes.id, ctx.episodeId))
  const existingPlan = recordFromJson(existing?.storyPlan)
  if (existing?.projectId) {
    await persistBibleOwnedPlanFields(existing.projectId, existingPlan)
  }
  const newPlan = omitBibleOwnedPlanFields({
    ...existingPlan,
    premise: {
      ...recordFromJson(existingPlan.premise),
      ...recordFromJson(premise),
    },
  })

  await db
    .update(episodes)
    .set({ storyPlan: newPlan, updatedAt: new Date() })
    .where(eq(episodes.id, ctx.episodeId))

  return NextResponse.json({
    success: true,
    result: { type: ActionApiResultType.EPISODE_UPDATED, storyPlan: newPlan },
  })
}
