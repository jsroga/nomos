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

function isFilledLabel(value: string | undefined): boolean {
  return Boolean(value) && value !== StorytellerUnknownLabel.Unknown && value !== ''
}

function hasItems(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0
}

function hasStoryPlanBibleSignals(storyPlan: Partial<StoryPlan> | null | undefined): boolean {
  if (!storyPlan) return false
  return [
    Boolean(storyPlan.worldDescription),
    isFilledLabel(storyPlan.genre),
    isFilledLabel(storyPlan.tone),
    hasItems(storyPlan.themes),
    hasItems(storyPlan.worldRules),
    hasItems(storyPlan.factions),
    hasItems(storyPlan.plotTwists),
  ].some(Boolean)
}

export function computeHasBible(
  storyPlan: Partial<StoryPlan> | null | undefined,
  overrideState: string | null | undefined,
): boolean {
  const overrideResult = hasOverrideBibleState(overrideState)
  if (overrideResult !== null) return overrideResult
  return hasStoryPlanBibleSignals(storyPlan)
}
