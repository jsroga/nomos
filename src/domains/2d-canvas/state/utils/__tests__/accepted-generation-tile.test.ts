import { describe, expect, it } from 'vitest'
import { tileAfterGenerationAccept } from '../accepted-generation-tile'
import type { Tile } from '../../../core/world-types'
import type { WorldTile } from '../../../core/io/world.dto'

const EXISTING: Tile = {
  id: 'tile-old',
  project_id: 'proj-1',
  x: 1,
  y: 0,
  tile_prompt: 'keep this prompt',
  image_filename: null,
  created_at: '2026-01-01T00:00:00.000Z',
}

const PERSISTED: WorldTile = {
  id: 'tile-db',
  projectId: 'proj-1',
  x: 1,
  y: 0,
  tilePrompt: '',
  imageFilename: null,
  createdAt: '2026-09-11T12:00:00.000Z',
}

const GENERATED_URL = 'https://cdn.example.com/tiles/proj-1/1_0_9.png'

describe('tileAfterGenerationAccept', () => {
  it('keeps the generated URL when the API omits imageFilename', () => {
    const tile = tileAfterGenerationAccept({
      existing: EXISTING,
      persisted: PERSISTED,
      projectId: 'proj-1',
      x: 1,
      y: 0,
      imageUrl: GENERATED_URL,
    })
    expect(tile.image_filename).toBe(GENERATED_URL)
    expect(tile.tile_prompt).toBe('keep this prompt')
    expect(tile.id).toBe('tile-db')
  })

  it('writes an optimistic tile before the API returns', () => {
    const tile = tileAfterGenerationAccept({
      existing: undefined,
      persisted: null,
      projectId: 'proj-1',
      x: 2,
      y: -1,
      imageUrl: GENERATED_URL,
    })
    expect(tile.image_filename).toBe(GENERATED_URL)
    expect(tile.x).toBe(2)
    expect(tile.y).toBe(-1)
    expect(tile.project_id).toBe('proj-1')
  })
})
