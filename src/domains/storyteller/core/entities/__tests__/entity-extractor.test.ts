import { describe, expect, it } from 'vitest'
import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import { extractEntitiesFromPlan } from '@/domains/storyteller/core/entities/entity-extractor'
import { createRefId } from '@/domains/storyteller/core/entities/reference-parser'

const PROJECT_ID = '9b80467c-18b5-4570-9b32-d66f86d71986'
const FIXED_NOW = new Date('2026-09-06T16:10:00.000Z')

describe('extractEntitiesFromPlan', () => {
  it('skips factions and characters with no name so RichText cannot crash', () => {
    const namedFaction = 'Bottlers Guild'
    const map = extractEntitiesFromPlan(
      {
        factions: [
          { name: namedFaction, description: 'Controls the taps.' },
          { description: 'Nameless row from a partial bible.' },
          { name: '   ' },
        ],
        keyCharacters: [
          { role: 'hunter' },
          { name: 'Sera Voss', role: 'debt collector' },
        ],
      },
      PROJECT_ID,
      () => FIXED_NOW,
    )

    expect(map.size).toBe(2)
    expect(map.has(createRefId(StoryEntityType.Faction, 'bottlers-guild'))).toBe(true)
    expect(map.has(createRefId(StoryEntityType.Character, 'sera-voss'))).toBe(true)
  })
})
