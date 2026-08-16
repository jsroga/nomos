import '@/shared/data/server-guard'
import type { EpisodeData } from './episode-tools-schema'

enum EpisodeStoryPlanKey {
  Premise = 'premise',
}

/** Strip premise so manage_episode can insert/update the row without committing draft prose. */
export function episodeWriteDataWithoutPremise(data: EpisodeData): EpisodeData {
  const next: EpisodeData = { title: data.title }
  if (data.sequence !== undefined) next.sequence = data.sequence
  if (data.thematicFocus !== undefined) next.thematicFocus = data.thematicFocus
  if (data.thumbnailUrl !== undefined) next.thumbnailUrl = data.thumbnailUrl
  if (data.storyPlan !== undefined) {
    const storyPlan: Record<string, unknown> = {}
    for (const key of Object.keys(data.storyPlan)) {
      if (key === EpisodeStoryPlanKey.Premise) continue
      storyPlan[key] = data.storyPlan[key]
    }
    if (Object.keys(storyPlan).length > 0) next.storyPlan = storyPlan
  }
  return next
}
