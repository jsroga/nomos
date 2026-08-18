import { describe, expect, it } from 'vitest'
import {
  isAssetOverlayVisible,
  nextAssetOverlayEyeToggle,
} from '../asset-overlay-visibility'

describe('isAssetOverlayVisible', () => {
  it('is true when all masks are on or a preview is selected', () => {
    expect(isAssetOverlayVisible(true, null)).toBe(true)
    expect(isAssetOverlayVisible(false, 'asset-1')).toBe(true)
    expect(isAssetOverlayVisible(false, null)).toBe(false)
  })
})

describe('nextAssetOverlayEyeToggle', () => {
  it('hides a thumbnail preview the same way clicking the image does', () => {
    expect(nextAssetOverlayEyeToggle(false, 'asset-1')).toEqual({
      showAllAssetMasks: false,
      previewAssetId: null,
    })
  })

  it('hides all-masks and any preview together', () => {
    expect(nextAssetOverlayEyeToggle(true, 'asset-1')).toEqual({
      showAllAssetMasks: false,
      previewAssetId: null,
    })
  })

  it('shows all masks when nothing is visible', () => {
    expect(nextAssetOverlayEyeToggle(false, null)).toEqual({
      showAllAssetMasks: true,
      previewAssetId: null,
    })
  })
})
