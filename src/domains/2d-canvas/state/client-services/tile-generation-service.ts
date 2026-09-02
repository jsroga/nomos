import { completeTileVariantSelection } from '../../core/io/world-gen-trigger.api'
import { TileGenerationServiceLog, VariantSelectionAction } from '../../constants/tile-generation-service'
import { pollTileGenRun } from './tile-generation-poll-run'
import { startTileGeneration } from './tile-generation-trigger'
import {
  buildTileGenOpId,
  clearTileGenRunState,
  trackTileGenResume,
} from './tile-generation-run-status'
import {
  forEachPendingTileGenRun,
  isTileGenRunning,
  readTileGenRunState,
} from './tile-generation-run-storage'
import type { FollowUpContextPayload } from './tile-generation-run-types'

export type { FollowUpContextPayload } from './tile-generation-run-types'

export class TileGenerationService {
  cleanup() {}

  async generate(
    projectId: string,
    x: number,
    y: number,
    prompt: string,
    styleReferenceUrls?: string[],
    contextFromCaller?: FollowUpContextPayload | string
  ): Promise<string | null> {
    return startTileGeneration(projectId, x, y, prompt, styleReferenceUrls, contextFromCaller)
  }

  resumePendingGenerations(): void {
    forEachPendingTileGenRun(runState => {
      console.log(TileGenerationServiceLog.ResumingPolling, runState.runId)
      const opId = trackTileGenResume(runState)
      void pollTileGenRun(runState, opId)
    })
  }

  stopGeneration(x: number, y: number): void {
    const runState = readTileGenRunState(x, y)
    if (runState) {
      const opId = buildTileGenOpId(runState.x, runState.y)
      clearTileGenRunState(runState, opId)
      console.log(TileGenerationServiceLog.StoppedFor, x, y)
    }
  }

  isGenerating(x: number, y: number): boolean {
    return isTileGenRunning(x, y)
  }

  async completeVariantSelection(
    tokenId: string,
    action: VariantSelectionAction,
    variantIndex: number,
    runId: string
  ): Promise<void> {
    await completeTileVariantSelection({ tokenId, action, variantIndex, runId })
  }
}

export const tileGenerationService = new TileGenerationService()
