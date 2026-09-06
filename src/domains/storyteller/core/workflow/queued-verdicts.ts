import { MastraWorkflowStatus } from '@/shared/data/constants/protocol'

export interface QueuedVerdictRun {
  runId: string
  status: string
  projectId?: string
}

export interface QueuedVerdict {
  runId: string
}

export function selectQueuedVerdicts(
  runs: readonly QueuedVerdictRun[],
  projectId: string
): QueuedVerdict[] {
  return runs
    .filter(
      run =>
        run.status === MastraWorkflowStatus.Suspended &&
        (run.projectId === undefined || run.projectId === projectId)
    )
    .map(run => ({ runId: run.runId }))
}

/** Empty overlay chrome is hidden — “No queued verdicts” is not a user-facing state. */
export function queuedVerdictsListVisible(runIds: readonly string[]): boolean {
  return runIds.length > 0
}
