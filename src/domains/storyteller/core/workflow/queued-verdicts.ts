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
