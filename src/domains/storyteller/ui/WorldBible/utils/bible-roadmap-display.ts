import type { SeasonStructure, StoryPlan } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { resolveRoadmapList, type RoadmapSlot } from '@/domains/storyteller/core/utils/roadmap-slot'
import { readString, recordFromJson } from '@/shared/data/json-guards'

function isSeasonStructure(value: unknown): value is SeasonStructure {
  const record = recordFromJson(value)
  return (
    typeof readString(record.seasonLogline) === 'string' ||
    typeof readString(record.incitingIncident) === 'string'
  )
}

function firstSeasonStructure(candidates: unknown[]): SeasonStructure | undefined {
  for (const candidate of candidates) {
    if (candidate && isSeasonStructure(candidate)) return candidate
  }
  return undefined
}

export function resolveRoadmapSequences(
  isEditing: boolean,
  localPlan: Partial<StoryPlan>,
  storyPlan: StoryPlan
): RoadmapSlot[] {
  if (isEditing) return resolveRoadmapList({}, localPlan.sequences || [])
  return resolveRoadmapList(storyPlan, localPlan.sequences)
}

export function resolveRoadmapSeasonStructure(
  isEditing: boolean,
  localPlan: Partial<StoryPlan>,
  storyPlan: StoryPlan
): SeasonStructure | undefined {
  if (isEditing) return localPlan.seasonStructure ?? undefined
  return firstSeasonStructure([
    localPlan.seasonStructure,
    storyPlan.seasonStructure,
    storyPlan.episodeRoadmap?.seasonStructure,
  ])
}
