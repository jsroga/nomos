import { describe, expect, it } from 'vitest'
import { UrlScheme } from '@/shared/data/constants/protocol'
import { isPortraitDbWriteConfirmed } from '../persist-character-portrait-db'
import { GeneratePortraitColumn } from '../constants/generate-portrait-wire'

const STORED_URL = `${UrlScheme.Https}://blob.example/portrait.png`

describe('isPortraitDbWriteConfirmed', () => {
  it('accepts the written portrait_url', () => {
    expect(
      isPortraitDbWriteConfirmed(
        { [GeneratePortraitColumn.PortraitUrl]: STORED_URL },
        STORED_URL,
      ),
    ).toBe(true)
  })

  it('rejects a missing or mismatched row', () => {
    expect(isPortraitDbWriteConfirmed(null, STORED_URL)).toBe(false)
    expect(
      isPortraitDbWriteConfirmed(
        { [GeneratePortraitColumn.PortraitUrl]: `${UrlScheme.Https}://blob.example/other.png` },
        STORED_URL,
      ),
    ).toBe(false)
  })
})
