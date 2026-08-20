import { describe, expect, it } from 'vitest'
import {
  isMoodboardDbWriteConfirmed,
  mergeSeriesBibleMoodImages,
} from '../generate-moodboard-db'

const STORED_A = 'https://cdn.example/a.png'
const STORED_B = 'https://cdn.example/b.png'

describe('mergeSeriesBibleMoodImages', () => {
  it('replaces mood images on a full generate', () => {
    const next = mergeSeriesBibleMoodImages(
      { title: 'World', moodImages: ['https://cdn.example/a.png'] },
      ['https://cdn.example/b.png'],
    )
    expect(next.title).toBe('World')
    expect(next.moodImages).toEqual(['https://cdn.example/b.png'])
  })

  it('does not duplicate when the same urls are persisted twice', () => {
    const first = mergeSeriesBibleMoodImages({ moodImages: [] }, [
      'https://cdn.example/a.png',
      'https://cdn.example/b.png',
      'https://cdn.example/c.png',
    ])
    const second = mergeSeriesBibleMoodImages(first, [
      'https://cdn.example/a.png',
      'https://cdn.example/b.png',
      'https://cdn.example/c.png',
    ])
    expect(second.moodImages).toEqual([
      'https://cdn.example/a.png',
      'https://cdn.example/b.png',
      'https://cdn.example/c.png',
    ])
  })

  it('replaces a single slot', () => {
    const next = mergeSeriesBibleMoodImages(
      { moodImages: ['a', 'b', 'c'] },
      ['https://cdn.example/new.png'],
      1,
    )
    expect(next.moodImages).toEqual(['a', 'https://cdn.example/new.png', 'c'])
  })
})

describe('isMoodboardDbWriteConfirmed', () => {
  it('confirms a full board write', () => {
    expect(
      isMoodboardDbWriteConfirmed({ moodImages: [STORED_A, STORED_B] }, [STORED_A, STORED_B]),
    ).toBe(true)
  })

  it('confirms a replaced slot', () => {
    expect(
      isMoodboardDbWriteConfirmed({ moodImages: [STORED_A, STORED_B] }, [STORED_B], 1),
    ).toBe(true)
  })

  it('rejects a missing or mismatched row', () => {
    expect(isMoodboardDbWriteConfirmed(null, [STORED_A])).toBe(false)
    expect(isMoodboardDbWriteConfirmed({ moodImages: [STORED_A] }, [STORED_B])).toBe(false)
  })
})
