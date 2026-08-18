import { describe, expect, it } from 'vitest'
import {
  episodeDisplayOrdinal,
  episodeSortRank,
  sortEpisodesForDisplay,
} from '../episode-list'

describe('sortEpisodesForDisplay', () => {
  it('orders by sequence then id, and missing sequence last', () => {
    const sorted = sortEpisodesForDisplay([
      { id: 'b', sequence: 1 },
      { id: 'a', sequence: 1 },
      { id: 'c', sequence: null },
      { id: 'd', sequence: 2 },
    ])
    expect(sorted.map(episode => episode.id)).toEqual(['a', 'b', 'd', 'c'])
  })
})

describe('episodeDisplayOrdinal', () => {
  it('returns 1-based index after sort order', () => {
    const episodes = sortEpisodesForDisplay([
      { id: 'b', sequence: 1 },
      { id: 'a', sequence: 1 },
    ])
    expect(episodeDisplayOrdinal(episodes, 'a')).toBe(1)
    expect(episodeDisplayOrdinal(episodes, 'b')).toBe(2)
    expect(episodeDisplayOrdinal(episodes, null)).toBe(1)
  })
})

describe('episodeSortRank', () => {
  it('ranks missing sequence after real ones', () => {
    expect(episodeSortRank(1)).toBeLessThan(episodeSortRank(null))
    expect(episodeSortRank(0)).toBe(episodeSortRank(undefined))
  })
})
