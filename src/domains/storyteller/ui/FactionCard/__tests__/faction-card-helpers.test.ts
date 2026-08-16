import { describe, expect, it } from 'vitest'
import type { Faction } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { factionTileCopy } from '../faction-card-helpers'

function faction(overrides: Partial<Faction>): Faction {
  return {
    name: 'Keepers',
    description: 'They tally every death in the city.',
    ideology: 'Count what remains.',
    goals: ['Balance the books'],
    resources: 'Ledgers',
    ...overrides,
  }
}

describe('factionTileCopy', () => {
  it('keeps a short name and the description', () => {
    expect(factionTileCopy(faction({ name: 'Glass Choir' }))).toEqual({
      title: 'Glass Choir',
      description: 'They tally every death in the city.',
    })
  })

  it('splits an em-dash title into name and description', () => {
    expect(
      factionTileCopy(
        faction({
          name: 'The Ledger Keepers — They tally every death.',
          description: 'Clerks in black ink.',
        })
      )
    ).toEqual({
      title: 'The Ledger Keepers',
      description: 'They tally every death. Clerks in black ink.',
    })
  })
})
