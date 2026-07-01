/**
 * Hybrid Search Engine
 *
 * Combines vector search (semantic) with full-text search (keyword)
 * using Reciprocal Rank Fusion (RRF) for optimal retrieval.
 */

import { db } from '@/lib/db'
import { documentEmbeddings } from '@/db'
import { sql, and, desc } from 'drizzle-orm'
import { getVoyageEmbeddings } from '../embeddings/voyage-embeddings'

export interface SearchResult {
  id: string
  chunkId: string
  content: string
  metadata: Record<string, unknown>
  vectorScore: number
  keywordScore: number
  combinedScore: number
}

export interface HybridSearchConfig {
  vectorWeight: number // Weight for semantic search (0-1)
  keywordWeight: number // Weight for keyword search (0-1)
  topK: number // Number of results to return
  minScore: number // Minimum combined score threshold
  useReranking: boolean // Whether to apply reranking
}

const DEFAULT_CONFIG: HybridSearchConfig = {
  vectorWeight: 0.7,
  keywordWeight: 0.3,
  topK: 10,
  minScore: 0.3,
  useReranking: true,
}

// RRF constant (standard value from literature)
const RRF_K = 60

/**
 * Calculate Reciprocal Rank Fusion score
 */
function calculateRRF(
  vectorRank: number | null,
  keywordRank: number | null,
  config: HybridSearchConfig
): number {
  let score = 0

  if (vectorRank !== null) {
    score += config.vectorWeight * (1 / (RRF_K + vectorRank))
  }

  if (keywordRank !== null) {
    score += config.keywordWeight * (1 / (RRF_K + keywordRank))
  }

  return score
}

/**
 * Normalize scores to 0-1 range
 */
function normalizeScores(results: SearchResult[]): SearchResult[] {
  if (results.length === 0) return results

  const maxScore = Math.max(...results.map(r => r.combinedScore))
  const minScore = Math.min(...results.map(r => r.combinedScore))
  const range = maxScore - minScore || 1

  return results.map(r => ({
    ...r,
    combinedScore: (r.combinedScore - minScore) / range,
  }))
}

export class HybridSearchEngine {
  private embeddings = getVoyageEmbeddings()
  private config: HybridSearchConfig

  constructor(config?: Partial<HybridSearchConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Perform hybrid search combining vector and keyword search
   */
  async search(
    projectId: string,
    query: string,
    filters?: {
      documentTypes?: string[]
      episodeId?: string
      characterIds?: string[]
    },
    config?: Partial<HybridSearchConfig>
  ): Promise<SearchResult[]> {
    const searchConfig = { ...this.config, ...config }
    const fetchCount = searchConfig.topK * 3 // Fetch more for fusion

    // Run vector and keyword searches in parallel
    const [vectorResults, keywordResults] = await Promise.all([
      this.vectorSearch(projectId, query, filters, fetchCount),
      this.keywordSearch(projectId, query, filters, fetchCount),
    ])

    // Create lookup maps for ranking
    const vectorRanks = new Map<string, number>()
    const keywordRanks = new Map<string, number>()
    const contentMap = new Map<string, { content: string; metadata: Record<string, unknown> }>()

    vectorResults.forEach((result, index) => {
      vectorRanks.set(result.id, index + 1)
      contentMap.set(result.id, { content: result.content, metadata: result.metadata })
    })

    keywordResults.forEach((result, index) => {
      keywordRanks.set(result.id, index + 1)
      if (!contentMap.has(result.id)) {
        contentMap.set(result.id, { content: result.content, metadata: result.metadata })
      }
    })

    // Combine all unique document IDs
    const allIds = new Set([...vectorRanks.keys(), ...keywordRanks.keys()])

    // Calculate RRF scores
    const results: SearchResult[] = []

    for (const id of allIds) {
      const vectorRank = vectorRanks.get(id) ?? null
      const keywordRank = keywordRanks.get(id) ?? null
      const combinedScore = calculateRRF(vectorRank, keywordRank, searchConfig)

      const data = contentMap.get(id)!

      results.push({
        id,
        chunkId: id,
        content: data.content,
        metadata: data.metadata,
        vectorScore: vectorRank ? 1 / (RRF_K + vectorRank) : 0,
        keywordScore: keywordRank ? 1 / (RRF_K + keywordRank) : 0,
        combinedScore,
      })
    }

    // Sort by combined score
    results.sort((a, b) => b.combinedScore - a.combinedScore)

    // Normalize scores and filter
    const normalized = normalizeScores(results)
    const filtered = normalized.filter(r => r.combinedScore >= searchConfig.minScore)

    return filtered.slice(0, searchConfig.topK)
  }

  /**
   * Vector search using embeddings
   */
  private async vectorSearch(
    projectId: string,
    query: string,
    filters?: {
      documentTypes?: string[]
      episodeId?: string
      characterIds?: string[]
    },
    limit: number = 20
  ): Promise<Array<{ id: string; content: string; metadata: Record<string, unknown>; score: number }>> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddings.embedQuery(query)

      // Build filter conditions
      const conditions = [sql`${documentEmbeddings.projectId} = ${projectId}`]

      if (filters?.documentTypes && filters.documentTypes.length > 0) {
        // Convert JS array to PostgreSQL array literal format: {val1,val2,...}
        const pgArray = `{${filters.documentTypes.join(',')}}`
        conditions.push(
          sql`${documentEmbeddings.metadata}->>'documentType' = ANY(${pgArray}::text[])`
        )
      }

      if (filters?.episodeId) {
        conditions.push(sql`${documentEmbeddings.metadata}->>'episodeId' = ${filters.episodeId}`)
      }

      // Calculate similarity using cosine distance
      const similarity = sql<number>`1 - (${documentEmbeddings.embedding} <=> ${JSON.stringify(queryEmbedding)})`

      const results = await db
        .select({
          id: documentEmbeddings.id,
          content: documentEmbeddings.content,
          metadata: documentEmbeddings.metadata,
          score: similarity,
        })
        .from(documentEmbeddings)
        .where(and(...conditions))
        .orderBy(desc(similarity))
        .limit(limit)

      return results.map(r => ({
        id: r.id,
        content: r.content,
        metadata: r.metadata as Record<string, unknown>,
        score: r.score,
      }))
    } catch (error) {
      console.error('[HybridSearch] Vector search failed:', error)
      return []
    }
  }

  /**
   * Keyword search using PostgreSQL full-text search
   */
  private async keywordSearch(
    projectId: string,
    query: string,
    filters?: {
      documentTypes?: string[]
      episodeId?: string
      characterIds?: string[]
    },
    limit: number = 20
  ): Promise<Array<{ id: string; content: string; metadata: Record<string, unknown>; score: number }>> {
    try {
      // Build filter conditions
      const conditions = [sql`${documentEmbeddings.projectId} = ${projectId}`]

      if (filters?.documentTypes && filters.documentTypes.length > 0) {
        // Convert JS array to PostgreSQL array literal format: {val1,val2,...}
        const pgArray = `{${filters.documentTypes.join(',')}}`
        conditions.push(
          sql`${documentEmbeddings.metadata}->>'documentType' = ANY(${pgArray}::text[])`
        )
      }

      if (filters?.episodeId) {
        conditions.push(sql`${documentEmbeddings.metadata}->>'episodeId' = ${filters.episodeId}`)
      }

      // Full-text search using ILIKE for basic keyword matching
      // This is a fallback since content_tsv column might not exist yet
      const searchPattern = `%${query.toLowerCase().split(/\s+/).join('%')}%`
      conditions.push(sql`LOWER(${documentEmbeddings.content}) LIKE ${searchPattern}`)

      const results = await db
        .select({
          id: documentEmbeddings.id,
          content: documentEmbeddings.content,
          metadata: documentEmbeddings.metadata,
        })
        .from(documentEmbeddings)
        .where(and(...conditions))
        .limit(limit)

      // Calculate simple keyword match score
      const queryTerms = query
        .toLowerCase()
        .split(/\s+/)
        .filter(t => t.length > 2)

      return results
        .map(r => {
          const contentLower = r.content.toLowerCase()
          const matchCount = queryTerms.filter(term => contentLower.includes(term)).length
          const score = queryTerms.length > 0 ? matchCount / queryTerms.length : 0

          return {
            id: r.id,
            content: r.content,
            metadata: r.metadata as Record<string, unknown>,
            score,
          }
        })
        .sort((a, b) => b.score - a.score)
    } catch (error) {
      console.error('[HybridSearch] Keyword search failed:', error)
      return []
    }
  }

  /**
   * Search with automatic type detection
   */
  async semanticSearch(
    projectId: string,
    query: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    return this.search(projectId, query, undefined, { topK: limit })
  }

  /**
   * Search filtered by document type
   */
  async searchByType(
    projectId: string,
    documentType: string,
    query: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    return this.search(projectId, query, { documentTypes: [documentType] }, { topK: limit })
  }
}

// Singleton instance
let searchEngineInstance: HybridSearchEngine | null = null

export function getHybridSearchEngine(config?: Partial<HybridSearchConfig>): HybridSearchEngine {
  if (!searchEngineInstance) {
    searchEngineInstance = new HybridSearchEngine(config)
  }
  return searchEngineInstance
}
