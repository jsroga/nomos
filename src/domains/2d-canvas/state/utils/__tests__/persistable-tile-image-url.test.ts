import { describe, expect, it } from 'vitest'
import { persistableTileImageUrl } from '../persistable-tile-image-url'

describe('persistableTileImageUrl', () => {
  it('strips review cache-bust t= while keeping other query params', () => {
    expect(persistableTileImageUrl('https://cdn.example.com/tile.png?t=99')).toBe(
      'https://cdn.example.com/tile.png',
    )
    expect(persistableTileImageUrl('https://cdn.example.com/tile.png?v=1&t=99')).toBe(
      'https://cdn.example.com/tile.png?v=1',
    )
  })

  it('leaves URLs without a cache-bust param unchanged', () => {
    expect(persistableTileImageUrl('https://cdn.example.com/tile.png')).toBe(
      'https://cdn.example.com/tile.png',
    )
  })
})
