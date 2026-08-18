import { describe, expect, it } from 'vitest'
import { beatCreateArgKey, mergePendingBeatArgs } from '../pending-beat-adds'

const LOGLINE_A = 'A body ages overnight.'
const LOGLINE_B = 'She opens the ledger.'

describe('beatCreateArgKey', () => {
  it('keys by logline and sequence', () => {
    expect(
      beatCreateArgKey({
        sequence: 2,
        data: { logline: LOGLINE_A },
      }),
    ).toBe(`${LOGLINE_A}:2`)
  })
})

describe('mergePendingBeatArgs', () => {
  it('appends unseen creates and skips duplicates', () => {
    const first = { sequence: 1, data: { logline: LOGLINE_A } }
    const duplicate = { sequence: 1, data: { logline: LOGLINE_A } }
    const second = { sequence: 2, data: { logline: LOGLINE_B } }

    const merged = mergePendingBeatArgs([first], [duplicate, second])

    expect(merged).toEqual([first, second])
  })
})
