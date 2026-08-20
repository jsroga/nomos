import { describe, expect, it } from 'vitest'
import {
  factionCardFromUnknown,
  factionTileCopy,
  type FactionCardData,
} from '../faction-card-helpers'

const KEEPERS = 'Keepers'
const KEEPERS_DESC = 'They tally every death in the city.'

function faction(overrides: Partial<FactionCardData> = {}): FactionCardData {
  return {
    name: KEEPERS,
    description: KEEPERS_DESC,
    ideology: 'Count what remains.',
    goals: ['Balance the books'],
    resources: 'Ledgers',
    politicalForces: '',
    weaknesses: '',
    rivals: [],
    ...overrides,
  }
}

describe('factionTileCopy', () => {
  it('keeps a short name and the description', () => {
    expect(factionTileCopy(faction({ name: 'Glass Choir' }))).toEqual({
      title: 'Glass Choir',
      description: KEEPERS_DESC,
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

describe('factionCardFromUnknown', () => {
  it('keeps name and description without ideology', () => {
    const card = factionCardFromUnknown({ name: KEEPERS, description: KEEPERS_DESC })
    expect(card).not.toBeNull()
    expect(card?.name).toBe(KEEPERS)
    expect(card?.description).toBe(KEEPERS_DESC)
    expect(card?.ideology).toBe('')
  })

  it('returns null when name is missing', () => {
    expect(factionCardFromUnknown({ description: KEEPERS_DESC })).toBeNull()
    expect(factionCardFromUnknown({ name: '  ' })).toBeNull()
  })
})
