import { describe, expect, it } from 'vitest'
import { DB_COLUMN } from '@/shared/data/constants/db-tables'
import { parseProjectStyleSettings } from '../settings.api'

const PRESET_SREF = 'https://example.test/2d-canvas/mj-sref/painted-isometric/1.webp'
const CUSTOM_BLOB = 'https://blob.example.test/style-refs/custom.png'

describe('parseProjectStyleSettings', () => {
  it('keeps string style-reference URLs from camelCase jsonb', () => {
    const parsed = parseProjectStyleSettings({
      styleReferenceUrls: [PRESET_SREF, CUSTOM_BLOB],
    })
    expect(parsed.styleReferenceUrls).toEqual([PRESET_SREF, CUSTOM_BLOB])
  })

  it('keeps string style-reference URLs from snake_case jsonb', () => {
    const parsed = parseProjectStyleSettings({
      [DB_COLUMN.STYLE_REFERENCE_URLS]: [PRESET_SREF],
    })
    expect(parsed.styleReferenceUrls).toEqual([PRESET_SREF])
  })

  it('drops non-string entries instead of emptying the list', () => {
    const parsed = parseProjectStyleSettings({
      styleReferenceUrls: [PRESET_SREF, 12, { url: CUSTOM_BLOB }, CUSTOM_BLOB],
    })
    expect(parsed.styleReferenceUrls).toEqual([PRESET_SREF, CUSTOM_BLOB])
  })
})
