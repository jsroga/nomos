/** Trigger.dev run statuses that indicate work is still in flight. */
export enum TriggerActiveStatus {
  Pending = 'PENDING',
  Queued = 'QUEUED',
  Executing = 'EXECUTING',
  Waiting = 'WAITING',
  Reattempting = 'REATTEMPTING',
  Frozen = 'FROZEN',
  PendingVersion = 'PENDING_VERSION',
  Dequeued = 'DEQUEUED',
  Delayed = 'DELAYED',
}

export const TRIGGER_ACTIVE_STATUSES: readonly string[] = Object.values(TriggerActiveStatus)

export enum TriggerTerminalStatus {
  Completed = 'COMPLETED',
  Success = 'SUCCESS',
}
