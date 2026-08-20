import { describe, expect, it } from 'vitest'
import { UrlScheme } from '@/shared/data/constants/protocol'
import { portraitGenCompleteUpdates } from '../character-creation-dialog-portrait'

const IMAGE_URL = `${UrlScheme.Https}://blob.example/portrait.png`

describe('portraitGenCompleteUpdates', () => {
  it('keeps a durable completed URL so reopen can hydrate after the dialog resets', () => {
    expect(portraitGenCompleteUpdates(IMAGE_URL, false)).toEqual({
      isGenerating: false,
      gridImageUrl: null,
      needsVariantPick: false,
      portraitUrlOverride: IMAGE_URL,
      completedPortraitUrl: IMAGE_URL,
    })
  })

  it('keeps the grid URL when the job still needs a variant pick', () => {
    expect(portraitGenCompleteUpdates(IMAGE_URL, true).gridImageUrl).toBe(IMAGE_URL)
    expect(portraitGenCompleteUpdates(IMAGE_URL, true).needsVariantPick).toBe(true)
  })
})
