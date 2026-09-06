import { describe, expect, it } from 'vitest'
import { MEMORY_MESSAGE_TTL_MS, MEMORY_THREAD_MESSAGE_CAP } from '../memory-expiry'
import { MemoryThreadPrefix } from '../memory-ref'
import {
  fanOutPruneMastraMemory,
  pruneMastraMemory,
  PruneMastraMemoryScheduleId,
  selectExpiredAndOverCapIds,
  storytellerProjectIdsFromThreadIds,
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

const PROJECT_A = '11111111-1111-4111-8111-111111111111'
const PROJECT_B = '22222222-2222-4222-8222-222222222222'

describe('storytellerProjectIdsFromThreadIds', () => {
  it('parses distinct valid project ids and skips empty or foreign prefixes', () => {
    expect(storytellerProjectIdsFromThreadIds([])).toEqual([])
    expect(
      storytellerProjectIdsFromThreadIds([
        `${MemoryThreadPrefix.Storyteller}:${PROJECT_A}:ep:user`,
        `${MemoryThreadPrefix.Storyteller}:${PROJECT_A}:other:user`,
        `${MemoryThreadPrefix.Storyteller}:${PROJECT_B}:ep:user`,
        'other:not-a-project',
        `${MemoryThreadPrefix.Storyteller}:not-a-uuid:ep:user`,
      ])
    ).toEqual([PROJECT_A, PROJECT_B])
  })
})

describe('fanOutPruneMastraMemory', () => {
  it('skips triggering when there are no project prefixes', async () => {
    const triggered: string[] = []
    const result = await fanOutPruneMastraMemory({
      listProjectIds: async () => [],
      mintNonce: () => 'nonce',
      triggerPrune: async projectId => {
        triggered.push(projectId)
      },
    })
    expect(result.triggered).toBe(0)
    expect(triggered).toEqual([])
  })

  it('triggers one owned prune per distinct project with a minted nonce', async () => {
    const seen: Array<{ projectId: string; requestId: string }> = []
    const result = await fanOutPruneMastraMemory({
      listProjectIds: async () => [PROJECT_A, PROJECT_B],
      mintNonce: () => 'system-nonce',
      triggerPrune: async (projectId, requestId) => {
        seen.push({ projectId, requestId })
      },
    })
    expect(result.triggered).toBe(2)
    expect(seen).toEqual([
      { projectId: PROJECT_A, requestId: 'system-nonce' },
      { projectId: PROJECT_B, requestId: 'system-nonce' },
    ])
  })
})

describe('prune schedule id', () => {
  it('keeps a stable fan-out schedule id', () => {
    expect(PruneMastraMemoryScheduleId.Fanout).toBe('prune-mastra-memory-fanout')
  })
})
