import { describe, expect, it } from 'vitest'
import {
  ASSET_UPLOAD_MAX_BYTES,
  AssetKind,
  AssetUploadReject,
  assetKindFromFileName,
  validateAssetUploadFile,
} from '../asset-upload'

function fileNamed(name: string, size = 4): File {
  const file = new File(['x'], name, { type: 'application/octet-stream' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('validateAssetUploadFile', () => {
  it('accepts a png under the size cap', () => {
    expect(validateAssetUploadFile(fileNamed('chapel.png'))).toBeNull()
  })

  it('rejects an unsupported extension', () => {
    expect(validateAssetUploadFile(fileNamed('notes.txt'))).toBe(AssetUploadReject.Format)
  })

  it('rejects a file over 50MB', () => {
    expect(validateAssetUploadFile(fileNamed('huge.png', ASSET_UPLOAD_MAX_BYTES + 1))).toBe(
      AssetUploadReject.Size,
    )
  })
})

describe('assetKindFromFileName', () => {
  it('marks models as 3D and images as 2D', () => {
    expect(assetKindFromFileName('prop.glb')).toBe(AssetKind.ThreeD)
    expect(assetKindFromFileName('prop.png')).toBe(AssetKind.TwoD)
  })
})
