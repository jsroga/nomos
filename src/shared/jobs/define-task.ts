/**
 * The only way to define a background task.
 *
 * Nineteen tasks were written by copying a working one, so the first task's
 * omissions became the house style: no payload validation, no queue, no
 * duplicate-submit protection. This is not a gate that catches that — it is a
 * shape in which it cannot be expressed. `schema` and `queue` are required, so
 * a task that omits either fails to compile, and the schema must produce an
 * `OwnedTaskPayload`, so a task whose payload carries no submission nonce fails
 * to compile too.
 *
 * The idempotency key itself is derived at trigger time by `triggerOwnedRun`,
 * the only caller that has both the task id and the nonce.
 */
import { schemaTask, schedules } from '@trigger.dev/sdk'
import type { z } from 'zod'
import { JobQueue, JOB_QUEUE_CONCURRENCY_LIMIT } from '@/shared/jobs/constants/job-queue'

/**
 * What every task payload carries. `projectId` makes the run readable by its
 * owner; `requestId` makes a double-submit one run.
 */
export interface OwnedTaskPayload {
  projectId: string
  requestId: string
}

/** Trigger machine presets. Unset by default — see docs/DEVELOPMENT.md. */
export enum MachinePreset {
  Medium1x = 'medium-1x',
}

interface OwnedTaskConfig<TSchema extends z.ZodType<OwnedTaskPayload>, TOutput> {
  id: string
  schema: TSchema
  queue: JobQueue
  /** Only where memory has a reason behind it; the default bills less. */
  machine?: MachinePreset
  maxDuration?: number
  retry?: { maxAttempts: number }
  run: (payload: z.output<TSchema>) => Promise<TOutput>
}

export function defineScheduledTask<TOutput>(config: {
  id: string
  cron: string
  queue: JobQueue
  maxDuration?: number
  run: () => Promise<TOutput>
}) {
  return schedules.task({
    id: config.id,
    cron: config.cron,
    queue: { name: config.queue, concurrencyLimit: JOB_QUEUE_CONCURRENCY_LIMIT },
    maxDuration: config.maxDuration,
    run: async () => config.run(),
  })
}

export function defineOwnedTask<TSchema extends z.ZodType<OwnedTaskPayload>, TOutput>(
  config: OwnedTaskConfig<TSchema, TOutput>
) {
  return schemaTask({
    id: config.id,
    schema: config.schema,
    queue: { name: config.queue, concurrencyLimit: JOB_QUEUE_CONCURRENCY_LIMIT },
    machine: config.machine,
    maxDuration: config.maxDuration,
    retry: config.retry,
    run: config.run,
  })
}
