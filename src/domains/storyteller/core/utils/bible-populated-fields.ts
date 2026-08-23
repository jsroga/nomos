import {
  SoundtrackFieldAlias,
  StoryPlanMergeField,
} from '@/domains/storyteller/config/constants/bible-wire-fields'
import { recordFromJson } from '@/shared/data/json-guards'

export enum InspirationBucket {
  Books = 'books',
  Movies = 'movies',
  Games = 'games',
}

/**
 * World-bible fields that must not be stored on `episodes.story_plan`.
 *
 * This must cover EVERY world-level section. When it listed only soundtracks
 * and inspirations, factions / plot twists / roadmap kept being written onto an
 * episode row, so the bible panel rendered empty until an episode happened to
 * be opened. `bible-owned-coverage.test.ts` fails if a `BibleSection` is added
 * without landing here, so the gap cannot silently reopen.
 *
 * Storyboard fields are deliberately absent — they belong to a single episode.
 */
export const BIBLE_OWNED_PLAN_FIELDS = [
  StoryPlanMergeField.Soundtracks,
  StoryPlanMergeField.Inspirations,
  SoundtrackFieldAlias.MoodSoundtrack,
  StoryPlanMergeField.WorldDescription,
  StoryPlanMergeField.WorldRules,
  StoryPlanMergeField.Factions,
  StoryPlanMergeField.PlotTwists,
  StoryPlanMergeField.Items,
  StoryPlanMergeField.Events,
  StoryPlanMergeField.Cast,
  StoryPlanMergeField.EpisodeRoadmap,
  StoryPlanMergeField.Moodboard,
  StoryPlanMergeField.MoodImages,
  StoryPlanMergeField.Genre,
  StoryPlanMergeField.Tone,
  StoryPlanMergeField.CentralTheme,
  StoryPlanMergeField.MasterPrompt,
  StoryPlanMergeField.Sequences,
  StoryPlanMergeField.SeasonStructure,
  StoryPlanMergeField.ExecutiveSummary,
] as const

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
  if (typeof value === 'string' && value.trim().length === 0) return true
  if (Array.isArray(value) && value.length === 0) return true
  if (field === StoryPlanMergeField.Inspirations) return !inspirationsHaveItems(value)
  return false
}

function isBibleOwnedPlanField(key: string): boolean {
  return BIBLE_OWNED_PLAN_FIELDS.some(field => field === key)
}

function pickSpecifiedBibleOwnedFields(record: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {}
  for (const field of BIBLE_OWNED_PLAN_FIELDS) {
    if (field in record) picked[field] = record[field]
  }
  return picked
}

/** Soundtrack / inspirations / mood line that actually have content. */
export function pickBibleOwnedPlanFields(source: unknown): Record<string, unknown> {
  return omitVacantSoundtrackInspirations(pickSpecifiedBibleOwnedFields(recordFromJson(source)))
}

/** Drop bible-owned keys so an episode jsonb cannot store them. */
export function omitBibleOwnedPlanFields(plan: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(plan).filter(([key]) => !isBibleOwnedPlanField(key)))
}

/** Later sources win when they actually have tracks / inspiration items. */
export function populatedSoundtrackInspirations(
  ...sources: unknown[]
): Record<string, unknown> {
  const merged: Record<string, unknown> = {}
  for (const source of sources) {
    Object.assign(merged, pickBibleOwnedPlanFields(source))
  }
  return merged
}

/** Extra copies of bible-owned fields that the canon blobs are missing. */
export function bibleOwnedFieldsMissingFromCanon(
  canonSources: unknown[],
  extraSources: unknown[],
): Record<string, unknown> {
  const have = populatedSoundtrackInspirations(...canonSources)
  const extra = populatedSoundtrackInspirations(...extraSources)
  const missing: Record<string, unknown> = {}
  for (const field of BIBLE_OWNED_PLAN_FIELDS) {
    if (isVacantHydrationValue(field, have[field]) && !isVacantHydrationValue(field, extra[field])) {
      missing[field] = extra[field]
    }
  }
  return missing
}

/** Drop empty soundtrack / inspirations so they cannot replace stored lists. */
export function omitVacantSoundtrackInspirations(
  updates: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(updates).filter(([key, value]) => {
      if (!isBibleOwnedPlanField(key)) return true
      return !isVacantHydrationValue(key, value)
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
