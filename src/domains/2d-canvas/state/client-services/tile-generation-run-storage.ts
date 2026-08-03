import { DynamicLocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { DynamicLocalStoragePrefix, TileGenerationServiceLog } from '../../constants/tile-generation-service'
import type { TileGenRunState } from './tile-generation-run-types'

export function readTileGenRunState(x: number, y: number): TileGenRunState | null {
  const data = browserStorage.getString(DynamicLocalStorageKeys.tileGen(x, y))
  if (!data) return null
  try {
    const runState: TileGenRunState = JSON.parse(data)
    return runState
  } catch {
    browserStorage.remove(DynamicLocalStorageKeys.tileGen(x, y))
    return null
  }
}

export function forEachPendingTileGenRun(
  onRunState: (runState: TileGenRunState) => void
): void {
  browserStorage.forEachPrefixed(DynamicLocalStoragePrefix.TileGen, (key, raw) => {
    try {
      const runState: TileGenRunState = JSON.parse(raw)
      if (runState.runId) {
        onRunState(runState)
      }
    } catch {
      console.warn(TileGenerationServiceLog.FailedToParseRunState, key)
      browserStorage.remove(key)
    }
  })
}

export function isTileGenRunning(x: number, y: number): boolean {
  return browserStorage.has(DynamicLocalStorageKeys.tileGen(x, y))
}
