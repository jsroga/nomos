/**
 * Canonical story-plan field helpers (cast / keyCharacters aliasing).
 */

import { smartMergeArray } from '@/domains/storyteller/core/editing/DeepMerge'

/** Aliases for the project cast field. `cast` is canonical at the persistence boundary. */
export const CAST_FIELD_ALIASES = [
  'cast',
  'characters',
  'keyCharacters',
  'key_characters',
  'keyPlayers',
  'key_players',
] as const

export function readCastFromPlan(plan: Record<string, unknown> | null | undefined): unknown[] {
  if (!plan) return []
  for (const key of CAST_FIELD_ALIASES) {
    const value = plan[key]
    if (Array.isArray(value)) return value
  }
  return []
}

export function extractCastFromUpdates(
  updates: Record<string, unknown>
): unknown[] | undefined {
  for (const key of CAST_FIELD_ALIASES) {
    const value = updates[key]
    if (value !== undefined) return Array.isArray(value) ? value : [value]
  }
  return undefined
}

/** Normalize cast aliases to `cast`; strip duplicate alias keys from updates. */
export function normalizeCastInUpdates(
  updates: Record<string, unknown>
): Record<string, unknown> {
  const cast = extractCastFromUpdates(updates)
  if (cast === undefined) return updates

  const result = { ...updates }
  for (const key of CAST_FIELD_ALIASES) {
    delete result[key]
  }
  result.cast = cast
  return result
}

export function dedupeCastByName(cast: unknown[]): unknown[] {
  const unique = new Map<string, unknown>()
  for (const entry of cast) {
    if (entry && typeof entry === 'object' && 'name' in entry) {
      const name = String((entry as { name: unknown }).name)
      if (name) unique.set(name, entry)
    }
  }
  return unique.size > 0 ? Array.from(unique.values()) : cast
}

/** Merge cast from a source record into target; writes canonical `cast` + UI alias `keyCharacters`. */
export function mergeCastFromSource(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): void {
  const incoming = extractCastFromUpdates(source)
  if (!incoming?.length) return

  const merged = dedupeCastByName(
    smartMergeArray(readCastFromPlan(target), incoming) as unknown[]
  )
  target.cast = merged
  target.keyCharacters = merged
}
