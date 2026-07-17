import { documentEmbeddings } from '@/db'
import { db } from '@/db/client'
import { desc, sql } from 'drizzle-orm'
import type { SearchResult } from '@/shared/ai/rag/hybrid-search'
import { entityMetadata } from '@/domains/storyteller/core/entities/entity-type-guards'
import { readString } from '@/shared/data/json-guards'
import {
  RAG_CONTEXT_SEPARATOR,
  RagUnknownValue,
  RagServiceLog,
} from '@/domains/storyteller/services/constants/rag-document-type'
import type { CitationInfo, RagResult } from './rag-types'

export function deduplicateSearchResults(results: SearchResult[]): SearchResult[] {
  const byId = new Map<string, SearchResult>()

  for (const result of results) {
    const existing = byId.get(result.id)
    if (!existing || result.combinedScore > existing.combinedScore) {
      byId.set(result.id, result)
    }
  }

  return Array.from(byId.values()).sort((a, b) => b.combinedScore - a.combinedScore)
}

export function convertSearchResultsToRagResults(searchResults: SearchResult[]): RagResult[] {
  return searchResults.map((result, index) => ({
    id: result.id,
    content: result.content,
    metadata: result.metadata,
    similarity: result.combinedScore,
    citation: {
      id: result.chunkId,
      marker: `[${index + 1}]`,
      source: String(result.metadata.documentType || RagUnknownValue.Unknown),
      chunkId: result.chunkId,
      confidence: result.combinedScore,
    },
  }))
}

export async function fallbackVectorSearch(
  projectId: string,
  query: string,
  limit: number,
  embedQuery: (query: string) => Promise<number[]>
): Promise<RagResult[]> {
  try {
    const queryEmbedding = await embedQuery(query)
    const similarity = sql<number>`1 - (${documentEmbeddings.embedding} <=> ${JSON.stringify(queryEmbedding)})`

    const results = await db
      .select({
        id: documentEmbeddings.id,
        content: documentEmbeddings.content,
        metadata: documentEmbeddings.metadata,
        similarity,
      })
      .from(documentEmbeddings)
      .where(sql`${documentEmbeddings.projectId} = ${projectId}`)
      .orderBy(desc(similarity))
      .limit(limit)

    return results.map((r, index) => {
      const metadata = entityMetadata(r.metadata)
      return {
        id: r.id,
        content: r.content,
        metadata,
        similarity: r.similarity,
        citation: {
          id: r.id,
          marker: `[${index + 1}]`,
          source: readString(metadata.documentType) ?? RagUnknownValue.Unknown,
          chunkId: r.id,
          confidence: r.similarity,
        },
      }
    })
  } catch (error) {
    console.error(RagServiceLog.FallbackSearchFailed, error)
    return []
  }
}

export function formatResultsWithCitations(results: RagResult[]): {
  text: string
  citations: CitationInfo[]
} {
  const citations: CitationInfo[] = []
  let citationIndex = 1

  const text = results
    .map(r => {
      if (r.citation) {
        r.citation.marker = `[${citationIndex}]`
        citations.push(r.citation)
        citationIndex++
        return `${r.citation.marker} ${r.content}`
      }
      return r.content
    })
    .join(RAG_CONTEXT_SEPARATOR)

  return { text, citations }
}
