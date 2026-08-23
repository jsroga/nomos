import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildMjVariantOpId,
  buildUpscaleOpId,
  clearUpscaleRunState,
  handleUpscalePollError,
  handleUpscaleStartError,
  saveUpscaleRunState,
  trackUpscaleResume,
  trackUpscaleStart,
  updateUpscalePollStatus,
} from '../upscale-run-status'
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

describe('upscale-run-status', () => {
  const sampleUpscaleState: UpscaleRunState = {
    runId: 'up-run-789',
    projectId: 'proj-456',
    tileId: 'tile-5-5',
    tileX: 5,
    tileY: 5,
    provider: UpscaleProvider.Stability,
    startedAt: '2026-08-20T00:00:00Z',
  }

  beforeEach(() => {
    useGlobalStatusStore.setState({ operations: [] })
    storageMap.clear()
  })

  it('buildUpscaleOpId and buildMjVariantOpId produce valid keys', () => {
    expect(buildUpscaleOpId(1, 2)).toBe('upscale-1-2')
    expect(buildMjVariantOpId(1, 2)).toBe('mj-variant-1-2')
  })

  it('trackUpscaleStart sets upscaling tile and in-progress operation', () => {
    const opId = trackUpscaleStart(5, 5, 'Stability')

    expect(opId).toBe('upscale-5-5')
    expect(useWorldStore.getState().upscalingTiles['5,5']).toBe(true)
    expect(useWorldStore.getState().tileProgress['5,5']?.stage).toBe('initializing')

    const op = useGlobalStatusStore.getState().operations.find(o => o.id === opId)
    expect(op).toBeDefined()
    expect(op?.label).toContain('Upscaling')
  })

  it('trackUpscaleResume marks upscaling tile and sets resumed operation', () => {
    const opId = trackUpscaleResume(sampleUpscaleState)

    expect(opId).toBe('upscale-5-5')
    expect(useWorldStore.getState().upscalingTiles['5,5']).toBe(true)

    const op = useGlobalStatusStore.getState().operations.find(o => o.id === opId)
    expect(op).toBeDefined()
    expect(op?.label).toContain('resumed')
  })

  it('updateUpscalePollStatus updates global status and store progress', () => {
    const opId = trackUpscaleStart(5, 5, 'Stability')
    updateUpscalePollStatus(opId, 5, 5, 'processing', 80)

    expect(useWorldStore.getState().tileProgress['5,5']).toEqual({
      progress: 80,
      stage: 'processing',
    })

    const op = useGlobalStatusStore.getState().operations.find(o => o.id === opId)
    expect(op?.details).toContain('80%')
  })

  it('saveUpscaleRunState and clearUpscaleRunState manage persistence and cleanup', () => {
    saveUpscaleRunState(sampleUpscaleState)
    const key = DynamicLocalStorageKeys.upscaleRun(sampleUpscaleState.tileId)
    const stored = browserStorage.getJson(key)
    expect(stored).toEqual(sampleUpscaleState)

    const opId = trackUpscaleStart(5, 5, 'Stability')
    clearUpscaleRunState(sampleUpscaleState, opId)

    expect(browserStorage.getJson(key)).toBeNull()
    expect(useWorldStore.getState().upscalingTiles['5,5']).toBeUndefined()
    expect(useGlobalStatusStore.getState().operations.find(o => o.id === opId)).toBeUndefined()
  })

  it('handleUpscaleStartError sets tile error and clears upscaling status', () => {
    const opId = trackUpscaleStart(0, 0, 'Stability')
    handleUpscaleStartError(0, 0, opId, new Error('GPU OOM'), 'Fallback')

    expect(useWorldStore.getState().failedTiles['0,0']).toBe('GPU OOM')
    expect(useWorldStore.getState().upscalingTiles['0,0']).toBeUndefined()
    expect(useGlobalStatusStore.getState().operations.find(o => o.id === opId)).toBeUndefined()
  })

  it('handleUpscalePollError sets tile error message', () => {
    handleUpscalePollError(sampleUpscaleState, 'Upscale request failed')
    expect(useWorldStore.getState().failedTiles['5,5']).toBe('Upscale request failed')
  })
})
