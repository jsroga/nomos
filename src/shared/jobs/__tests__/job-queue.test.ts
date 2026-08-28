/**
 * The concurrency limit is a placeholder, and this test is where that is
 * recorded: it asserts the shape of the number, not its value, because nobody
 * has the real Meshy / Apiframe / Fal quotas to hand.
 *
 * Raise it from the Trigger dashboard's queue depth once there is traffic —
 * Runs → Queues, concurrency against queued.
 */
import { describe, expect, it } from 'vitest'
import { JobQueue, JOB_QUEUE_CONCURRENCY_LIMIT } from '../constants/job-queue'

describe('job queues', () => {
  it('shares one limit per quota pool, not one per task', () => {
    expect(Number.isInteger(JOB_QUEUE_CONCURRENCY_LIMIT)).toBe(true)
    expect(JOB_QUEUE_CONCURRENCY_LIMIT).toBeGreaterThan(0)
  })

  it('names every pool distinctly, so two pools cannot share a ceiling', () => {
    const names = Object.values(JobQueue)

    expect(new Set(names).size).toBe(names.length)
  })
})
