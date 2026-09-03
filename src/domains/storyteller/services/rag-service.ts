/**
 * RAG Service - Enhanced with Voyage AI and Hybrid Search
 */

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
import type { ProjectScope } from '@/shared/auth/project-scope'

export type DocumentType = `${RagDocumentType}`
export type { CitationInfo, RagResult, RetrieveOptions }

const semanticCache = new Map<string, { results: RagResult[]; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000
const sessionCitations = new Map<string, CitationInfo[]>()

export class RagService {
  private searchEngine: HybridSearchEngine
  private chunker: SemanticChunker
  private queryExpander: QueryExpander
  private reranker: Reranker

  constructor() {
    this.searchEngine = getHybridSearchEngine()
    this.chunker = getSemanticChunker()
    this.queryExpander = getQueryExpander({ useLLM: false })
    this.reranker = getReranker()
  }

  async ingest(scope: ProjectScope, content: string, options: RagIngestOptions) {
    const shouldChunk = options.chunkDocument ?? shouldChunkDocumentType(options.documentType)

    if (shouldChunk) {
      await ingestChunkedDocument(scope, content, options, this.chunker)
    } else {
      await ingestSingleDocument(scope, content, options)
    }

    this.invalidateCacheForProject(scope.projectId)
  }

  async storeBeatDecision(
    scope: ProjectScope,
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

    await this.ingest(scope, content, {
      documentType: RagDocumentType.BeatDecision,
      beatId,
      agentName,
      chunkDocument: false,
    })
  }

  async storeCharacterArc(
    scope: ProjectScope,
    characterName: string,
    development: string,
    episodeId?: string,
    characterId?: string
  ) {
    const content = `Character: ${characterName}
Development: ${development}`

    await this.ingest(scope, content, {
      documentType: RagDocumentType.CharacterArc,
      characterId,
      episodeId,
    })
  }

  async storeUserFeedback(scope: ProjectScope, feedback: string, context: string) {
    const content = `User Feedback: ${feedback}
Context: ${context}`

    await this.ingest(scope, content, {
      documentType: RagDocumentType.UserFeedback,
      chunkDocument: false,
    })
  }

  async retrieve(
    scope: ProjectScope,
    query: string,
    options: RetrieveOptions = {}
  ): Promise<RagResult[]> {
    const { projectId } = scope
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
      const allResults = await this.searchExpandedQueries(scope, queries, documentType, limit, useReranking)
      const uniqueResults = deduplicateSearchResults(allResults)
      const finalResults = await this.finalizeSearchResults(
        scope,
        query,
        uniqueResults,
        limit,
        useReranking,
      )
      const results = convertSearchResultsToRagResults(finalResults)

      semanticCache.set(cacheKey, { results, timestamp: Date.now() })
      return results
    } catch (error) {
      console.warn(RagServiceLog.RetrievalFailed, error)
      return fallbackVectorSearch(scope, query, limit)
    }
  }

  async retrieveByType(
    scope: ProjectScope,
    documentType: DocumentType,
    query: string,
    limit = 5
  ): Promise<RagResult[]> {
    return this.retrieve(scope, query, {
      limit,
      documentType,
      useQueryExpansion: true,
      useReranking: true,
    })
  }

  async retrieveCharacterHistory(scope: ProjectScope, characterName: string, limit = 10): Promise<RagResult[]> {
    return this.retrieveByType(
      scope,
      RagDocumentType.CharacterArc,
      `${characterName} character development arc`,
      limit
    )
  }

  async retrieveSimilarBeatDecisions(scope: ProjectScope, beatLogline: string, limit = 5): Promise<RagResult[]> {
    return this.retrieveByType(scope, RagDocumentType.BeatDecision, beatLogline, limit)
  }

  async retrieveUserPreferences(scope: ProjectScope, context: string, limit = 5): Promise<RagResult[]> {
    return this.retrieveByType(scope, RagDocumentType.UserFeedback, context, limit)
  }

  async assembleAgentContext(
    scope: ProjectScope,
    _agentRole: string,
    currentContext: string
  ): Promise<{
    relevantHistory: string
    pastDecisions: string
    userPreferences: string
    citations: CitationInfo[]
  }> {
    const [generalHistory, pastDecisions, userPrefs] = await Promise.all([
      this.retrieve(scope, currentContext, { limit: 3 }),
      this.retrieveByType(scope, RagDocumentType.BeatDecision, currentContext, 3),
      this.retrieveByType(scope, RagDocumentType.UserFeedback, currentContext, 2),
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
    scope: ProjectScope,
    queries: string[],
    documentType: DocumentType | undefined,
    limit: number,
    useReranking: boolean
  ): Promise<SearchResult[]> {
    const fetchLimit = useReranking ? limit * 2 : limit
    const limitedQueries = queries.slice(0, 3)

    const searchPromises = limitedQueries.map(q =>
      this.searchEngine.search(
        scope,
        q,
        documentType ? { documentTypes: [documentType] } : undefined,
        { topK: fetchLimit }
      )
    )

    const searchResultsArrays = await Promise.all(searchPromises)
    return searchResultsArrays.flat()
  }

  private async finalizeSearchResults(
    scope: ProjectScope,
    query: string,
    uniqueResults: SearchResult[],
    limit: number,
    useReranking: boolean
  ): Promise<SearchResult[]> {
    if (useReranking && uniqueResults.length > limit) {
      const reranked = await this.reranker.rerank(scope, query, uniqueResults)
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
