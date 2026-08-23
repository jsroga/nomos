import { beforeEach, describe, expect, it } from 'vitest'
import { handleTileGenCompletion } from '../tile-generation-completion'
import { useWorldStore } from '../../useWorldStore'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import type { TileGenRunState } from '../tile-generation-run-types'
import { AsyncOperationStatus } from '../../../constants/tile-generation-service'

const storageMap = new Map<string, string>()
if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: {
      localStorage: {
        getItem: (key: string) => storageMap.get(key) ?? null,
        setItem: (key: string, val: string) => storageMap.set(key, val),
        removeItem: (key: string) => storageMap.delete(key),
        clear: () => storageMap.clear(),
      },
    },
    writable: true,
  })
}

describe('tile-generation-completion', () => {
  const sampleRun: TileGenRunState = {
    runId: 'run-gen-1',
    projectId: 'proj-100',
    x: 3,
    y: 4,
    prompt: 'River bank with willow trees',
    startedAt: '2026-08-20T00:00:00Z',
  }

  beforeEach(() => {
    useWorldStore.setState({ tiles: {} })
    useGlobalStatusStore.setState({ operations: [] })
    storageMap.clear()
  })

  it('handles pending review result by setting pendingGeneration and clearing run state', async () => {
    useGlobalStatusStore.getState().addOperation({
      id: 'gen-3-4',
      type: 'world-gen',
      label: 'Generating',
      status: AsyncOperationStatus.InProgress,
    })

    const output = {
      pendingReview: true,
      newUrl: 'https://cdn.example.com/river.png',
      originalUrl: 'https://cdn.example.com/orig_river.png',
      variantUrls: ['https://cdn.example.com/v1.png', 'https://cdn.example.com/v2.png'],
      isFirstTile: true,
    }

    await handleTileGenCompletion(sampleRun, output, 'gen-3-4')

    const pending = useWorldStore.getState().getPendingGeneration(3, 4)
    expect(pending).toBeDefined()
    expect(pending?.newUrl).toBe('https://cdn.example.com/river.png')
    expect(pending?.variantUrls).toEqual([
      'https://cdn.example.com/v1.png',
      'https://cdn.example.com/v2.png',
    ])
    expect(pending?.isFirstTile).toBe(true)

    expect(useWorldStore.getState().generatingTiles['3,4']).toBeUndefined()
  })

  it('handles direct generation result by saving tile to world store', async () => {
    const output = {
      success: true,
      filename: 'generated_tile_3_4.png',
    }

    await handleTileGenCompletion(sampleRun, output, 'gen-3-4')

    const tile = useWorldStore.getState().tiles['3,4']
    expect(tile).toBeDefined()
    expect(tile?.image_filename).toBe('generated_tile_3_4.png')
    expect(tile?.tile_prompt).toBe('River bank with willow trees')
  })

  it('safely handles empty output and cleans up run state', async () => {
    useWorldStore.getState().addGeneratingTile(3, 4)

    await handleTileGenCompletion(sampleRun, undefined, 'gen-3-4')

    expect(useWorldStore.getState().generatingTiles['3,4']).toBeUndefined()
  })
})
