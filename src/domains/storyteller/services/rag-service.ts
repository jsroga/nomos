/**
 * RAG Service - Enhanced with Voyage AI and Hybrid Search
 * 
 * Production-grade retrieval-augmented generation service featuring:
 * - Voyage AI embeddings (voyage-3) for superior retrieval
 * - Hybrid search combining vector + keyword matching
 * - Semantic chunking with overlap
 * - Citation tracking for grounded generation
 */

import { db } from '@/lib/db'
import { documentEmbeddings } from '../db/schema'
import { desc, sql, and } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { 
  getVoyageEmbeddings, 
  VoyageEmbeddings 
} from '@/infrastructure/ai/embeddings/voyage-embeddings'
import { 
  getHybridSearchEngine, 
  HybridSearchEngine,
  SearchResult 
} from '@/infrastructure/ai/rag/hybrid-search'
import { 
  getSemanticChunker, 
  SemanticChunker,
  DocumentChunk 
} from '@/infrastructure/ai/rag/semantic-chunker'
import {
  getQueryExpander,
  QueryExpander,
} from '@/infrastructure/ai/rag/query-expander'
import {
  getReranker,
  Reranker,
} from '@/infrastructure/ai/rag/reranker'
import { STORYTELLER_CONFIG } from '../config/storyteller-config'

// Document types for categorized retrieval
export type DocumentType =
  | 'beat_decision'    // Past beat creation/rejection with reasoning
  | 'character_arc'    // Character development history
  | 'world_rule'       // Series bible world rules
  | 'episode_summary'  // Episode summaries
  | 'user_feedback'    // User corrections/preferences
  | 'agent_reasoning'  // Agent thought processes

export interface RagResult {
  id: string
  content: string
  metadata: Record<string, any>
  similarity: number
  citation?: CitationInfo
}

export interface CitationInfo {
  id: string
  marker: string        // [1], [2], etc.
  source: string        // Document type
  chunkId: string
  confidence: number
}

export interface IngestOptions {
  documentType: DocumentType
  episodeId?: string
  characterId?: string
  beatId?: string
  agentName?: string
  chunkDocument?: boolean  // Whether to chunk the document
}

// Simple in-memory cache for semantic queries
const semanticCache = new Map<string, { results: RagResult[]; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// Citation tracking for current session
const sessionCitations = new Map<string, CitationInfo[]>()

export interface RetrieveOptions {
  limit?: number
  useQueryExpansion?: boolean
  useReranking?: boolean
  documentType?: DocumentType
}

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
    this.queryExpander = getQueryExpander({ useLLM: false })  // Fast heuristic by default
    this.reranker = getReranker()
  }

  /**
   * Ingest a document with typed metadata
   * Optionally chunks the document for better retrieval
   */
  async ingest(projectId: string, content: string, options: IngestOptions) {
    // Determine if we should chunk
    const shouldChunk = options.chunkDocument ?? this.shouldChunkByType(options.documentType)

    if (shouldChunk) {
      await this.ingestWithChunking(projectId, content, options)
    } else {
      await this.ingestSingle(projectId, content, options)
    }

    // Invalidate cache for this project
    this.invalidateCacheForProject(projectId)
  }

  /**
   * Determine if document type benefits from chunking
   */
  private shouldChunkByType(documentType: DocumentType): boolean {
    // These types are typically short and should not be chunked
    const noChunkTypes: DocumentType[] = ['beat_decision', 'user_feedback']
    return !noChunkTypes.includes(documentType)
  }

  /**
   * Ingest with semantic chunking
   */
  private async ingestWithChunking(projectId: string, content: string, options: IngestOptions) {
    const documentId = uuidv4()
    
    // Chunk the document
    const chunks = this.chunker.chunkDocument(content, {
      documentId,
      projectId,
      documentType: options.documentType,
    })

    // Generate embeddings for all chunks in batch
    const chunkContents = chunks.map(c => c.content)
    const embeddings = await this.embeddings.embedDocuments(chunkContents)

    // Store each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const metadata = {
        ...chunk.metadata,
        documentType: options.documentType,
        episodeId: options.episodeId,
        characterId: options.characterId,
        beatId: options.beatId,
        agentName: options.agentName,
        isChunk: true,
        parentDocumentId: documentId,
      }

      await db.insert(documentEmbeddings).values({
        id: chunk.id,
        projectId,
        content: chunk.content,
        metadata,
        embedding: embeddings[i],
      })
    }

    console.log(`[RAG] Ingested ${chunks.length} chunks for document ${documentId}`)
  }

  /**
   * Ingest single document without chunking
   */
  private async ingestSingle(projectId: string, content: string, options: IngestOptions) {
    // Generate embedding
    const embedding = await this.embeddings.embedQuery(content)

    const metadata = {
      documentType: options.documentType,
      episodeId: options.episodeId,
      characterId: options.characterId,
      beatId: options.beatId,
      agentName: options.agentName,
      timestamp: Date.now(),
      isChunk: false,
    }

    await db.insert(documentEmbeddings).values({
      projectId,
      content,
      metadata,
      embedding,
    })
  }

  /**
   * Store beat decision with reasoning for future reference
   */
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
      documentType: 'beat_decision',
      beatId,
      agentName,
      chunkDocument: false, // Beat decisions should stay whole
    })
  }

  /**
   * Store character arc progression
   */
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
      documentType: 'character_arc',
      characterId,
      episodeId,
    })
  }

  /**
   * Store user feedback for learning
   */
  async storeUserFeedback(projectId: string, feedback: string, context: string) {
    const content = `User Feedback: ${feedback}
Context: ${context}`

    await this.ingest(projectId, content, {
      documentType: 'user_feedback',
      chunkDocument: false,
    })
  }

  /**
   * Retrieve with hybrid search (vector + keyword)
   * Returns results with citation information
   * 
   * Enhanced with:
   * - Query expansion (optional) - breaks complex queries into sub-queries
   * - Re-ranking (optional) - improves result ordering
   */
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

    // Check cache
    const cacheKey = `${projectId}:${query}:${limit}:${useQueryExpansion}:${useReranking}`
    const cached = semanticCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.results
    }

    try {
      // Step 1: Query Expansion (optional)
      let queries = [query]
      if (useQueryExpansion) {
        const expansion = await this.queryExpander.expand(query)
        queries = expansion.expanded
        if (STORYTELLER_CONFIG.debug.logRAGQueries) {
          console.log(`[RAG] Expanded query: "${query}" -> ${queries.length} queries`)
        }
      }

      // Step 2: Retrieve for all expanded queries
      const allResults: SearchResult[] = []
      const fetchLimit = useReranking ? limit * 2 : limit  // Fetch more if reranking

      for (const q of queries.slice(0, 3)) {  // Limit to 3 expanded queries
        const searchResults = await this.searchEngine.search(
          projectId,
          q,
          documentType ? { documentTypes: [documentType] } : undefined,
          { topK: fetchLimit }
        )
        allResults.push(...searchResults)
      }

      // Deduplicate by ID
      const uniqueResults = this.deduplicateResults(allResults)

      // Step 3: Re-ranking (optional)
      let finalResults: SearchResult[]
      if (useReranking && uniqueResults.length > limit) {
        const reranked = await this.reranker.rerank(query, uniqueResults)
        finalResults = reranked.results.slice(0, limit)
        if (STORYTELLER_CONFIG.debug.logRAGQueries) {
          console.log(`[RAG] Reranked ${uniqueResults.length} -> ${finalResults.length} results`)
        }
      } else {
        finalResults = uniqueResults.slice(0, limit)
      }

      // Convert to RagResult with citations
      const results = this.convertToRagResults(finalResults)

      // Cache results
      semanticCache.set(cacheKey, { results, timestamp: Date.now() })

      return results
    } catch (error) {
      console.warn('[RAG] Retrieval failed:', error)
      // Fallback to simple vector search
      return this.fallbackVectorSearch(projectId, query, limit)
    }
  }

  /**
   * Deduplicate search results by ID, keeping highest score
   */
  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const byId = new Map<string, SearchResult>()
    
    for (const result of results) {
      const existing = byId.get(result.id)
      if (!existing || result.combinedScore > existing.combinedScore) {
        byId.set(result.id, result)
      }
    }
    
    return Array.from(byId.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
  }

  /**
   * Retrieve documents of a specific type using hybrid search
   * Uses the enhanced retrieve method with query expansion and reranking
   */
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

  /**
   * Convert search results to RAG results with citations
   */
  private convertToRagResults(searchResults: SearchResult[]): RagResult[] {
    return searchResults.map((result, index) => ({
      id: result.id,
      content: result.content,
      metadata: result.metadata,
      similarity: result.combinedScore,
      citation: {
        id: result.chunkId,
        marker: `[${index + 1}]`,
        source: result.metadata.documentType || 'unknown',
        chunkId: result.chunkId,
        confidence: result.combinedScore,
      },
    }))
  }

  /**
   * Fallback to simple vector search if hybrid fails
   */
  private async fallbackVectorSearch(
    projectId: string,
    query: string,
    limit: number
  ): Promise<RagResult[]> {
    try {
      const queryEmbedding = await this.embeddings.embedQuery(query)
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

      return results.map((r, index) => ({
        id: r.id,
        content: r.content,
        metadata: r.metadata as Record<string, any>,
        similarity: r.similarity,
        citation: {
          id: r.id,
          marker: `[${index + 1}]`,
          source: (r.metadata as any)?.documentType || 'unknown',
          chunkId: r.id,
          confidence: r.similarity,
        },
      }))
    } catch (error) {
      console.error('[RAG] Fallback search failed:', error)
      return []
    }
  }

  /**
   * Retrieve character history
   */
  async retrieveCharacterHistory(
    projectId: string,
    characterName: string,
    limit = 10
  ): Promise<RagResult[]> {
    return this.retrieveByType(
      projectId,
      'character_arc',
      `${characterName} character development arc`,
      limit
    )
  }

  /**
   * Retrieve past beat decisions for similar beats
   */
  async retrieveSimilarBeatDecisions(
    projectId: string,
    beatLogline: string,
    limit = 5
  ): Promise<RagResult[]> {
    return this.retrieveByType(projectId, 'beat_decision', beatLogline, limit)
  }

  /**
   * Retrieve user feedback/preferences
   */
  async retrieveUserPreferences(
    projectId: string,
    context: string,
    limit = 5
  ): Promise<RagResult[]> {
    return this.retrieveByType(projectId, 'user_feedback', context, limit)
  }

  /**
   * Assemble context for an agent from multiple sources
   * Returns both content and citation information
   */
  async assembleAgentContext(
    projectId: string,
    agentRole: string,
    currentContext: string
  ): Promise<{
    relevantHistory: string
    pastDecisions: string
    userPreferences: string
    citations: CitationInfo[]
  }> {
    // Parallel retrieval for efficiency
    const [generalHistory, pastDecisions, userPrefs] = await Promise.all([
      this.retrieve(projectId, currentContext, 3),
      this.retrieveByType(projectId, 'beat_decision', currentContext, 3),
      this.retrieveByType(projectId, 'user_feedback', currentContext, 2),
    ])

    // Collect all citations
    const allCitations: CitationInfo[] = []
    let citationIndex = 1

    const formatWithCitations = (results: RagResult[]): string => {
      if (results.length === 0) return ''
      
      return results.map(r => {
        if (r.citation) {
          r.citation.marker = `[${citationIndex}]`
          allCitations.push(r.citation)
          citationIndex++
          return `${r.citation.marker} ${r.content}`
        }
        return r.content
      }).join('\n---\n')
    }

    return {
      relevantHistory: formatWithCitations(generalHistory),
      pastDecisions: formatWithCitations(pastDecisions),
      userPreferences: formatWithCitations(userPrefs),
      citations: allCitations,
    }
  }

  /**
   * Start a citation tracking session
   */
  startCitationSession(sessionId: string): void {
    sessionCitations.set(sessionId, [])
  }

  /**
   * Add citations to current session
   */
  addSessionCitations(sessionId: string, citations: CitationInfo[]): void {
    const existing = sessionCitations.get(sessionId) || []
    sessionCitations.set(sessionId, [...existing, ...citations])
  }

  /**
   * Get all citations from a session
   */
  getSessionCitations(sessionId: string): CitationInfo[] {
    return sessionCitations.get(sessionId) || []
  }

  /**
   * End citation session
   */
  endCitationSession(sessionId: string): CitationInfo[] {
    const citations = sessionCitations.get(sessionId) || []
    sessionCitations.delete(sessionId)
    return citations
  }

  /**
   * Invalidate cache for a project
   */
  private invalidateCacheForProject(projectId: string) {
    for (const key of semanticCache.keys()) {
      if (key.startsWith(`${projectId}:`)) {
        semanticCache.delete(key)
      }
    }
  }

  /**
   * Clear all cache
   */
  clearCache() {
    semanticCache.clear()
  }
}

export const ragService = new RagService()
