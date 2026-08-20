import { describe, expect, it } from 'vitest'
import { shouldShowSelectModeToolbar } from '../should-show-select-mode-toolbar'

describe('shouldShowSelectModeToolbar', () => {
  it('is hidden while the select popover is asking what to select', () => {
    expect(
      shouldShowSelectModeToolbar({
        isSelectMode: true,
        isSegmenting: false,
        hasMask: false,
      }),
    ).toBe(false)
  })

  it('is visible while segmenting', () => {
    expect(
      shouldShowSelectModeToolbar({
        isSelectMode: true,
        isSegmenting: true,
        hasMask: false,
      }),
    ).toBe(true)
  })

  it('is visible when a mask is ready to save', () => {
    expect(
      shouldShowSelectModeToolbar({
        isSelectMode: true,
        isSegmenting: false,
        hasMask: true,
      }),
    ).toBe(true)
  })

  it('is hidden when select mode is off', () => {
    expect(
      shouldShowSelectModeToolbar({
        isSelectMode: false,
        isSegmenting: true,
        hasMask: true,
      }),
    ).toBe(false)
  })
})
