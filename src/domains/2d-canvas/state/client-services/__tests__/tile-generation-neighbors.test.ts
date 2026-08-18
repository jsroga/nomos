import { describe, expect, it } from 'vitest'
import { buildNeighborUrls } from '../tile-generation-neighbors'
import type { Tile } from '@/shared/data/world-tile'

const PNG = 'https://cdn.example.com/tile.png'

function tile(): Tile {
  return {
    id: 't',
    project_id: 'p',
    x: 0,
    y: 0,
    tile_prompt: null,
    image_filename: PNG,
    created_at: '',
  }
}

describe('buildNeighborUrls hasNeighbors', () => {
  it('is true for a diagonal-only neighbor', () => {
    const { neighborUrls, hasNeighbors } = buildNeighborUrls('p', 1, -1, {
      '0,0': tile(),
    })
    expect(hasNeighbors).toBe(true)
    expect(neighborUrls.bottomLeft).toBe(PNG)
    expect(neighborUrls.left).toBeUndefined()
    expect(neighborUrls.down).toBeUndefined()
  })

  it('is false when the eight-neighborhood is empty', () => {
    const { hasNeighbors } = buildNeighborUrls('p', 1, -1, {
      '3,3': tile(),
    })
    expect(hasNeighbors).toBe(false)
  })
})
