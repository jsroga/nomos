import { isValidElement } from 'react'
import { describe, expect, it } from 'vitest'
import type { Tile } from '@/domains/2d-canvas/core/world-types'
import {
  collectNeighborKeys,
  renderWorldCanvasTiles,
  worldCanvasTileKey,
} from '../world-canvas-tiles'

const ORIGIN: Tile = {
  id: 'tile-0-0',
  project_id: 'proj-1',
  x: 0,
  y: 0,
  tile_prompt: 'origin',
  image_filename: 'https://cdn.example.com/0_0.png',
  created_at: '2026-01-01T00:00:00.000Z',
}

const EAST: Tile = {
  ...ORIGIN,
  id: 'tile-1-0',
  x: 1,
  y: 0,
  image_filename: 'https://cdn.example.com/1_0.png',
}

function nodeKeys(tiles: Record<string, Tile>): string[] {
  return renderWorldCanvasTiles(tiles).flatMap(node => {
    if (!isValidElement(node) || node.key === null) return []
    return [String(node.key)]
  })
}

describe('world canvas tile keys', () => {
  it('uses the same coord key for empty neighbors and filled tiles', () => {
    const keys = nodeKeys({ '0,0': ORIGIN })
    expect(keys).toContain(worldCanvasTileKey(0, 0))
    expect(keys).toContain(worldCanvasTileKey(1, 0))
    expect(keys.some(key => key.startsWith('empty-'))).toBe(false)
  })

  it('does not keep an empty overlay after the neighbor is filled', () => {
    const before = collectNeighborKeys({ '0,0': ORIGIN })
    expect(before.has(worldCanvasTileKey(1, 0))).toBe(true)

    const afterKeys = nodeKeys({ '0,0': ORIGIN, '1,0': EAST })
    expect(afterKeys.filter(key => key === worldCanvasTileKey(1, 0))).toHaveLength(1)
    expect(collectNeighborKeys({ '0,0': ORIGIN, '1,0': EAST }).has(worldCanvasTileKey(1, 0))).toBe(
      false,
    )
  })
})
