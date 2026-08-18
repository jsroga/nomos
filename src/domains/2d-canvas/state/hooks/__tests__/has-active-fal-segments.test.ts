import { describe, expect, it } from 'vitest'
import { hasActiveFalSegments } from '../has-active-fal-segments'

const BOUNDS = { x: 0, y: 0, width: 64, height: 64 }

describe('hasActiveFalSegments', () => {
  it('is true when a live FAL mask is present', () => {
    expect(hasActiveFalSegments([], { imageUrl: 'https://cdn.example.com/mask.png' })).toBe(true)
  })

  it('is true when a saved asset has segment bounds', () => {
    expect(hasActiveFalSegments([{ metadata: { bounds: BOUNDS } }], null)).toBe(true)
  })

  it('is false when there is no live mask and no bounded assets', () => {
    expect(hasActiveFalSegments([{ metadata: {} }], { imageUrl: '' })).toBe(false)
    expect(hasActiveFalSegments([], null)).toBe(false)
  })
})
