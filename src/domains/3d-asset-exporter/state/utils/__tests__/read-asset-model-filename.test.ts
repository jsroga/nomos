import { describe, expect, it } from 'vitest'
import { readAssetModelFilename } from '../read-asset-model-filename'

describe('readAssetModelFilename', () => {
  it('prefers snake_case from the world store', () => {
    expect(
      readAssetModelFilename({
        model_filename: 'https://blob.example/a.glb',
        modelFilename: 'ignored.glb',
      }),
    ).toBe('https://blob.example/a.glb')
  })

  it('reads camelCase from the GET asset route', () => {
    expect(readAssetModelFilename({ modelFilename: 'https://blob.example/b.glb' })).toBe(
      'https://blob.example/b.glb',
    )
  })
})
