import { describe, expect, it } from 'vitest'
import { bibleDisplayInspirations } from '../bible-inspiration-normalize'

const BOOKS = { books: [{ title: 'Dune', description: 'Sand.' }], movies: [], games: [] }
const EMPTY = { books: [], movies: [], games: [] }

describe('bibleDisplayInspirations', () => {
  it('falls back to saved inspirations when local buckets are empty', () => {
    expect(bibleDisplayInspirations(EMPTY, BOOKS, false)).toEqual(BOOKS)
  })

  it('keeps the empty local draft while editing', () => {
    expect(bibleDisplayInspirations(EMPTY, BOOKS, true)).toEqual(EMPTY)
  })
})
