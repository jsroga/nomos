import { describe, expect, it } from 'vitest'
import { nextWorldPromptIdeaImages } from '../worldPromptIdeas'
import { STYLE_REFERENCE_URL_MAX } from '@/shared/canvas/style-refs'

describe('nextWorldPromptIdeaImages', () => {
  it('returns a new set of style-ref images on each call', () => {
    const first = nextWorldPromptIdeaImages()
    const second = nextWorldPromptIdeaImages()
    expect(first).toHaveLength(STYLE_REFERENCE_URL_MAX)
    expect(second).toHaveLength(STYLE_REFERENCE_URL_MAX)
    expect(first.join(' ')).not.toBe(second.join(' '))
  })
})
