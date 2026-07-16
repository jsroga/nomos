import { NextResponse } from 'next/server'
import { ActionApiResultType } from '@/shared/data/constants/protocol'
import type { ActionHandler } from '../action-handler-context'

export const handleUpdateRoadmapSummary: ActionHandler = async (ctx, action) => {
  const updatedPlan = await ctx.updateStoryPlan({
    executiveSummary: action.payload.executiveSummary,
  })
  return NextResponse.json({
    success: true,
    result: { type: ActionApiResultType.BIBLE_UPDATED, seriesBible: { storyPlan: updatedPlan } },
  })
}
