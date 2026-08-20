import { recordArrayFromJson, recordFromJson } from '@/shared/data/json-guards'
import { CastFieldAlias } from '@/domains/storyteller/core/formatting/constants/story-plan-fields'
import { ToolResultPayloadField } from '@/domains/storyteller/config/constants/tool-result-wire'
import {
  isVacantHydrationValue,
  omitVacantSoundtrackInspirations,
} from '@/domains/storyteller/core/utils/bible-populated-fields'
import { HYDRATION_CATEGORY_KEYS, HYDRATION_PLAN_FIELDS } from '@/domains/storyteller/state/constants/merge-episode-plan'

function resolveHydrationFieldValue(
  field: string,
  rawStoryPlan: Record<string, unknown>,
  rawBibleUpdated: Record<string, unknown>,
  rawBible: Record<string, unknown>
): unknown {
  for (const source of [rawStoryPlan, rawBibleUpdated, rawBible]) {
    const value = source[field]
    if (!isVacantHydrationValue(field, value)) return value
  }
  return undefined
}

export function hydratePlanFromBibleSources(
  rawBible: Record<string, unknown>,
  rawStoryPlan: Record<string, unknown>
): Record<string, unknown> {
  const rawBibleUpdated = recordFromJson(rawBible[ToolResultPayloadField.UpdatedFields])
  const initialPlan: Record<string, unknown> = { ...rawStoryPlan }

  for (const cat of HYDRATION_CATEGORY_KEYS) {
    const catData = recordFromJson(rawBible[cat])
    if (Object.keys(catData).length > 0) {
      Object.assign(initialPlan, catData)
    }
  }

  for (const field of HYDRATION_PLAN_FIELDS) {
    if (isVacantHydrationValue(field, initialPlan[field])) {
      const resolved = resolveHydrationFieldValue(field, rawStoryPlan, rawBibleUpdated, rawBible)
      if (resolved !== undefined) {
        initialPlan[field] = resolved
      }
    }
  }

  if (
    recordArrayFromJson(rawBibleUpdated[CastFieldAlias.Characters]).length > 0 &&
    recordArrayFromJson(initialPlan[CastFieldAlias.KeyCharacters]).length === 0
  ) {
    initialPlan[CastFieldAlias.KeyCharacters] = rawBibleUpdated[CastFieldAlias.Characters]
  }

  return omitVacantSoundtrackInspirations(initialPlan)
}
