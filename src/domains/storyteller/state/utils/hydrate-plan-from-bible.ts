import { recordArrayFromJson, recordFromJson } from '@/shared/data/json-guards'
import { CastFieldAlias } from '@/domains/storyteller/core/formatting/constants/story-plan-fields'
import { ToolResultPayloadField } from '@/domains/storyteller/config/constants/tool-result-wire'
import { HYDRATION_CATEGORY_KEYS, HYDRATION_PLAN_FIELDS } from '@/domains/storyteller/state/constants/merge-episode-plan'

function isEmptyFieldValue(value: unknown): boolean {
  return value === undefined || value === null || (Array.isArray(value) && value.length === 0)
}

function resolveHydrationFieldValue(
  field: string,
  rawStoryPlan: Record<string, unknown>,
  rawBibleUpdated: Record<string, unknown>,
  rawBible: Record<string, unknown>
): unknown {
  if (rawStoryPlan[field] !== undefined && rawStoryPlan[field] !== null) {
    return rawStoryPlan[field]
  }
  if (rawBibleUpdated[field] !== undefined) {
    return rawBibleUpdated[field]
  }
  if (rawBible[field] !== undefined) {
    return rawBible[field]
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
    if (isEmptyFieldValue(initialPlan[field])) {
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

  return initialPlan
}
