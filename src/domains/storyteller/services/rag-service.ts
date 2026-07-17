/**
 * RAG Service - Enhanced with Voyage AI and Hybrid Search
 */

import {
  getVoyageEmbeddings,
  VoyageEmbeddings,
} from '@/shared/ai/embeddings/voyage-embeddings'
import {
  getHybridSearchEngine,
  HybridSearchEngine,
  SearchResult,
} from '@/shared/ai/rag/hybrid-search'
import { getSemanticChunker, SemanticChunker } from '@/shared/ai/rag/semantic-chunker'
import { getQueryExpander, QueryExpander } from '@/shared/ai/rag/query-expander'
import { getReranker, Reranker } from '@/shared/ai/rag/reranker'
import { STORYTELLER_CONFIG } from '../config/storyteller-config'
import {
  RagDocumentType,
  RagServiceLog,
} from '@/domains/storyteller/services/constants/rag-document-type'
import {
  ingestChunkedDocument,
  ingestSingleDocument,
  shouldChunkDocumentType,
  type RagIngestOptions,
} from './rag-ingest-helpers'
import {
  convertSearchResultsToRagResults,
  deduplicateSearchResults,
  fallbackVectorSearch,
  formatResultsWithCitations,
} from './rag-retrieve-helpers'
import type { CitationInfo, RagResult, RetrieveOptions } from './rag-types'

export type DocumentType = `${RagDocumentType}`
export type { CitationInfo, RagResult, RetrieveOptions }

const semanticCache = new Map<string, { results: RagResult[]; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000
const sessionCitations = new Map<string, CitationInfo[]>()

export class RagService {
  private embeddings: VoyageEmbeddings
  private searchEngine: HybridSearchEngine
  private chunker: SemanticChunker
  private queryExpander: QueryExpander
  private reranker: Reranker

  constructor() {
    this.embeddings = getVoyageEmbeddings()
    this.searchEngine = getHybridSearchEngine()
    this.chunker = getSemanticChunker()
    this.queryExpander = getQueryExpander({ useLLM: false })
    this.reranker = getReranker()
  }

  async ingest(projectId: string, content: string, options: RagIngestOptions) {
    const shouldChunk = options.chunkDocument ?? shouldChunkDocumentType(options.documentType)

    if (shouldChunk) {
      await ingestChunkedDocument(projectId, content, options, this.chunker, this.embeddings)
    } else {
      await ingestSingleDocument(projectId, content, options, this.embeddings)
    }

    this.invalidateCacheForProject(projectId)
  }

  async storeBeatDecision(
    projectId: string,
    beatLogline: string,
    decision: 'approved' | 'rejected' | 'revised',
    reasoning: string,
    agentName: string,
    beatId?: string
  ) {
    const content = `Beat: "${beatLogline}"
Decision: ${decision.toUpperCase()}
Reasoning: ${reasoning}
By: ${agentName}`

    await this.ingest(projectId, content, {
      documentType: RagDocumentType.BeatDecision,
      beatId,
      agentName,
      chunkDocument: false,
    })
  }

  async storeCharacterArc(
    projectId: string,
    characterName: string,
    development: string,
    episodeId?: string,
    characterId?: string
  ) {
    const content = `Character: ${characterName}
Development: ${development}`

    await this.ingest(projectId, content, {
      documentType: RagDocumentType.CharacterArc,
      characterId,
      episodeId,
    })
  }

  async storeUserFeedback(projectId: string, feedback: string, context: string) {
    const content = `User Feedback: ${feedback}
Context: ${context}`

    await this.ingest(projectId, content, {
      documentType: RagDocumentType.UserFeedback,
      chunkDocument: false,
    })
  }

  async retrieve(
    projectId: string,
    query: string,
    options: RetrieveOptions = {}
  ): Promise<RagResult[]> {
    const {
      limit = 5,
      useQueryExpansion = STORYTELLER_CONFIG.features.ragEnabled,
      useReranking = true,
      documentType,
    } = options

    const cacheKey = `${projectId}:${query}:${limit}:${useQueryExpansion}:${useReranking}`
    const cached = semanticCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.results
    }

    try {
      const queries = await this.expandQueries(query, useQueryExpansion)
      const allResults = await this.searchExpandedQueries(projectId, queries, documentType, limit, useReranking)
      const uniqueResults = deduplicateSearchResults(allResults)
      const finalResults = await this.finalizeSearchResults(query, uniqueResults, limit, useReranking)
      const results = convertSearchResultsToRagResults(finalResults)

      semanticCache.set(cacheKey, { results, timestamp: Date.now() })
      return results
    } catch (error) {
      console.warn(RagServiceLog.RetrievalFailed, error)
      return fallbackVectorSearch(projectId, query, limit, q => this.embeddings.embedQuery(q))
    }
  }

  async retrieveByType(
    projectId: string,
    documentType: DocumentType,
    query: string,
    limit = 5
  ): Promise<RagResult[]> {
    return this.retrieve(projectId, query, {
      limit,
      documentType,
      useQueryExpansion: true,
      useReranking: true,
    })
  }

  async retrieveCharacterHistory(projectId: string, characterName: string, limit = 10): Promise<RagResult[]> {
    return this.retrieveByType(
      projectId,
      RagDocumentType.CharacterArc,
      `${characterName} character development arc`,
      limit
    )
  }

  async retrieveSimilarBeatDecisions(projectId: string, beatLogline: string, limit = 5): Promise<RagResult[]> {
    return this.retrieveByType(projectId, RagDocumentType.BeatDecision, beatLogline, limit)
  }

  async retrieveUserPreferences(projectId: string, context: string, limit = 5): Promise<RagResult[]> {
    return this.retrieveByType(projectId, RagDocumentType.UserFeedback, context, limit)
  }

  async assembleAgentContext(
    projectId: string,
    _agentRole: string,
    currentContext: string
  ): Promise<{
    relevantHistory: string
    pastDecisions: string
    userPreferences: string
    citations: CitationInfo[]
  }> {
    const [generalHistory, pastDecisions, userPrefs] = await Promise.all([
      this.retrieve(projectId, currentContext, { limit: 3 }),
      this.retrieveByType(projectId, RagDocumentType.BeatDecision, currentContext, 3),
      this.retrieveByType(projectId, RagDocumentType.UserFeedback, currentContext, 2),
    ])

    const historyFormatted = formatResultsWithCitations(generalHistory)
    const decisionsFormatted = formatResultsWithCitations(pastDecisions)
    const prefsFormatted = formatResultsWithCitations(userPrefs)

    return {
      relevantHistory: historyFormatted.text,
      pastDecisions: decisionsFormatted.text,
      userPreferences: prefsFormatted.text,
      citations: [
        ...historyFormatted.citations,
        ...decisionsFormatted.citations,
        ...prefsFormatted.citations,
      ],
    }
  }

  startCitationSession(sessionId: string): void {
    sessionCitations.set(sessionId, [])
  }

  addSessionCitations(sessionId: string, citations: CitationInfo[]): void {
    const existing = sessionCitations.get(sessionId) || []
    sessionCitations.set(sessionId, [...existing, ...citations])
  }

  getSessionCitations(sessionId: string): CitationInfo[] {
    return sessionCitations.get(sessionId) || []
  }

  endCitationSession(sessionId: string): CitationInfo[] {
    const citations = sessionCitations.get(sessionId) || []
    sessionCitations.delete(sessionId)
    return citations
  }

  clearCache() {
    semanticCache.clear()
  }

  private async expandQueries(query: string, useQueryExpansion: boolean): Promise<string[]> {
    if (!useQueryExpansion) return [query]

    const expansion = await this.queryExpander.expand(query)
    if (STORYTELLER_CONFIG.debug.logRAGQueries) {
      console.log(`[RAG] Expanded query: "${query}" -> ${expansion.expanded.length} queries`)
    }
    return expansion.expanded
  }

  private async searchExpandedQueries(
    projectId: string,
    queries: string[],
    documentType: DocumentType | undefined,
    limit: number,
    useReranking: boolean
  ): Promise<SearchResult[]> {
    const fetchLimit = useReranking ? limit * 2 : limit
    const limitedQueries = queries.slice(0, 3)

    const searchPromises = limitedQueries.map(q =>
      this.searchEngine.search(
        projectId,
        q,
        documentType ? { documentTypes: [documentType] } : undefined,
        { topK: fetchLimit }
      )
    )

    const searchResultsArrays = await Promise.all(searchPromises)
    return searchResultsArrays.flat()
  }

  private async finalizeSearchResults(
    query: string,
    uniqueResults: SearchResult[],
    limit: number,
    useReranking: boolean
  ): Promise<SearchResult[]> {
    if (useReranking && uniqueResults.length > limit) {
      const reranked = await this.reranker.rerank(query, uniqueResults)
      if (STORYTELLER_CONFIG.debug.logRAGQueries) {
        console.log(`[RAG] Reranked ${uniqueResults.length} -> ${reranked.results.length} results`)
      }
      return reranked.results.slice(0, limit)
    }
    return uniqueResults.slice(0, limit)
  }

  private invalidateCacheForProject(projectId: string) {
    for (const key of semanticCache.keys()) {
      if (key.startsWith(`${projectId}:`)) {
        semanticCache.delete(key)
      }
    }
  }
}

export const ragService = new RagService()
