import { describe, expect, it } from 'vitest'
import { SELECT_MODE_TOOLBAR_COPY } from '../../constants/select-mode-toolbar'
import { requireSavedAssetImageUrl } from '../select-mode-save-asset-url'

describe('requireSavedAssetImageUrl', () => {
  it('returns a public https URL for the assets insert', () => {
    const url = 'https://abc.public.blob.vercel-storage.com/assets/p/cutout.png'
    expect(requireSavedAssetImageUrl(url)).toBe(url)
  })

  it('rejects a local basename', () => {
    expect(() => requireSavedAssetImageUrl('asset_1.png')).toThrow(
      SELECT_MODE_TOOLBAR_COPY.FAILED_SAVE_ASSET_IMAGE,
    )
  })

  it('rejects a missing url', () => {
    expect(() => requireSavedAssetImageUrl(undefined)).toThrow(
      SELECT_MODE_TOOLBAR_COPY.FAILED_SAVE_ASSET_IMAGE,
    )
  })
})
