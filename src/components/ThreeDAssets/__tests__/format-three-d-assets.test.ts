import { describe, expect, it } from 'vitest'
import { fileStem, formatUploadingLabel, ThreeDAssetsCopy } from '../constants/three-d-assets'

describe('fileStem', () => {
  it('strips the extension from a basename', () => {
    expect(fileStem('chapel_ruin.png')).toBe('chapel_ruin')
  })

  it('uses the last path segment', () => {
    expect(fileStem('assets/chapel_ruin.glb')).toBe('chapel_ruin')
  })

  it('keeps names without an extension', () => {
    expect(fileStem('chapel_ruin')).toBe('chapel_ruin')
  })
})

describe('formatUploadingLabel', () => {
  it('formats the in-flight header', () => {
    expect(formatUploadingLabel(1, 2)).toBe(
      `${ThreeDAssetsCopy.Uploading} 1 ${ThreeDAssetsCopy.Of} 2`,
    )
  })
})
