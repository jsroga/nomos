/**
 * The factory's job is to make an unhardened task unexpressible, so most of
 * what matters here is checked by the compiler. The `@ts-expect-error` cases
 * are the load-bearing ones: weakening the config type makes them *unused*
 * directives, which is itself an error, so the guard cannot be quietly dropped.
 */
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

/** What the factory is asserted to hand the SDK. */
interface CapturedTask {
  id: string
  schema: unknown
  queue: { name: string; concurrencyLimit: number }
  run: (payload: { projectId: string; requestId: string; x: number }) => Promise<number>
}

const schemaTaskMock = vi.fn((config: CapturedTask) => config)

vi.mock('@trigger.dev/sdk', () => ({
  schemaTask: (config: CapturedTask) => schemaTaskMock(config),
}))

import { JobQueue, JOB_QUEUE_CONCURRENCY_LIMIT } from '../constants/job-queue'
import { defineOwnedTask } from '../define-task'

const PROJECT = '22222222-2222-4222-8222-222222222222'
const ownedSchema = z.object({
  projectId: z.string().uuid(),
  requestId: z.string().min(1),
  x: z.number(),
})

function define() {
  return defineOwnedTask({
    id: 'test-task',
    schema: ownedSchema,
    queue: JobQueue.ImageProvider,
    run: async payload => payload.x * 2,
  })
}

describe('defineOwnedTask', () => {
  it('hands the schema to the SDK, so an invalid payload never reaches run', () => {
    schemaTaskMock.mockClear()

    define()

    expect(schemaTaskMock.mock.calls[0][0]).toMatchObject({ schema: ownedSchema })
  })

  it('names the queue and its concurrency limit, so a task cannot omit one', () => {
    schemaTaskMock.mockClear()

    define()

    expect(schemaTaskMock.mock.calls[0][0]).toMatchObject({
      queue: { name: JobQueue.ImageProvider, concurrencyLimit: JOB_QUEUE_CONCURRENCY_LIMIT },
    })
  })

  it('runs a valid payload', async () => {
    schemaTaskMock.mockClear()
    define()
    const { run } = schemaTaskMock.mock.calls[0][0]

    await expect(run({ projectId: PROJECT, requestId: 'nonce', x: 21 })).resolves.toBe(42)
  })

  it('rejects an invalid payload at the schema, before any provider is called', () => {
    const parsed = ownedSchema.safeParse({ projectId: PROJECT, requestId: 'nonce', x: 'twenty-one' })

    expect(parsed.success).toBe(false)
  })

  it('rejects a payload with no submission nonce', () => {
    const parsed = ownedSchema.safeParse({ projectId: PROJECT, x: 1 })

    expect(parsed.success).toBe(false)
  })
})

describe('a task that omits what makes it safe does not compile', () => {
  it('has no queue', () => {
    // @ts-expect-error queue is required — one tenant must not drain a quota
    const built = () => defineOwnedTask({ id: 'no-queue', schema: ownedSchema, run: async () => 1 })

    expect(built).toBeTypeOf('function')
  })

  it('has a payload with no submission nonce', () => {
    const unkeyed = z.object({ projectId: z.string().uuid() })

    const built = () =>
      defineOwnedTask({
        id: 'no-nonce',
        // @ts-expect-error the schema must produce a requestId, or a double-submit buys twice
        schema: unkeyed,
        queue: JobQueue.Storage,
        run: async () => 1,
      })

    expect(built).toBeTypeOf('function')
  })
})
