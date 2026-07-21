import { DynamicLocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { DynamicLocalStoragePrefix, UpscaleServiceLog } from '../../constants/upscale-service'
import type { MjGridStoragePayload, UpscaleRunState } from './upscale-run-types'

export function readUpscaleRunState(tileId: string): UpscaleRunState | null {
  const data = browserStorage.getString(DynamicLocalStorageKeys.upscaleRun(tileId))
  if (!data) return null
  try {
    const runState: UpscaleRunState = JSON.parse(data)
    return runState
  } catch {
    browserStorage.remove(DynamicLocalStorageKeys.upscaleRun(tileId))
    return null
  }
}

export function readMjGrid(tileId: string): MjGridStoragePayload | null {
  const key = DynamicLocalStorageKeys.mjGrid(tileId)
  const data = browserStorage.getString(key)
  if (!data) return null
  try {
    const parsed: MjGridStoragePayload = JSON.parse(data)
    return parsed
  } catch {
    browserStorage.remove(key)
    return null
  }
}

export function saveMjGrid(tileId: string, payload: MjGridStoragePayload): void {
  browserStorage.setObject(DynamicLocalStorageKeys.mjGrid(tileId), payload)
}

export function removeMjGrid(tileId: string): void {
  browserStorage.remove(DynamicLocalStorageKeys.mjGrid(tileId))
}

export function clearMjGridStorage(tileId: string): void {
  browserStorage.remove(DynamicLocalStorageKeys.mjGrid(tileId))
  browserStorage.remove(DynamicLocalStorageKeys.upscaleRun(tileId))
}

export function forEachPendingUpscaleRun(
  onRunState: (runState: UpscaleRunState) => void,
  onParseError: (key: string) => void
): void {
  browserStorage.forEachPrefixed(DynamicLocalStoragePrefix.UpscaleRun, (key, raw) => {
    try {
      const runState: UpscaleRunState = JSON.parse(raw)
      if (runState.runId) {
        onRunState(runState)
      }
    } catch {
      console.warn(UpscaleServiceLog.FailedToParseRunState, key)
      browserStorage.remove(key)
      onParseError(key)
    }
  })
}
