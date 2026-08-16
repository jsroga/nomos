import { describe, expect, it } from 'vitest'
import { CharacterRole } from '@/shared/data/constants/protocol'
import { NEW_CAST_DESCRIPTION_MAX_LENGTH } from '../constants/new-cast-characters'
import {
  collectCastCandidates,
  existingCastEntries,
  existingCastNames,
  newCastMembers,
} from '../new-cast-characters'

const VERA_LOGLINE = 'Vera confronts Marcus in the salt marsh.'
const LONG_LOGLINE = `${'The ledger repeats her name. '.repeat(20)}end.`

describe('existingCastNames', () => {
  it('unions page characters with plan cast and strips chips', () => {
    const names = existingCastNames(
      [{ name: '[Vera][char-vera]' }],
      { cast: [{ name: 'Marcus' }] },
    )

    expect(names).toEqual(expect.arrayContaining(['Vera', 'Marcus']))
    expect(names).toHaveLength(2)
  })

  it('ignores blank character names', () => {
    const names = existingCastNames([{ name: '   ' }], { cast: [] })

    expect(names).toEqual([])
  })
})

describe('existingCastEntries', () => {
  it('keeps plan rows and appends page characters that are not already there', () => {
    const entries = existingCastEntries(
      [
        { name: 'Vera', role: CharacterRole.Lead, description: VERA_LOGLINE },
        { name: 'Lina', role: CharacterRole.Supporting, description: 'Lina waits.' },
      ],
      { cast: [{ name: 'Vera', role: CharacterRole.Lead }] },
    )

    expect(entries).toHaveLength(2)
    expect(entries[0]).toEqual(expect.objectContaining({ name: 'Vera' }))
    expect(entries[1]).toEqual(
      expect.objectContaining({
        name: 'Lina',
        role: CharacterRole.Supporting,
        description: 'Lina waits.',
      }),
    )
  })
})

describe('collectCastCandidates extra sources', () => {
  it('skips empty and whitespace names from the beat list', () => {
    const candidates = collectCastCandidates({
      beatPayloads: [
        { logline: VERA_LOGLINE, charactersInvolved: ['', '  ', 'Vera'] },
      ],
    })

    expect(candidates).toEqual([{ name: 'Vera', description: VERA_LOGLINE }])
  })

  it('picks a character chip nested inside a faction description', () => {
    const candidates = collectCastCandidates({
      previews: [
        {
          factions: [
            {
              name: 'Keepers',
              description: 'The Keepers answer to [Vera][char-vera] after dusk.',
            },
          ],
        },
      ],
    })

    expect(candidates).toEqual([
      { name: 'Vera', description: 'The Keepers answer to Vera after dusk.' },
    ])
  })

  it('ignores place chips so locations are not added to cast', () => {
    const candidates = collectCastCandidates({
      previews: [
        { worldDescription: 'Fog swallows [the pier][place-pier] before dawn.' },
      ],
    })

    expect(candidates).toEqual([])
  })

  it('caps a long beat logline used as the new-cast description', () => {
    const candidates = collectCastCandidates({
      beatPayloads: [{ logline: LONG_LOGLINE, charactersInvolved: ['Vera'] }],
    })

    expect(candidates[0]?.description.length).toBe(NEW_CAST_DESCRIPTION_MAX_LENGTH)
    expect(LONG_LOGLINE.length).toBeGreaterThan(NEW_CAST_DESCRIPTION_MAX_LENGTH)
  })

  it('reads a character chip from the beat logline itself', () => {
    const candidates = collectCastCandidates({
      beatPayloads: [
        {
          logline: '[Vera][char-vera] signs the year in advance.',
        },
      ],
    })

    expect(candidates).toEqual([
      { name: 'Vera', description: 'Vera signs the year in advance.' },
    ])
  })
})

describe('newCastMembers', () => {
  it('returns nobody when every candidate is already known', () => {
    const additions = newCastMembers(
      [{ name: 'Vera', description: VERA_LOGLINE }],
      ['vera'],
    )

    expect(additions).toEqual([])
  })
})
