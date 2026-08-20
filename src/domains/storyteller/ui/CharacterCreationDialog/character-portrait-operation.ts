import { useGlobalStatusStore, type AsyncOperation } from '@/shared/jobs/useGlobalStatusStore'
import {
  AsyncOperationStatus,
  isActiveOperationStatus,
} from '@/shared/jobs/constants/async-operation-status'
import { OperationTypeId } from '@/shared/jobs/constants/operation-type-id'

export enum CharacterPortraitOperationLabel {
  Generating = 'Generating Portrait',
}

export enum CharacterPortraitOperationDetail {
  Creating = 'Creating character portrait...',
}

export enum CharacterPortraitOperationMetaKey {
  TaskId = 'taskId',
  RunId = 'runId',
  Prompt = 'prompt',
}

export function portraitGenOperationId(charId: string): string {
  return `${OperationTypeId.PortraitGen}-${charId}`
}

export function isCharacterPortraitGenerating(
  operations: AsyncOperation[],
  characterId: string,
): boolean {
  const opId = portraitGenOperationId(characterId)
  return operations.some(op => op.id === opId && isActiveOperationStatus(op.status))
}

export function portraitOperationDetails(input: {
  detail: string
  runId?: string
}): string {
  return JSON.stringify({
    [CharacterPortraitOperationMetaKey.Prompt]: input.detail,
    ...(input.runId
      ? {
          [CharacterPortraitOperationMetaKey.TaskId]: input.runId,
          [CharacterPortraitOperationMetaKey.RunId]: input.runId,
        }
      : {}),
  })
}

export function trackPortraitGenerationStart(charId: string): string {
  const opId = portraitGenOperationId(charId)
  useGlobalStatusStore.getState().addOperation({
    id: opId,
    type: OperationTypeId.PortraitGen,
    label: CharacterPortraitOperationLabel.Generating,
    details: portraitOperationDetails({ detail: CharacterPortraitOperationDetail.Creating }),
    status: AsyncOperationStatus.InProgress,
  })
  return opId
}

export function bindPortraitGenerationRun(opId: string, runId: string): void {
  useGlobalStatusStore.getState().updateOperation(opId, {
    details: portraitOperationDetails({
      runId,
      detail: CharacterPortraitOperationDetail.Creating,
    }),
  })
}

export function clearPortraitGeneration(opId: string): void {
  useGlobalStatusStore.getState().removeOperation(opId)
}
