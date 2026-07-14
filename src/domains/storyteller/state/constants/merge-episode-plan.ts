/** Episode plan merge — bible categories and hydration field keys. */

import { StoryPlanMergeField } from '@/domains/storyteller/config/constants/bible-wire-fields'
import { CastFieldAlias } from '@/domains/storyteller/core/formatting/constants/story-plan-fields'
import { ToolResultPayloadField } from '@/domains/storyteller/config/constants/tool-result-wire'
import { BIBLE_CATEGORY_KEYS } from '@/domains/storyteller/services/constants/context-assembly'

export { BIBLE_CATEGORY_KEYS }

export const HYDRATION_CATEGORY_KEYS = [
  ...BIBLE_CATEGORY_KEYS,
  ToolResultPayloadField.UpdatedFields,
] as const

export const HYDRATION_PLAN_FIELDS = [
  StoryPlanMergeField.Soundtracks,
  StoryPlanMergeField.WorldRules,
  StoryPlanMergeField.Factions,
  CastFieldAlias.KeyCharacters,
  StoryPlanMergeField.PlotTwists,
  StoryPlanMergeField.Inspirations,
  StoryPlanMergeField.WorldDescription,
  StoryPlanMergeField.Genre,
  StoryPlanMergeField.Tone,
  StoryPlanMergeField.Sequences,
  StoryPlanMergeField.SeasonStructure,
  StoryPlanMergeField.CentralTheme,
  StoryPlanMergeField.MasterPrompt,
  StoryPlanMergeField.MoodImages,
] as const

export enum EpisodePlanMergeField {
  ImagePrompts = 'imagePrompts',
  StoryPlan = 'storyPlan',
  CurrentPhase = 'currentPhase',
  Script = 'script',
  EpisodeRoadmap = 'episodeRoadmap',
  Episodes = 'episodes',
}

/** Minimum script length before inferring the writing phase. */
export const SCRIPT_WRITING_PHASE_MIN_LENGTH = 100
