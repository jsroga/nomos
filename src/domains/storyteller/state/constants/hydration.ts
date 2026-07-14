/** Storyteller hydration — plan field keys and bible category keys. */

import { StoryPlanMergeField } from '@/domains/storyteller/config/constants/bible-wire-fields'
import { CastFieldAlias } from '@/domains/storyteller/core/formatting/constants/story-plan-fields'
import { ToolResultPayloadField } from '@/domains/storyteller/config/constants/tool-result-wire'
import { BibleCategoryKey } from '@/shared/data/constants/protocol'

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
  StoryPlanMergeField.ExecutiveSummary,
  StoryPlanMergeField.EpisodeRoadmap,
] as const

export const HYDRATION_BIBLE_CATEGORIES = [
  BibleCategoryKey.General,
  BibleCategoryKey.Setting,
  BibleCategoryKey.History,
  BibleCategoryKey.Magic,
  BibleCategoryKey.Factions,
  BibleCategoryKey.Technology,
  BibleCategoryKey.Culture,
  ToolResultPayloadField.UpdatedFields,
] as const

export enum StorytellerHydrationLog {
  Check = '🔍 [StorytellerPage] Hydration Check:',
  Hydrating = '🔄 [StorytellerPage] Hydrating state from project...',
  HydratedKeys = '✅ [StorytellerPage] Hydrated storyPlan keys:',
  WorldRulesCount = '✅ [StorytellerPage] worldRules count:',
}
