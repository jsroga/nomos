/**
 * SPEC-14's burn-down meter: the shape of the 19 background tasks.
 *
 * Four counters, each measuring a distinct omission — a task built outside the
 * factory, a task with no queue, a trigger call that carries no idempotency
 * key, and a file still on the v3 subpath. All four reach zero in SPEC-14, so
 * afterwards they are floors that stop the shape regressing.
 *
 * Ratchets, never equality. The *task count* may legitimately rise — a new task
 * is not a regression — so nothing here asserts `tasks === 19`.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
// The .mjs harness is shared by SPEC-12/13/14/16 and carries no types by design.
import { inventory } from '../inventory/index.mjs'
import { TriggerTaskBucket, classifyTriggerTaskShape } from '../inventory/matchers.mjs'

const RATCHET = JSON.parse(readFileSync('.quality-ratchet.json', 'utf8'))
const TASK_FILE_SUFFIX = '.task.ts'

function shape(): Record<string, string[]> {
  return inventory(classifyTriggerTaskShape).byBucket
}

function unique(files: string[] | undefined): string[] {
  return [...new Set(files ?? [])]
}

describe('background task shape', () => {
  it(
    'builds every task through the factory, so none can omit a schema',
    () => {
      expect(unique(shape()[TriggerTaskBucket.RawTask]).length).toBeLessThanOrEqual(
        RATCHET.rawTaskDefinitions
      )
    },
    60_000
  )

  it('names a queue on every task, so one tenant cannot drain a provider quota', () => {
    const buckets = shape()
    const taskFiles = unique([
      ...(buckets[TriggerTaskBucket.RawTask] ?? []),
      ...(buckets[TriggerTaskBucket.OwnedTask] ?? []),
    ]).filter(file => file.endsWith(TASK_FILE_SUFFIX))
    const queued = new Set(unique(buckets[TriggerTaskBucket.Queue]))

    const unqueued = taskFiles.filter(file => !queued.has(file))

    expect(unqueued.length).toBeLessThanOrEqual(RATCHET.tasksWithoutQueue)
  })

  it('triggers through triggerOwnedRun, the only caller that derives a key', () => {
    expect(unique(shape()[TriggerTaskBucket.UnkeyedTrigger]).length).toBeLessThanOrEqual(
      RATCHET.tasksWithoutIdempotencyKey
    )
  })

  it('imports the v4 entrypoint CLAUDE.md mandates, not the v3 subpath', () => {
    expect(unique(shape()[TriggerTaskBucket.SdkV3Import]).length).toBeLessThanOrEqual(
      RATCHET.triggerSdkV3Imports
    )
  })
})
