import { useWorldStore } from '../useWorldStore'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { DynamicLocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import {
  AsyncOperationStatus,
  OperationTypeId,
  TileGenerationOperationIdPrefix,
  TileGenerationOperationLabel,
} from '../../constants/tile-generation-service'
import type { TileGenRunState } from './tile-generation-run-types'

export function buildTileGenOpId(x: number, y: number): string {
  return `${TileGenerationOperationIdPrefix.Gen}${x}-${y}`
}

export function trackTileGenStart(x: number, y: number): string {
  useWorldStore.getState().addGeneratingTile(x, y)
  const opId = buildTileGenOpId(x, y)
  useGlobalStatusStore.getState().addOperation({
    id: opId,
    type: OperationTypeId.WorldGen,
    label: TileGenerationOperationLabel.GeneratingTile,
    details: `(${x}, ${y})`,
    status: AsyncOperationStatus.InProgress,
  })
  return opId
}

export function trackTileGenResume(runState: TileGenRunState): string {
  useWorldStore.getState().addGeneratingTile(runState.x, runState.y)
  const opId = buildTileGenOpId(runState.x, runState.y)
  useGlobalStatusStore.getState().addOperation({
    id: opId,
    type: OperationTypeId.WorldGen,
    label: TileGenerationOperationLabel.GeneratingTileResumed,
    details: `(${runState.x}, ${runState.y})`,
    status: AsyncOperationStatus.InProgress,
  })
  return opId
}

export function updateTileGenPollStatus(
  opId: string,
  x: number,
  y: number,
  stage: string,
  progress: number
): void {
  useGlobalStatusStore.getState().updateOperation(opId, {
    details: `(${x}, ${y}) ${stage} ${progress}%`,
  })
  useWorldStore.getState().setTileProgress(x, y, progress, stage)
}

export function saveTileGenRunState(runState: TileGenRunState): void {
  browserStorage.setObject(DynamicLocalStorageKeys.tileGen(runState.x, runState.y), runState)
}

export function clearTileGenRunState(runState: TileGenRunState, opId: string): void {
  browserStorage.remove(DynamicLocalStorageKeys.tileGen(runState.x, runState.y))
  useWorldStore.getState().removeGeneratingTile(runState.x, runState.y)
  useWorldStore.getState().clearTileProgress(runState.x, runState.y)
  useGlobalStatusStore.getState().removeOperation(opId)
}

export function handleTileGenStartError(
  x: number,
  y: number,
  opId: string,
  error: unknown,
  fallbackMessage: string
): void {
  useWorldStore.getState().setTileError(
    x,
    y,
    error instanceof Error ? error.message : fallbackMessage
  )
  useWorldStore.getState().removeGeneratingTile(x, y)
  useGlobalStatusStore.getState().removeOperation(opId)
}

export function handleTileGenPollError(
  runState: TileGenRunState,
  errorMsg: string
): void {
  useWorldStore.getState().setTileError(runState.x, runState.y, errorMsg)
}
