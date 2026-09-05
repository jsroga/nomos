import { MEMORY_MESSAGE_TTL_MS, MEMORY_THREAD_MESSAGE_CAP } from './memory-expiry'

export interface MemoryMessageRecord {
  id: string
  threadId: string
  createdAtMs: number
}

export interface MemoryPruneStore {
  listMessages: (projectId: string) => Promise<MemoryMessageRecord[]>
  deleteMessages: (ids: readonly string[]) => Promise<number>
}

export interface PruneMastraMemoryResult {
  deleted: number
}

export function selectExpiredAndOverCapIds(
  rows: readonly MemoryMessageRecord[],
  nowMs: number,
  ttlMs: number = MEMORY_MESSAGE_TTL_MS,
  cap: number = MEMORY_THREAD_MESSAGE_CAP,
): string[] {
  const cutoff = nowMs - ttlMs
  const expired = new Set<string>()
  for (const row of rows) {
    if (row.createdAtMs < cutoff) expired.add(row.id)
  }

  const remaining = rows.filter(row => !expired.has(row.id))
  const byThread = new Map<string, MemoryMessageRecord[]>()
  for (const row of remaining) {
    const list = byThread.get(row.threadId) ?? []
    list.push(row)
    byThread.set(row.threadId, list)
  }

  const overCap: string[] = []
  for (const list of byThread.values()) {
    const ranked = [...list].sort((left, right) => right.createdAtMs - left.createdAtMs)
    for (const row of ranked.slice(cap)) overCap.push(row.id)
  }

  return [...expired, ...overCap]
}

export async function pruneMastraMemory(
  store: MemoryPruneStore,
  projectId: string,
  nowMs: number = Date.now(),
): Promise<PruneMastraMemoryResult> {
  const rows = await store.listMessages(projectId)
  const ids = selectExpiredAndOverCapIds(rows, nowMs)
  if (ids.length === 0) return { deleted: 0 }
  const deleted = await store.deleteMessages(ids)
  return { deleted }
}
