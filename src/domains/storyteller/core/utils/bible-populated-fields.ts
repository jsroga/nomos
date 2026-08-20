import { StoryPlanMergeField } from '@/domains/storyteller/config/constants/bible-wire-fields'
import { recordFromJson } from '@/shared/data/json-guards'

export enum InspirationBucket {
  Books = 'books',
  Movies = 'movies',
  Games = 'games',
}

const INSPIRATION_BUCKETS = [
  InspirationBucket.Books,
  InspirationBucket.Movies,
  InspirationBucket.Games,
] as const

export function inspirationsHaveItems(value: unknown): boolean {
  const inspirations = recordFromJson(value)
  return INSPIRATION_BUCKETS.some(bucket => {
    const items = inspirations[bucket]
    return Array.isArray(items) && items.length > 0
  })
}

export function isVacantHydrationValue(field: string, value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (Array.isArray(value) && value.length === 0) return true
  if (field === StoryPlanMergeField.Inspirations) return !inspirationsHaveItems(value)
  return false
}

/** Drop empty soundtrack / inspirations so they cannot replace stored lists. */
export function omitVacantSoundtrackInspirations(
  updates: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(updates).filter(([key, value]) => {
      if (key === StoryPlanMergeField.Soundtracks) {
        return !isVacantHydrationValue(StoryPlanMergeField.Soundtracks, value)
      }
      if (key === StoryPlanMergeField.Inspirations) {
        return !isVacantHydrationValue(StoryPlanMergeField.Inspirations, value)
      }
      return true
    }),
  )
}

/** True when a jsonb field has content worth treating as the live copy. */
export function isPresentOverlapValue(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') {
    const rec = recordFromJson(value)
    const hasInspirationShape = INSPIRATION_BUCKETS.some(bucket => bucket in rec)
    if (hasInspirationShape) return inspirationsHaveItems(rec)
    return Object.keys(rec).length > 0
  }
  return true
}
