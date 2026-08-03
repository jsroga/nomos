import type { AsyncOperation } from '@/shared/jobs/useGlobalStatusStore'
import {
  AsyncOperationStatus,
  isActiveOperationStatus,
} from '@/shared/jobs/constants/async-operation-status'

export enum RetextureViewPhase {
  Completed = 'completed',
  Active = 'active',
  Failed = 'failed',
  Form = 'form',
}

export type RetextureViewState =
  | { phase: RetextureViewPhase.Completed }
  | { phase: RetextureViewPhase.Active; operation: AsyncOperation }
  | { phase: RetextureViewPhase.Failed }
  | { phase: RetextureViewPhase.Form }

export function resolveRetextureViewState(
  currentOperation: AsyncOperation | undefined
): RetextureViewState {
  if (!currentOperation) {
    return { phase: RetextureViewPhase.Form }
  }
  if (currentOperation.status === AsyncOperationStatus.Completed) {
    return { phase: RetextureViewPhase.Completed }
  }
  if (isActiveOperationStatus(currentOperation.status)) {
    return { phase: RetextureViewPhase.Active, operation: currentOperation }
  }
  if (currentOperation.status === AsyncOperationStatus.Failed) {
    return { phase: RetextureViewPhase.Failed }
  }
  return { phase: RetextureViewPhase.Form }
}
