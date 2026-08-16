// Centralized constants for polling intervals

/**
 * Minimum polling interval for API status checks (in milliseconds)
 * This ensures we don't overwhelm the backend with too frequent requests
 */
export const POLLING_INTERVALS = {
  /**
   * Default polling interval for background task status checks (5 seconds)
   * Used by: Trigger.dev tasks, AI generation services, retexture operations, etc.
   */
  DEFAULT: 5000,

  /**
   * Faster polling for critical operations that need quick feedback (3 seconds)
   */
  FAST: 3000,

  /**
   * Slower polling for long-running operations (15 seconds)
   * Used by: 3D model generation, remeshing, etc.
   */
  SLOW: 15000,
} as const

/**
 * Trigger.dev task statuses that indicate the task is still running
 */
export const ACTIVE_TASK_STATUSES = [
  'PENDING',
  'QUEUED',
  'EXECUTING',
  'WAITING',
  'REATTEMPTING',
  'FROZEN',
  'PENDING_VERSION',
  'DEQUEUED',
  'DELAYED',
] as const

/**
 * Trigger.dev task statuses that indicate the task completed successfully
 */
export const SUCCESS_STATUSES = ['COMPLETED', 'SUCCESS'] as const

/**
 * Trigger.dev task statuses that indicate the task failed
 */
export const FAILED_STATUSES = [
  'FAILED',
  'CANCELED',
  'TIMED_OUT',
  'CRASHED',
  'SYSTEM_FAILURE',
  'INTERRUPTED',
] as const

export const isActiveTaskStatus = (status: string): boolean =>
  ACTIVE_TASK_STATUSES.some(activeStatus => activeStatus === status)

export const isSuccessTaskStatus = (status: string): boolean =>
  SUCCESS_STATUSES.some(successStatus => successStatus === status)

export const isFailedTaskStatus = (status: string): boolean =>
  FAILED_STATUSES.some(failedStatus => failedStatus === status)
