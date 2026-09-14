import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Tile } from '../../../core/world-types'
import { TileGenerationNonceKind } from '../../../constants/tile-generation-service'
import { TRIGGER_TASK_ID } from '@/shared/data/constants/api-errors'
import { tileGenerationNonceIntent } from '../../../core/io/world-gen-trigger.api'
import { restyleAllTiles, restyleableTiles, tilePublicImageUrl } from '../restyle-all-tiles'

const PROJECT = '11111111-1111-4111-8111-111111111111'

function tile(x: number, y: number, image: string | null): Tile {
  return {
    id: `tile-${x}-${y}`,
    project_id: PROJECT,
    x,
    y,
    tile_prompt: `scene ${x},${y}`,
    image_filename: image,
    created_at: '2026-09-14T00:00:00.000Z',
  }
}

describe('tileGenerationNonceIntent', () => {
  it('keeps generate intents stable and suffixes restyle per tile', () => {
    expect(
      tileGenerationNonceIntent({ projectId: PROJECT, x: 1, y: 2 }),
    ).toBe(`${TRIGGER_TASK_ID.GENERATE_TILE}:${PROJECT}:1,2`)
    expect(
      tileGenerationNonceIntent({
        projectId: PROJECT,
        x: 1,
        y: 2,
        restyleExistingTile: true,
      }),
    ).toBe(`${TRIGGER_TASK_ID.GENERATE_TILE}:${PROJECT}:1,2:${TileGenerationNonceKind.Restyle}`)
    expect(
      tileGenerationNonceIntent({
        projectId: PROJECT,
        x: 3,
        y: 4,
        restyleExistingTile: true,
      }),
    ).not.toBe(
      tileGenerationNonceIntent({
        projectId: PROJECT,
        x: 1,
        y: 2,
        restyleExistingTile: true,
      }),
    )
  })
})

describe('restyleAllTiles', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts every tile before any restyle settles', async () => {
    const started: string[] = []
    const tiles = [tile(0, 0, 'https://cdn.example.com/a.png'), tile(1, 0, 'https://cdn.example.com/b.png'), tile(0, 1, 'https://cdn.example.com/c.png')]
    const restyleOne = vi.fn(async (item: Tile) => {
      started.push(`${item.x},${item.y}`)
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })

    const pending = restyleAllTiles({ tiles, restyleOne })
    await Promise.resolve()
    expect(started).toEqual(['0,0', '1,0', '0,1'])
    expect(restyleOne).toHaveBeenCalledTimes(3)
    await vi.runAllTimersAsync()
    await expect(pending).resolves.toEqual({ started: 3, failed: 0 })
  })

  it('counts a rejected tile without cancelling the others', async () => {
    const tiles = [tile(0, 0, 'a.png'), tile(1, 0, 'b.png')]
    const restyleOne = vi.fn(async (item: Tile) => {
      if (item.x === 0) throw new Error('failed')
    })
    await expect(restyleAllTiles({ tiles, restyleOne })).resolves.toEqual({
      started: 1,
      failed: 1,
    })
  })
})

describe('restyleableTiles', () => {
  it('skips tiles without an image', () => {
    const tiles = {
      '0,0': tile(0, 0, 'https://cdn.example.com/a.png'),
      '1,0': tile(1, 0, null),
    }
    expect(restyleableTiles(tiles).map(item => item.id)).toEqual(['tile-0-0'])
  })
})

describe('tilePublicImageUrl', () => {
  it('keeps absolute URLs and prefixes stored filenames', () => {
    expect(tilePublicImageUrl(tile(0, 0, 'https://cdn.example.com/a.png'))).toBe(
      'https://cdn.example.com/a.png',
    )
    expect(tilePublicImageUrl(tile(1, 1, 'tiles/1_1.png'))).toBe(`/projects/${PROJECT}/tiles/1_1.png`)
    expect(tilePublicImageUrl(tile(2, 2, null))).toBeUndefined()
  })
})
