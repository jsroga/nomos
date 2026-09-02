import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildTileGenOpId,
  clearTileGenRunState,
  handleTileGenPollError,
  handleTileGenStartError,
  saveTileGenRunState,
  trackTileGenResume,
  trackTileGenStart,
  updateTileGenPollStatus,
} from '../tile-generation-run-status'
import { useWorldStore } from '../../useWorldStore'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { browserStorage } from '@/shared/data/browser-storage'
import { DynamicLocalStorageKeys } from '@/shared/data/constants/localStorage'
import type { TileGenRunState } from '../tile-generation-run-types'

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

describe('tile-generation-run-status', () => {
  const sampleRunState: TileGenRunState = {
    runId: 'run-123',
    projectId: 'proj-456',
    x: 2,
    y: -3,
    prompt: 'Pine tree grove',
    startedAt: '2026-08-20T00:00:00Z',
  }

  beforeEach(() => {
    useGlobalStatusStore.setState({ operations: [] })
    storageMap.clear()
  })

  it('buildTileGenOpId creates standardized operation ID', () => {
    expect(buildTileGenOpId(0, 0)).toBe('gen-0-0')
    expect(buildTileGenOpId(4, -2)).toBe('gen-4--2')
  })

  it('trackTileGenStart marks tile as generating and adds global operation', () => {
    const opId = trackTileGenStart(1, 1)

    expect(opId).toBe('gen-1-1')
    expect(useWorldStore.getState().generatingTiles['1,1']).toBe(true)

    const op = useGlobalStatusStore.getState().operations.find(o => o.id === opId)
    expect(op).toBeDefined()
    expect(op?.label).toContain('Generating')
  })

  it('trackTileGenResume marks tile as generating with resume label', () => {
    const opId = trackTileGenResume(sampleRunState)

    expect(opId).toBe('gen-2--3')
    expect(useWorldStore.getState().generatingTiles['2,-3']).toBe(true)

    const op = useGlobalStatusStore.getState().operations.find(o => o.id === opId)
    expect(op).toBeDefined()
    expect(op?.label).toContain('resumed')
  })

  it('updateTileGenPollStatus updates global operation and world progress', () => {
    const opId = trackTileGenStart(2, 2)
    updateTileGenPollStatus(opId, 2, 2, 'generating', 65)

    expect(useWorldStore.getState().tileProgress['2,2']).toEqual({
      progress: 65,
      stage: 'generating',
    })

    const op = useGlobalStatusStore.getState().operations.find(o => o.id === opId)
    expect(op?.details).toContain('65%')
  })

  it('saveTileGenRunState persists state in browser storage', () => {
    saveTileGenRunState(sampleRunState)
    const key = DynamicLocalStorageKeys.tileGen(sampleRunState.x, sampleRunState.y)
    const stored = browserStorage.getJson(key)
    expect(stored).toEqual(sampleRunState)
  })

  it('clearTileGenRunState removes storage, clears generation flag and operation', () => {
    saveTileGenRunState(sampleRunState)
    const opId = trackTileGenStart(2, -3)

    clearTileGenRunState(sampleRunState, opId)

    const key = DynamicLocalStorageKeys.tileGen(sampleRunState.x, sampleRunState.y)
    expect(browserStorage.getJson(key)).toBeNull()
    expect(useWorldStore.getState().generatingTiles['2,-3']).toBeUndefined()
    expect(useWorldStore.getState().tileProgress['2,-3']).toBeUndefined()
    expect(useGlobalStatusStore.getState().operations.find(o => o.id === opId)).toBeUndefined()
  })

  it('handleTileGenStartError sets tile error and cleans up generating flag', () => {
    const opId = trackTileGenStart(0, 0)
    handleTileGenStartError(0, 0, opId, new Error('Network failure'), 'Fallback')

    expect(useWorldStore.getState().failedTiles['0,0']).toBe('Network failure')
    expect(useWorldStore.getState().generatingTiles['0,0']).toBeUndefined()
    expect(useGlobalStatusStore.getState().operations.find(o => o.id === opId)).toBeUndefined()
  })

  it('handleTileGenPollError sets tile error message', () => {
    handleTileGenPollError(sampleRunState, 'Polling timed out')
    expect(useWorldStore.getState().failedTiles['2,-3']).toBe('Polling timed out')
  })
})
