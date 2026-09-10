import { describe, expect, it } from 'vitest'
import { isFixInconsistenciesStartDisabled } from '../storyteller-sidebar-footer'

describe('Fix inconsistencies footer gate', () => {
  it('disables the button when there is no bible', () => {
    expect(isFixInconsistenciesStartDisabled(false, false)).toBe(true)
  })

  it('disables the button while chat is busy', () => {
    expect(isFixInconsistenciesStartDisabled(true, true)).toBe(true)
  })

  it('allows a click to start the run when idle with a bible', () => {
    expect(isFixInconsistenciesStartDisabled(true, false)).toBe(false)
  })
})
