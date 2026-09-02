/** Episode plan merge — bible categories and hydration field keys. */

import { ToolResultPayloadField } from '@/domains/storyteller/config/constants/tool-result-wire'
import { BIBLE_CATEGORY_KEYS } from '@/domains/storyteller/services/constants/context-assembly'

export { BIBLE_CATEGORY_KEYS }

export const HYDRATION_CATEGORY_KEYS = [
  ...BIBLE_CATEGORY_KEYS,
  ToolResultPayloadField.UpdatedFields,
] as const

/** One array, re-exported: two copies of this list drifted once already. */
export { HYDRATION_PLAN_FIELDS } from '@/domains/storyteller/state/constants/hydration'

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
