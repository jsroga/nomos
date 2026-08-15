import { describe, expect, it } from 'vitest'
import { shouldPersistStyleAnchor } from '../persist-style-anchor'

describe('shouldPersistStyleAnchor', () => {
  it('persists only on first-tile accept when the field is empty', () => {
    expect(shouldPersistStyleAnchor(true, null)).toBe(true)
    expect(shouldPersistStyleAnchor(true, undefined)).toBe(true)
    expect(shouldPersistStyleAnchor(true, '')).toBe(true)
    expect(shouldPersistStyleAnchor(true, 'https://cdn.example.com/anchor.png')).toBe(false)
    expect(shouldPersistStyleAnchor(false, null)).toBe(false)
  })
})
