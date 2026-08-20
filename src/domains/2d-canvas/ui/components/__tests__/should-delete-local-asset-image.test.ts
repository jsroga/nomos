import { describe, expect, it } from 'vitest'
import { shouldDeleteLocalAssetImage } from '../should-delete-local-asset-image'

describe('shouldDeleteLocalAssetImage', () => {
  it('skips local delete for a public Blob URL', () => {
    expect(
      shouldDeleteLocalAssetImage(
        'https://abc.public.blob.vercel-storage.com/assets/p/cutout.png',
      ),
    ).toBe(false)
  })

  it('deletes local files for a basename', () => {
    expect(shouldDeleteLocalAssetImage('asset_1.png')).toBe(true)
  })
})
