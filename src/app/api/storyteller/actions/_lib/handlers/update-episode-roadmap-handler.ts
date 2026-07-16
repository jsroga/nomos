import { NextResponse } from 'next/server'
import { ActionApiResultType } from '@/shared/data/constants/protocol'
import { recordFromJson } from '@/shared/data/deep-merge'
import type { ActionHandler } from '../action-handler-context'

export const handleUpdateEpisodeRoadmap: ActionHandler = async (ctx, action) => {
  const payload = action.payload
  const updates: Record<string, unknown> = {}
  if (payload.sequences) updates.sequences = payload.sequences
  if (payload.seasonStructure) updates.seasonStructure = payload.seasonStructure
  if (payload.executiveSummary) updates.executiveSummary = payload.executiveSummary

  if (payload.episodeRoadmap) {
    updates.episodeRoadmap = payload.episodeRoadmap
    const roadmap = recordFromJson(payload.episodeRoadmap)
    if (!updates.seasonStructure && roadmap.seasonStructure) {
      updates.seasonStructure = roadmap.seasonStructure
    }
    if (!updates.executiveSummary && roadmap.executiveSummary) {
      updates.executiveSummary = roadmap.executiveSummary
    }
    const episodes = roadmap.episodes || roadmap.sequences
    if (episodes && !updates.sequences) {
      updates.sequences = episodes
    }
  }

  const updatedPlan = await ctx.updateStoryPlan(updates)
  return NextResponse.json({
    success: true,
    result: { type: ActionApiResultType.BIBLE_UPDATED, seriesBible: { storyPlan: updatedPlan } },
  })
}
