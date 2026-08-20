import { describe, expect, it } from 'vitest'
import { FsDirectory } from '@/shared/data/constants/protocol'
import {
  decodeSaveImageBuffer,
  isAssetsSaveFilename,
  localProjectImagePath,
  SaveImageDecodeKind,
} from '../save-image-persist'

describe('save-image-persist', () => {
  it('treats assets/ paths as Blob persist targets', () => {
    expect(isAssetsSaveFilename(`${FsDirectory.Assets}/cutout.png`)).toBe(true)
    expect(isAssetsSaveFilename('0_0_1.png')).toBe(false)
  })

  it('builds the local project path for tile saves', () => {
    expect(localProjectImagePath('proj', '0_0_1.png')).toBe('/projects/proj/0_0_1.png')
  })

  it('decodes a data URI into a buffer', () => {
    const decoded = decodeSaveImageBuffer('data:image/png;base64,AA==')
    expect(decoded.ok).toBe(true)
    if (decoded.ok) {
      expect(decoded.buffer.length).toBeGreaterThan(0)
    }
  })

  it('flags empty image data', () => {
    const decoded = decodeSaveImageBuffer('')
    expect(decoded).toEqual({ ok: false, kind: SaveImageDecodeKind.Empty })
  })
})
