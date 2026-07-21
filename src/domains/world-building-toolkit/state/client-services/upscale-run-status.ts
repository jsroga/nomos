import { useWorldStore } from '../useWorldStore'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { DynamicLocalStorageKeys } from '@/shared/data/constants/localStorage'
import { browserStorage } from '@/shared/data/browser-storage'
import {
  AsyncOperationStatus,
  OperationTypeId,
  UpscaleOperationIdPrefix,
  UpscaleOperationLabel,
} from '../../constants/upscale-service'
import type { UpscaleRunState } from './upscale-run-types'

export function buildUpscaleOpId(tileX: number, tileY: number): string {
  return `${UpscaleOperationIdPrefix.Upscale}${tileX}-${tileY}`
}

export function buildMjVariantOpId(tileX: number, tileY: number): string {
  return `${UpscaleOperationIdPrefix.MjVariant}${tileX}-${tileY}`
}

export function trackUpscaleStart(
  tileX: number,
  tileY: number,
  providerLabel: string
): string {
  useWorldStore.getState().addUpscalingTile(tileX, tileY)
  const opId = buildUpscaleOpId(tileX, tileY)
  useGlobalStatusStore.getState().addOperation({
    id: opId,
    type: OperationTypeId.WorldGen,
    label: UpscaleOperationLabel.UpscalingTile,
    details: `(${tileX}, ${tileY}) via ${providerLabel}`,
    status: AsyncOperationStatus.InProgress,
  })
  return opId
}

export function trackUpscaleResume(runState: UpscaleRunState): string {
  useWorldStore.getState().addUpscalingTile(runState.tileX, runState.tileY)
  const opId = buildUpscaleOpId(runState.tileX, runState.tileY)
  useGlobalStatusStore.getState().addOperation({
    id: opId,
    type: OperationTypeId.WorldGen,
    label: UpscaleOperationLabel.UpscalingTileResumed,
    details: `(${runState.tileX}, ${runState.tileY}) via ${runState.provider}`,
    status: AsyncOperationStatus.InProgress,
  })
  return opId
}

export function updateUpscalePollStatus(
  opId: string,
  tileX: number,
  tileY: number,
  stage: string,
  progress: number
): void {
  useGlobalStatusStore.getState().updateOperation(opId, {
    details: `(${tileX}, ${tileY}) ${stage} ${progress}%`,
  })
}

export function clearUpscaleRunState(runState: UpscaleRunState, opId: string): void {
  browserStorage.remove(DynamicLocalStorageKeys.upscaleRun(runState.tileId))
  useWorldStore.getState().removeUpscalingTile(runState.tileX, runState.tileY)
  useGlobalStatusStore.getState().removeOperation(opId)
}

export function saveUpscaleRunState(runState: UpscaleRunState): void {
  browserStorage.setObject(DynamicLocalStorageKeys.upscaleRun(runState.tileId), runState)
}

export function handleUpscaleStartError(
  tileX: number,
  tileY: number,
  opId: string,
  error: unknown,
  fallbackMessage: string
): void {
  useWorldStore.getState().setTileError(
    tileX,
    tileY,
    error instanceof Error ? error.message : fallbackMessage
  )
  useWorldStore.getState().removeUpscalingTile(tileX, tileY)
  useGlobalStatusStore.getState().removeOperation(opId)
}

export function handleUpscalePollError(
  runState: UpscaleRunState,
  errorMsg: string
): void {
  useWorldStore.getState().setTileError(runState.tileX, runState.tileY, errorMsg)
}
