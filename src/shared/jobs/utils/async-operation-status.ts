export enum AsyncOperationStatus {
  Pending = 'pending',
  InProgress = 'in-progress',
  Completed = 'completed',
  Failed = 'failed',
}

export const isTerminalOperationStatus = (status: string): boolean =>
  status === AsyncOperationStatus.Completed || status === AsyncOperationStatus.Failed

export const isActiveOperationStatus = (status: string): boolean =>
  status === AsyncOperationStatus.Pending || status === AsyncOperationStatus.InProgress
