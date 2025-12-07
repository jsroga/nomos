import { db } from '@/lib/db'
import { documentEmbeddings } from '../db/schema'
import { OpenAIEmbeddings } from '@langchain/openai'
import { cosineDistance, desc, gt, sql, and, eq } from 'drizzle-orm'

// Document types for categorized retrieval
export type DocumentType =
  | 'beat_decision' // Past beat creation/rejection with reasoning
  | 'character_arc' // Character development history
  | 'world_rule' // Series bible world rules
  | 'episode_summary' // Episode summaries
  | 'user_feedback' // User corrections/preferences
  | 'agent_reasoning' // Agent thought processes

export interface RagResult {
  content: string
  metadata: Record<string, any>
  similarity: number
}

export interface IngestOptions {
  documentType: DocumentType
  episodeId?: string
  characterId?: string
  beatId?: string
  agentName?: string
}

// Simple in-memory cache for semantic queries
const semanticCache = new Map<string, { results: RagResult[]; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export class RagService {
  private embeddings: OpenAIEmbeddings

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-ada-002',
    })
  }

  /**
   * Ingest a document with typed metadata
   */
  async ingest(projectId: string, content: string, options: IngestOptions) {
    // 1. Generate embedding
    const embedding = await this.embeddings.embedQuery(content)

    // 2. Store in DB with typed metadata
    const metadata = {
      documentType: options.documentType,
      episodeId: options.episodeId,
      characterId: options.characterId,
      beatId: options.beatId,
      agentName: options.agentName,
      timestamp: Date.now(),
    }

    await db.insert(documentEmbeddings).values({
      projectId,
      content,
      metadata,
      embedding,
    })

    // Invalidate cache for this project
    this.invalidateCacheForProject(projectId)
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
    })
  }

  /**
   * Retrieve with semantic caching
   */
  async retrieve(projectId: string, query: string, limit = 5): Promise<RagResult[]> {
    // Check cache
    const cacheKey = `${projectId}:${query}:${limit}`
    const cached = semanticCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.results
    }

    try {
      // 1. Generate query embedding
      const queryEmbedding = await this.embeddings.embedQuery(query)

      // 2. Vector search using cosine distance
      const similarity = sql<number>`1 - (${documentEmbeddings.embedding} <=> ${JSON.stringify(queryEmbedding)})`

      const results = await db
        .select({
          content: documentEmbeddings.content,
          metadata: documentEmbeddings.metadata,
          similarity,
        })
        .from(documentEmbeddings)
        .where(sql`${documentEmbeddings.projectId} = ${projectId}`)
        .orderBy(desc(similarity))
        .limit(limit)

      const typedResults = results as RagResult[]

      // Cache results
      semanticCache.set(cacheKey, { results: typedResults, timestamp: Date.now() })

      return typedResults
    } catch (error) {
      console.warn('RAG retrieval failed:', error)
      return []
    }
  }

  /**
   * Retrieve documents of a specific type
   */
  async retrieveByType(
    projectId: string,
    documentType: DocumentType,
    query: string,
    limit = 5
  ): Promise<RagResult[]> {
    try {
      const queryEmbedding = await this.embeddings.embedQuery(query)
      const similarity = sql<number>`1 - (${documentEmbeddings.embedding} <=> ${JSON.stringify(queryEmbedding)})`

      const results = await db
        .select({
          content: documentEmbeddings.content,
          metadata: documentEmbeddings.metadata,
          similarity,
        })
        .from(documentEmbeddings)
        .where(
          and(
            sql`${documentEmbeddings.projectId} = ${projectId}`,
            sql`${documentEmbeddings.metadata}->>'documentType' = ${documentType}`
          )
        )
        .orderBy(desc(similarity))
        .limit(limit)

      return results as RagResult[]
    } catch (error) {
      console.warn('RAG typed retrieval failed:', error)
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
   */
  async assembleAgentContext(
    projectId: string,
    agentRole: string,
    currentContext: string
  ): Promise<{
    relevantHistory: string
    pastDecisions: string
    userPreferences: string
  }> {
    // Parallel retrieval for efficiency
    const [generalHistory, pastDecisions, userPrefs] = await Promise.all([
      this.retrieve(projectId, currentContext, 3),
      this.retrieveByType(projectId, 'beat_decision', currentContext, 3),
      this.retrieveByType(projectId, 'user_feedback', currentContext, 2),
    ])

    return {
      relevantHistory:
        generalHistory.length > 0 ? generalHistory.map(r => r.content).join('\n---\n') : '',
      pastDecisions:
        pastDecisions.length > 0 ? pastDecisions.map(r => r.content).join('\n---\n') : '',
      userPreferences: userPrefs.length > 0 ? userPrefs.map(r => r.content).join('\n---\n') : '',
    }
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
