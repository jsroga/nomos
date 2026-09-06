import '@/shared/data/server-guard'
import { and, eq, isNull } from 'drizzle-orm'
import { knowledgeLedger } from '@/db/schema'
import { db } from '@/domains/storyteller/core/io/beat-sequence'
import type { KnowledgeLedgerCanonRow } from '@/domains/storyteller/core/knowledge-ledger/canon-row'

function stringsFromJson(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string')
}

export async function listKnowledgeLedgerRows(projectId: string): Promise<KnowledgeLedgerCanonRow[]> {
  try {
    const rows = await db
      .select({
        factText: knowledgeLedger.factText,
        authorTruth: knowledgeLedger.authorTruth,
        knownBy: knowledgeLedger.knownBy,
      })
      .from(knowledgeLedger)
      .where(and(eq(knowledgeLedger.projectId, projectId), isNull(knowledgeLedger.revokedAt)))
    return rows.map(row => ({
      factText: row.factText,
      authorTruth: row.authorTruth,
      knownBy: stringsFromJson(row.knownBy),
    }))
  } catch {
    return []
  }
}

export async function writeKnowledgeLedgerRows(input: {
  projectId: string
  episodeId: string
  beatId: string
  rows: readonly KnowledgeLedgerCanonRow[]
}): Promise<void> {
  if (input.rows.length === 0) return
  try {
    await db.insert(knowledgeLedger).values(
      input.rows.map(row => ({
        projectId: input.projectId,
        episodeId: input.episodeId,
        beatId: input.beatId,
        factText: row.factText,
        authorTruth: row.authorTruth,
        knownBy: row.knownBy,
      }))
    )
  } catch {
    // Table may not be applied yet; beat persist must still succeed.
  }
}
