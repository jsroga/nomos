import { NextResponse } from 'next/server'
import { STORY_PLAN_FIELDS } from '@/domains/storyteller/config/action-config'
import { ActionApiResultType } from '@/shared/data/constants/protocol'
import { API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import type { ActionHandler } from '../action-handler-context'

const storyPlanFieldKeys = new Set<string>(STORY_PLAN_FIELDS)

export const handleUpdateSeriesBible: ActionHandler = async (ctx, action) => {
  const payload = { ...action.payload }

  const planUpdates: Record<string, unknown> = {}
  const bibleUpdates: Record<string, unknown> = {}

  if (payload.storyPlan) {
    Object.assign(planUpdates, payload.storyPlan)
    delete payload.storyPlan
  }

  for (const key of Object.keys(payload)) {
    if (storyPlanFieldKeys.has(key)) {
      planUpdates[key] = payload[key]
    } else {
      bibleUpdates[key] = payload[key]
    }
  }

  let updatedBible = {}
  let updatedPlan = {}

  if (Object.keys(bibleUpdates).length > 0) {
    updatedBible = await ctx.updateSeriesBible(bibleUpdates)
  }

  if (Object.keys(planUpdates).length > 0) {
    updatedPlan = await ctx.updateStoryPlan(planUpdates)
  }

  const finalResult = {
    ...bibleUpdates,
    ...updatedBible,
    storyPlan: {
      ...planUpdates,
      ...updatedPlan,
    },
  }
  console.log(API_LOG_PREFIX.ACTIONS_API_SUCCESS, Object.keys(finalResult))

  return NextResponse.json({
    success: true,
    result: {
      type: ActionApiResultType.BIBLE_UPDATED,
      seriesBible: finalResult,
    },
  })
}
