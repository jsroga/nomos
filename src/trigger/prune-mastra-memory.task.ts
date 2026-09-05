import { z } from 'zod'
import { sql } from 'drizzle-orm'
import { JobQueue, OWNED_PAYLOAD_SHAPE, defineOwnedTask } from '@/shared/jobs'
import { db } from '@/shared/persistence/client'
import { MemoryThreadPrefix } from '@/shared/agent-kernel/mastra/memory-ref'
import { pruneMastraMemory, type MemoryMessageRecord } from '@/shared/agent-kernel/mastra/prune-mastra-memory'
import { readRowString, sqlResultRows } from '@/shared/data/json-guards'

/**
 * Tables: mastra_messages / mastra_threads
 * (named in supabase/migrations/20260310100000_fix_supabase_security_advisor.sql).
 * Do not invent table names. Do not re-key threads — filter by memoryRef prefix.
 */
enum MastraMemoryTable {
  Messages = 'mastra_messages',
}

enum MastraMessageColumn {
  Id = 'id',
  ThreadId = 'thread_id',
  CreatedAt = 'createdAt',
}

export const PRUNE_MASTRA_MEMORY_TASK_ID = 'prune-mastra-memory'

const pruneMastraMemoryPayloadSchema = z.object({
  ...OWNED_PAYLOAD_SHAPE,
})

function threadPrefixForProject(projectId: string): string {
  return `${MemoryThreadPrefix.Storyteller}:${projectId}:`
}

function createdAtMs(value: unknown): number | undefined {
  if (value instanceof Date) {
    const ms = value.getTime()
    return Number.isFinite(ms) ? ms : undefined
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return undefined
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : undefined
}

function recordsFromSql(result: unknown): MemoryMessageRecord[] {
  const records: MemoryMessageRecord[] = []
  for (const row of sqlResultRows(result)) {
    const id = readRowString(row, MastraMessageColumn.Id)
    const threadId = readRowString(row, MastraMessageColumn.ThreadId)
    const created = createdAtMs(row[MastraMessageColumn.CreatedAt])
    if (!id || !threadId || created === undefined) continue
    records.push({ id, threadId, createdAtMs: created })
  }
  return records
}

async function listProjectMemoryMessages(projectId: string): Promise<MemoryMessageRecord[]> {
  const prefix = `${threadPrefixForProject(projectId)}%`
  const result = await db.execute(sql`
    SELECT ${sql.raw(MastraMessageColumn.Id)}, ${sql.raw(MastraMessageColumn.ThreadId)}, ${sql.raw(`"${MastraMessageColumn.CreatedAt}"`)}
    FROM ${sql.raw(MastraMemoryTable.Messages)}
    WHERE ${sql.raw(MastraMessageColumn.ThreadId)} LIKE ${prefix}
  `)
  return recordsFromSql(result)
}

async function deleteMemoryMessages(ids: readonly string[]): Promise<number> {
  if (ids.length === 0) return 0
  await db.execute(sql`
    DELETE FROM ${sql.raw(MastraMemoryTable.Messages)}
    WHERE ${sql.raw(MastraMessageColumn.Id)} = ANY(${ids})
  `)
  return ids.length
}

export const pruneMastraMemoryTask = defineOwnedTask({
  id: PRUNE_MASTRA_MEMORY_TASK_ID,
  schema: pruneMastraMemoryPayloadSchema,
  queue: JobQueue.Storage,
  maxDuration: 120,
  run: async payload =>
    pruneMastraMemory(
      {
        listMessages: listProjectMemoryMessages,
        deleteMessages: deleteMemoryMessages,
      },
      payload.projectId,
    ),
})
