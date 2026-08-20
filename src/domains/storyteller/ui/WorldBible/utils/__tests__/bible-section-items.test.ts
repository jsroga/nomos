import { describe, expect, it } from 'vitest'
import { bibleSectionItems } from '../bible-section-items'

const TRACK = { title: 'Theme', artist: 'A', youtubeUrl: 'https://youtu.be/abc' }

describe('bibleSectionItems', () => {
  it('uses saved tracks when the local draft is an empty array', () => {
    expect(bibleSectionItems([TRACK], [TRACK], false)).toEqual([TRACK])
    expect(bibleSectionItems([], [TRACK], false)).toEqual([TRACK])
  })

  it('keeps an empty draft while editing', () => {
    expect(bibleSectionItems([], [TRACK], true)).toEqual([])
  })
})
