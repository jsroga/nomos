import { describe, it, expect } from 'vitest'
import {
  applyUpdatesToStoryPlan,
  deepMerge,
  smartMergeArray,
} from '../action-config'
import {
  dedupeCastByName,
  extractCastFromUpdates,
  normalizeCastInUpdates,
  readCastFromPlan,
} from '@/domains/storyteller/core/StoryPlanFields'

describe('deepMerge', () => {
  it('merges nested objects without clobbering sibling keys', () => {
    const result = deepMerge(
      { premise: { title: 'Old', stakes: 'Low' }, genre: 'Drama' },
      { premise: { stakes: 'High' } }
    )
    expect(result).toEqual({
      premise: { title: 'Old', stakes: 'High' },
      genre: 'Drama',
    })
  })

  it('smart-merges arrays by identifier', () => {
    const factions = smartMergeArray(
      [{ name: 'Guild', power: 3 }],
      [{ name: 'Guild', power: 5 }, { name: 'Cult', power: 1 }]
    )
    expect(factions).toEqual([
      { name: 'Guild', power: 5 },
      { name: 'Cult', power: 1 },
    ])
  })
})

describe('cast field normalization', () => {
  it('reads cast from keyCharacters alias', () => {
    expect(readCastFromPlan({ keyCharacters: [{ name: 'Ada' }] })).toEqual([{ name: 'Ada' }])
  })

  it('normalizes keyCharacters updates to cast', () => {
    const normalized = normalizeCastInUpdates({
      keyCharacters: [{ name: 'Bob' }],
      genre: 'Sci-fi',
    })
    expect(normalized.cast).toEqual([{ name: 'Bob' }])
    expect(normalized.keyCharacters).toBeUndefined()
    expect(normalized.genre).toBe('Sci-fi')
  })

  it('dedupes cast entries by name', () => {
    const deduped = dedupeCastByName([
      { name: 'Caesar', role: 'Lead' },
      { name: 'Caesar', role: 'Emperor' },
    ])
    expect(deduped).toHaveLength(1)
    expect((deduped[0] as { role: string }).role).toBe('Emperor')
  })

  it('extractCastFromUpdates prefers first alias present', () => {
    expect(
      extractCastFromUpdates({
        characters: [{ name: 'A' }],
        cast: [{ name: 'B' }],
      })
    ).toEqual([{ name: 'B' }])
  })
})

describe('applyUpdatesToStoryPlan', () => {
  it('merges keyCharacters into canonical cast and keeps UI alias in sync', () => {
    const result = applyUpdatesToStoryPlan(
      { cast: [{ name: 'Ada', role: 'Lead' }] },
      { keyCharacters: [{ name: 'Bob', role: 'Support' }] }
    )

    expect(result.cast).toHaveLength(2)
    expect(result.keyCharacters).toEqual(result.cast)
  })

  it('merges factions by name without losing existing entries', () => {
    const result = applyUpdatesToStoryPlan(
      { factions: [{ name: 'Guild', power: 2 }] },
      { factions: [{ name: 'Guild', power: 4 }, { name: 'Order', power: 1 }] }
    )

    expect(result.factions).toEqual([
      { name: 'Guild', power: 4 },
      { name: 'Order', power: 1 },
    ])
  })

  it('deep-merges episode premise updates', () => {
    const result = applyUpdatesToStoryPlan(
      { premise: { title: 'Pilot', logline: 'A stranger arrives' } },
      { premise: { logline: 'A stranger returns' } }
    )

    expect(result.premise).toEqual({
      title: 'Pilot',
      logline: 'A stranger returns',
    })
  })

  it('is idempotent when applying the same cast twice', () => {
    const update = { cast: [{ name: 'Ada', role: 'Lead' }] }
    const once = applyUpdatesToStoryPlan(null, update)
    const twice = applyUpdatesToStoryPlan(once, update)
    expect(twice.cast).toEqual(once.cast)
  })
})
