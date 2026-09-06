import { MEMORY_MESSAGE_TTL_MS, MEMORY_THREAD_MESSAGE_CAP } from './memory-expiry'
import { MemoryThreadPrefix } from './memory-ref'
import { isValidProjectId } from '@/shared/auth/security'

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

enum ThreadIdPart {
  ProjectId = 1,
}

export enum PruneMastraMemoryScheduleId {
  Fanout = 'prune-mastra-memory-fanout',
}

export enum PruneMastraMemoryCron {
  DailyUtc = '0 3 * * *',
}

export function storytellerProjectIdsFromThreadIds(threadIds: readonly string[]): string[] {
  const prefix = `${MemoryThreadPrefix.Storyteller}:`
  const seen = new Set<string>()
  const projectIds: string[] = []
  for (const threadId of threadIds) {
    if (!threadId.startsWith(prefix)) continue
    const projectId = threadId.split(':')[ThreadIdPart.ProjectId]
    if (!projectId || seen.has(projectId) || !isValidProjectId(projectId)) continue
    seen.add(projectId)
    projectIds.push(projectId)
  }
  return projectIds
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

export async function fanOutPruneMastraMemory(input: {
  listProjectIds: () => Promise<string[]>
  triggerPrune: (projectId: string, requestId: string) => Promise<unknown>
  mintNonce: () => string
}): Promise<{ triggered: number }> {
  const projectIds = await input.listProjectIds()
  if (projectIds.length === 0) return { triggered: 0 }
  let triggered = 0
  for (const projectId of projectIds) {
    await input.triggerPrune(projectId, input.mintNonce())
    triggered += 1
  }
  return { triggered }
}
