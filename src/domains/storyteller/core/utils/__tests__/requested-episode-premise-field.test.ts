import { describe, expect, it } from 'vitest'
import {
  EpisodePremiseWriteField,
  narrowPremiseRecord,
  requestedEpisodePremiseField,
} from '../requested-episode-premise-field'

describe('requestedEpisodePremiseField', () => {
  it('treats generate episode description as logline-only', () => {
    expect(requestedEpisodePremiseField('generate episode description')).toBe(
      EpisodePremiseWriteField.Logline,
    )
  })

  it('treats regenerate-only-logline as logline-only', () => {
    expect(
      requestedEpisodePremiseField('Please regenerate only the logline of the episode premise.'),
    ).toBe(EpisodePremiseWriteField.Logline)
  })

  it('leaves a full Ozymandias premise request unscoped', () => {
    expect(
      requestedEpisodePremiseField('Generate an episode premise using the Ozymandias framework.'),
    ).toBeUndefined()
  })
})

describe('narrowPremiseRecord', () => {
  it('keeps only the requested field', () => {
    expect(
      narrowPremiseRecord(
        { logline: 'A body ages.', fatalFlaw: 'Trusts the ledger.' },
        EpisodePremiseWriteField.Logline,
      ),
    ).toEqual({ logline: 'A body ages.' })
  })
})
