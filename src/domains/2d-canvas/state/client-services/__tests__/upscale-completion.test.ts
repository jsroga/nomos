import { beforeEach, describe, expect, it } from 'vitest'
import { handleUpscaleCompletion } from '../upscale-completion'
import { useWorldStore } from '../../useWorldStore'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { browserStorage } from '@/shared/data/browser-storage'
import { DynamicLocalStorageKeys } from '@/shared/data/constants/localStorage'
import type { UpscaleRunState } from '../upscale-run-types'
import { UpscaleProvider } from '../../../core/upscale-provider-wire'

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

describe('upscale-completion', () => {
  const sampleRun: UpscaleRunState = {
    runId: 'up-run-1',
    projectId: 'proj-200',
    tileId: 'tile-1-2',
    tileX: 1,
    tileY: 2,
    provider: UpscaleProvider.Midjourney,
    startedAt: '2026-08-20T00:00:00Z',
  }

  beforeEach(() => {
    useWorldStore.setState({ tiles: {} })
    useGlobalStatusStore.setState({ operations: [] })
    storageMap.clear()
  })

  it('handles pending review result by setting pendingUpscale in store', async () => {
    const output = {
      pendingReview: true,
      upscaledUrl: 'https://cdn.example.com/tile_up.png',
      originalUrl: 'https://cdn.example.com/tile_orig.png',
      filename: 'tile_up.png',
    }

    await handleUpscaleCompletion(sampleRun, output, 'upscale-1-2')

    const pending = useWorldStore.getState().getPendingUpscale(1, 2)
    expect(pending).toBeDefined()
    expect(pending?.upscaledUrl).toBe('https://cdn.example.com/tile_up.png')
    expect(pending?.originalUrl).toBe('https://cdn.example.com/tile_orig.png')
  })

  it('handles Midjourney variant selection by persisting grid data in browser storage', async () => {
    const output = {
      requiresVariantSelection: true,
      gridImageUrl: 'https://cdn.example.com/mj_grid.png',
      taskId: 'task-mj-999',
      buttons: ['U1', 'U2', 'U3', 'U4'],
    }

    await handleUpscaleCompletion(sampleRun, output, 'upscale-1-2')

    const key = DynamicLocalStorageKeys.mjGrid(sampleRun.tileId)
    const storedGrid = browserStorage.getJson(key)
    expect(storedGrid).toBeDefined()
    expect(storedGrid?.gridImageUrl).toBe('https://cdn.example.com/mj_grid.png')
    expect(storedGrid?.taskId).toBe('task-mj-999')
  })

  it('applies direct upscale result to existing tile', async () => {
    useWorldStore.setState({
      tiles: {
        '1,2': {
          id: 'tile-1-2',
          project_id: 'proj-200',
          x: 1,
          y: 2,
          tile_prompt: 'Castle wall',
          image_filename: 'low_res.png',
          created_at: '2026-08-01T00:00:00Z',
        },
      },
    })

    const output = {
      success: true,
      filename: 'high_res_castle.png',
    }

    await handleUpscaleCompletion(sampleRun, output, 'upscale-1-2')

    const tile = useWorldStore.getState().tiles['1,2']
    expect(tile?.image_filename).toBe('high_res_castle.png')
  })

  it('handles undefined output without crashing and cleans up run state', async () => {
    useWorldStore.getState().addUpscalingTile(1, 2)

    await handleUpscaleCompletion(sampleRun, undefined, 'upscale-1-2')

    expect(useWorldStore.getState().upscalingTiles['1,2']).toBeUndefined()
  })
})
