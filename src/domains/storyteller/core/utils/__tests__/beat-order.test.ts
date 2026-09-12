import { describe, expect, it } from 'vitest'
import {
  completeBeatOrder,
  nextSequenceAfter,
  parkedBeatSequence,
} from '../beat-order'

describe('nextSequenceAfter', () => {
  it('starts at 1 when the episode has no beats', () => {
    expect(nextSequenceAfter(null)).toBe(1)
    expect(nextSequenceAfter(undefined)).toBe(1)
  })

  it('increments the current max', () => {
    expect(nextSequenceAfter(3)).toBe(4)
  })
})

describe('parkedBeatSequence', () => {
  it('shifts sequence out of the 1..n range used on the board', () => {
    expect(parkedBeatSequence(1)).toBeGreaterThan(1)
    expect(parkedBeatSequence(2)).not.toBe(parkedBeatSequence(1))
  })
})

describe('completeBeatOrder', () => {
  it('keeps the requested order and appends missing episode beats', () => {
    expect(
      completeBeatOrder(['c', 'a'], [
        { id: 'a', sequence: 1 },
        { id: 'b', sequence: 2 },
        { id: 'c', sequence: 3 },
      ]),
    ).toEqual(['c', 'a', 'b'])
  })

  it('drops unknown ids and duplicates', () => {
    expect(
      completeBeatOrder(['x', 'a', 'a', 'b'], [
        { id: 'a', sequence: 1 },
        { id: 'b', sequence: 2 },
      ]),
    ).toEqual(['a', 'b'])
  })
})
