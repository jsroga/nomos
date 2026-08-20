import { describe, expect, it } from 'vitest'
import { JsonField } from '@/shared/data/constants/protocol'
import { readSaveImageResponseUrl } from '../world-data.api'

describe('readSaveImageResponseUrl', () => {
  it('reads the url field from a save-image response', () => {
    expect(
      readSaveImageResponseUrl({ [JsonField.Url]: 'https://blob.example/assets/cutout.png' }),
    ).toBe('https://blob.example/assets/cutout.png')
  })

  it('returns undefined when url is missing', () => {
    expect(readSaveImageResponseUrl({ path: '/projects/p/assets/a.png' })).toBeUndefined()
  })
})
