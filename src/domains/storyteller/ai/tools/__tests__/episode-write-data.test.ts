import { describe, expect, it } from 'vitest'
import { episodeWriteDataWithoutPremise } from '../episode-write-data'

describe('episodeWriteDataWithoutPremise', () => {
  it('keeps title and drops premise from the write payload', () => {
    expect(
      episodeWriteDataWithoutPremise({
        title: 'Pilot',
        premise: { logline: 'The ledger writes her name.' },
        storyPlan: { premise: { logline: 'Nested.' }, tone: 'cold' },
      }),
    ).toEqual({
      title: 'Pilot',
      storyPlan: { tone: 'cold' },
    })
  })

  it('omits storyPlan when it only held premise', () => {
    expect(
      episodeWriteDataWithoutPremise({
        title: 'Pilot',
        storyPlan: { premise: { logline: 'Only premise.' } },
      }),
    ).toEqual({ title: 'Pilot' })
  })
})
