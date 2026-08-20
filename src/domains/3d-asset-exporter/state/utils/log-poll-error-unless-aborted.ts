import { TriggerRunPollAbortedError, TriggerRunPollFailedError } from '@/shared/data/polling/wait-for-trigger-run'

export function logPollErrorUnlessAborted(label: string, error: unknown): void {
  if (error instanceof TriggerRunPollAbortedError) return
  if (error instanceof TriggerRunPollFailedError) return
  console.error(label, error)
}
