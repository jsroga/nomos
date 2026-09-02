import { describe, expect, it } from 'vitest'
import { nextSequenceAfter } from '../beat-sequence'

describe('nextSequenceAfter', () => {
  it('starts at 1 when the episode has no beats', () => {
    expect(nextSequenceAfter(null)).toBe(1)
    expect(nextSequenceAfter(undefined)).toBe(1)
  })

  it('increments the current max', () => {
    expect(nextSequenceAfter(3)).toBe(4)
  })
})
