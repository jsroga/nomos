import { storyPlans } from '@/db'
import { db } from '@/db/client'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { ActionType } from '@/domains/storyteller/core/types/enums'
import { ActionApiResultType } from '@/shared/data/constants/protocol'
import { recordFromJson } from '@/shared/data/deep-merge'
import { inspirationsHaveItems } from '@/domains/storyteller/core/utils/bible-populated-fields'
import type { ActionHandler, StorytellerAction } from '../action-handler-context'
import { readSqlId } from '../read-payload-fields'

function nonEmptyArray(value: unknown): unknown[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined
  return value
}

function inspirationsIfPopulated(value: unknown): Record<string, unknown> | undefined {
  const inspirations = recordFromJson(value)
  return inspirationsHaveItems(inspirations) ? inspirations : undefined
}

export function buildStoryPlanPartialUpdates(action: StorytellerAction): Record<string, unknown> {
  const { type, payload } = action

  if (type === ActionType.UPDATE_WORLD_RULES) {
    return { worldRules: payload.worldRules || payload.rules }
  }
  if (type === ActionType.UPDATE_FACTIONS) {
    return { factions: payload.factions }
  }
  if (type === ActionType.UPDATE_INSPIRATIONS) {
    const inspirations = inspirationsIfPopulated(payload.inspirations)
    return inspirations ? { inspirations } : {}
  }
  if (type === ActionType.UPDATE_WORLD_DESCRIPTION) {
    return { worldDescription: payload.worldDescription || payload.description }
  }
  if (type === ActionType.UPDATE_PLOT_TWISTS) {
    return { plotTwists: payload.plotTwists }
  }
  if (type === ActionType.UPDATE_KEY_CHARACTERS) {
    return { keyCharacters: payload.keyCharacters || payload.characters }
  }
  if (type === ActionType.UPDATE_SOUNDTRACKS) {
    const soundtracks = nonEmptyArray(payload.soundtracks)
    return soundtracks ? { soundtracks } : {}
  }
  if (type === ActionType.SET_GENRE_AND_TONE) {
    return {
      genre: payload.genre,
      tone: payload.tone,
      styleReference: payload.styleReference,
    }
  }

  return {}
}

async function buildAddWorldRuleUpdates(
  projectId: string | undefined,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const [proj] = await db
    .select()
    .from(storyPlans)
    .where(eq(storyPlans.projectId, readSqlId(projectId)))
    .limit(1)
  const curr = recordFromJson(proj?.content)
  const currentRules = Array.isArray(curr.worldRules) ? curr.worldRules : []
  return { worldRules: [...currentRules, payload.rule] }
}

export const handleStoryPlanPartialUpdate: ActionHandler = async (ctx, action) => {
  let updates: Record<string, unknown> = {}

  if (action.type === ActionType.ADD_WORLD_RULE) {
    updates = await buildAddWorldRuleUpdates(ctx.projectId, action.payload)
  } else {
    updates = buildStoryPlanPartialUpdates(action)
  }

  console.log(
    `💾 [API] ${action.type} - Saving updates:`,
    JSON.stringify(updates).slice(0, 200)
  )
  const updated = await ctx.updateStoryPlan(updates)
  console.log(`✅ [API] ${action.type} - Saved successfully. Keys:`, Object.keys(updated))

  return NextResponse.json({
    success: true,
    result: { type: ActionApiResultType.BIBLE_UPDATED, seriesBible: { storyPlan: updated } },
  })
}
