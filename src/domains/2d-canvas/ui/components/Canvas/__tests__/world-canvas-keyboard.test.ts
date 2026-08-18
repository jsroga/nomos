import { describe, expect, it } from 'vitest'
import { WorldCanvasToolShortcut } from '../constants/world-canvas'
import { isWorldCanvasSpaceRelease, worldCanvasEventKey } from '../world-canvas-keyboard'

describe('worldCanvasEventKey', () => {
  it('lowercases a defined key', () => {
    expect(worldCanvasEventKey('V')).toBe(WorldCanvasToolShortcut.Pan)
  })

  it('returns undefined when autocomplete omits key', () => {
    expect(worldCanvasEventKey(undefined)).toBeUndefined()
  })
})

describe('isWorldCanvasSpaceRelease', () => {
  it('ignores keyup with no key', () => {
    expect(isWorldCanvasSpaceRelease(undefined, false)).toBe(false)
  })

  it('ignores space while typing in the tile prompt', () => {
    expect(isWorldCanvasSpaceRelease(' ', true)).toBe(false)
  })

  it('releases pan on space outside fields', () => {
    expect(isWorldCanvasSpaceRelease(' ', false)).toBe(true)
  })
})
