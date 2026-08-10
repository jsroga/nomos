import { describe, expect, it } from 'vitest'
import {
  extractInspirations,
  hasExtractedInspirations,
} from '../extract-inspirations'

const SAMPLE = `
Here are brand-new inspirations:

🎬 MOVIES
1. The Third Man (1949) — Carol Reed's noir masterpiece set in post-war Vienna.
2. High and Low (1963) — Akira Kurosawa's ransom thriller.

📚 BOOKS
4. The City & the City by China Miéville — Two cities occupy the same physical space.
5. The Windup Girl by Paolo Bacigalupi — Environmental collapse drives a brutal calorie economy.

🎮 GAMES
7. Pathologic 2 — A surreal plague-town simulator.
8. Sunless Sea — A gothic nautical exploration game.
`

describe('extractInspirations', () => {
  it('splits items by MOVIES / BOOKS / GAMES headers only', () => {
    const extracted = extractInspirations(SAMPLE)
    expect(extracted.movies).toEqual([
      {
        title: 'The Third Man (1949)',
        description: 'Carol Reed\'s noir masterpiece set in post-war Vienna.',
      },
      {
        title: 'High and Low (1963)',
        description: 'Akira Kurosawa\'s ransom thriller.',
      },
    ])
    expect(extracted.books).toHaveLength(2)
    expect(extracted.books[0]?.title).toBe('The City & the City by China Miéville')
    expect(extracted.games).toHaveLength(2)
    expect(extracted.games[0]?.title).toBe('Pathologic 2')
    expect(hasExtractedInspirations(extracted)).toBe(true)
  })

  it('returns empty buckets when there are no section headers', () => {
    const extracted = extractInspirations('1. Some Title — a description without a header.')
    expect(extracted).toEqual({ books: [], movies: [], games: [] })
    expect(hasExtractedInspirations(extracted)).toBe(false)
  })
})
