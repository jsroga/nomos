import type { StoryPlan } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import {
  StorytellerOverrideState,
  StorytellerUnknownLabel,
} from '@/domains/storyteller/core/storyteller-page-wire'

function hasOverrideBibleState(overrideState: string | null | undefined): boolean | null {
  if (overrideState === StorytellerOverrideState.NoBible) return false
  if (
    overrideState === StorytellerOverrideState.NoEpisodes ||
    overrideState === StorytellerOverrideState.HasEpisodes
  ) {
    return true
  }
  return null
}

function hasStoryPlanBibleSignals(storyPlan: StoryPlan | null | undefined): boolean {
  const hasGenre =
    !!storyPlan?.genre &&
    storyPlan.genre !== StorytellerUnknownLabel.Unknown &&
    storyPlan.genre !== ''
  const hasTone =
    !!storyPlan?.tone &&
    storyPlan.tone !== StorytellerUnknownLabel.Unknown &&
    storyPlan.tone !== ''

  return !!(
    storyPlan?.worldDescription ||
    hasGenre ||
    hasTone ||
    (storyPlan?.themes && storyPlan.themes.length > 0)
  )
}

export function computeHasBible(
  storyPlan: StoryPlan | null | undefined,
  overrideState: string | null | undefined,
): boolean {
  const overrideResult = hasOverrideBibleState(overrideState)
  if (overrideResult !== null) return overrideResult
  return hasStoryPlanBibleSignals(storyPlan)
}
