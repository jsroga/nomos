import { describe, expect, it } from 'vitest'
import { MEMORY_MESSAGE_TTL_MS, MEMORY_THREAD_MESSAGE_CAP } from '../memory-expiry'
import {
  pruneMastraMemory,
  selectExpiredAndOverCapIds,
  type MemoryMessageRecord,
  type MemoryPruneStore,
} from '../prune-mastra-memory'

const NOW = Date.parse('2026-09-04T12:00:00.000Z')
const HOUR = 60 * 60 * 1000

function row(
  id: string,
  threadId: string,
  createdAtMs: number,
): MemoryMessageRecord {
  return { id, threadId, createdAtMs }
}

describe('memory expiry bounds', () => {
  it('defines a TTL and a per-thread cap', () => {
    expect(MEMORY_MESSAGE_TTL_MS).toBeGreaterThan(0)
    expect(MEMORY_THREAD_MESSAGE_CAP).toBeGreaterThan(0)
  })
})

describe('selectExpiredAndOverCapIds', () => {
  it('deletes rows past the per-thread cap and preserves rows within the cap', () => {
    const thread = 'storyteller:proj:ep:user'
    const rows = Array.from({ length: MEMORY_THREAD_MESSAGE_CAP + 3 }, (_, index) =>
      row(`keep-${index}`, thread, NOW - index * 1_000),
    )
    const ids = selectExpiredAndOverCapIds(rows, NOW, MEMORY_MESSAGE_TTL_MS, MEMORY_THREAD_MESSAGE_CAP)
    expect(ids).toHaveLength(3)
    expect(ids).toContain(`keep-${MEMORY_THREAD_MESSAGE_CAP}`)
    expect(ids).toContain(`keep-${MEMORY_THREAD_MESSAGE_CAP + 1}`)
    expect(ids).toContain(`keep-${MEMORY_THREAD_MESSAGE_CAP + 2}`)
    expect(ids).not.toContain('keep-0')
  })

  it('deletes expired rows even when the thread is under the cap', () => {
    const ids = selectExpiredAndOverCapIds(
      [
        row('fresh', 't-a', NOW - HOUR),
        row('stale', 't-a', NOW - MEMORY_MESSAGE_TTL_MS - HOUR),
      ],
      NOW,
    )
    expect(ids).toEqual(['stale'])
  })
})

describe('pruneMastraMemory', () => {
  it('deletes over-cap ids through the store port', async () => {
    const thread = 'storyteller:proj:ep:user'
    const rows = Array.from({ length: MEMORY_THREAD_MESSAGE_CAP + 1 }, (_, index) =>
      row(`m-${index}`, thread, NOW - index * 1_000),
    )
    const deleted: string[] = []
    const store: MemoryPruneStore = {
      listMessages: async () => rows,
      deleteMessages: async ids => {
        deleted.push(...ids)
        return ids.length
      },
    }
    const result = await pruneMastraMemory(store, '11111111-1111-4111-8111-111111111111', NOW)
    expect(result.deleted).toBe(1)
    expect(deleted).toEqual([`m-${MEMORY_THREAD_MESSAGE_CAP}`])
  })
})
