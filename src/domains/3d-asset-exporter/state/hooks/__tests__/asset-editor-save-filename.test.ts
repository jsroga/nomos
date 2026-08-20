import { describe, expect, it } from 'vitest'
import { assetEditorSaveFilename } from '../asset-editor-save-filename'

describe('assetEditorSaveFilename', () => {
  it('does not concatenate a Blob URL under assets/', () => {
    expect(
      assetEditorSaveFilename(
        'https://abc.public.blob.vercel-storage.com/assets/proj/cutout.png',
      ),
    ).toBe('assets/cutout.png')
  })

  it('prefixes a local basename', () => {
    expect(assetEditorSaveFilename('asset_1.png')).toBe('assets/asset_1.png')
  })

  it('does not double-prefix an assets/ path', () => {
    expect(assetEditorSaveFilename('assets/asset_1.png')).toBe('assets/asset_1.png')
  })
})
