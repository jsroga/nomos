/** Storyteller hydration — plan field keys and bible category keys. */

import { ToolResultPayloadField } from '@/domains/storyteller/config/constants/tool-result-wire'
import { BibleCategoryKey } from '@/shared/data/constants/protocol'
import { hydrationPlanFields } from '@/domains/storyteller/core/bible/section-registry'

/**
 * Fields the hydration pass carries into UI state.
 *
 * Derived from SECTION_REGISTRY. There were two hand-kept copies of this list
 * read by two different hydration paths; they drifted, and the roadmap and
 * executive summary stopped hydrating through one of them.
 */
export const HYDRATION_PLAN_FIELDS: readonly string[] = hydrationPlanFields()

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
