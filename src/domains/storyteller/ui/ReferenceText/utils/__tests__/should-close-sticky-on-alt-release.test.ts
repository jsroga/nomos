import { describe, expect, it } from 'vitest'
import { shouldCloseStickyOnAltRelease } from '../should-close-sticky-on-alt-release'

describe('shouldCloseStickyOnAltRelease', () => {
  it('does not close when the tooltip first opens without Alt', () => {
    expect(shouldCloseStickyOnAltRelease(false, false, false)).toBe(false)
  })

  it('closes after Alt is released while not hovering the tooltip', () => {
    expect(shouldCloseStickyOnAltRelease(true, false, false)).toBe(true)
  })

  it('stays open after Alt release while the pointer is on the tooltip', () => {
    expect(shouldCloseStickyOnAltRelease(true, false, true)).toBe(false)
  })
})
