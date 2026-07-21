import { DynamicLocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import { UpscaleServiceLog } from '../../constants/upscale-service'
import { pollUpscaleRun } from './upscale-poll-run'
import {
  buildUpscaleOpId,
  clearUpscaleRunState,
  trackUpscaleResume,
} from './upscale-run-status'
import {
  forEachPendingUpscaleRun,
  readMjGrid,
  readUpscaleRunState,
} from './upscale-run-storage'
import { startMjVariantSelection, startUpscaleRun } from './upscale-trigger'
import type { MjGridStoragePayload } from './upscale-run-types'

export class UpscaleService {
  cleanup() {}

  async upscale(
    tile: Parameters<typeof startUpscaleRun>[0],
    creativity: number,
    styleReferenceUrls?: string[],
    provider?: Parameters<typeof startUpscaleRun>[3]
  ): Promise<string | null> {
    return startUpscaleRun(tile, creativity, styleReferenceUrls, provider)
  }

  resumePendingUpscales(): void {
    forEachPendingUpscaleRun(runState => {
      console.log(UpscaleServiceLog.ResumingPolling, runState.runId)
      const opId = trackUpscaleResume(runState)
      void pollUpscaleRun(runState, opId)
    }, () => {})
  }

  stopUpscale(tileId: string): void {
    const runState = readUpscaleRunState(tileId)
    if (runState) {
      const opId = buildUpscaleOpId(runState.tileX, runState.tileY)
      clearUpscaleRunState(runState, opId)
      console.log(UpscaleServiceLog.StoppedForTile, tileId)
      return
    }
    browserStorage.remove(DynamicLocalStorageKeys.upscaleRun(tileId))
  }

  getMjGrid(tileId: string): MjGridStoragePayload | null {
    return readMjGrid(tileId)
  }

  async selectMjVariant(tileId: string, variantIndex: 1 | 2 | 3 | 4): Promise<string | null> {
    return startMjVariantSelection(tileId, variantIndex)
  }

  clearMjGrid(tileId: string): void {
    browserStorage.remove(DynamicLocalStorageKeys.mjGrid(tileId))
    browserStorage.remove(DynamicLocalStorageKeys.upscaleRun(tileId))
  }
}

export const upscaleService = new UpscaleService()
