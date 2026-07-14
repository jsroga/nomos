import { PgVector } from '@mastra/pg'
import { OpenAIEmbeddings } from '@langchain/openai'

import { gameDesignPatternFromVectorRow } from './pattern-wire'
import {
  GAME_DESIGN_EMBEDDING_MODEL,
  GameDesignMemoryError,
  GameDesignPatternDelimiter,
  VectorIndexMetric,
} from './constants/memory'

export interface GameDesignPattern {
  id: string
  title: string
  description: string
  category: 'loop' | 'mechanic' | 'balance' | 'progression' | 'monetization'
  tags: string[]
  examples?: string[]
  score?: number
}

export interface GameDesignMemoryConfig {
  connectionString: string
  indexName?: string
  dimension?: number
}

const DEFAULT_INDEX_NAME = 'game_design_patterns'
const DEFAULT_DIMENSION = 1536 // OpenAI text-embedding-3-small

/**
 * GameDesignMemory - Vector storage for game design patterns and knowledge
 * Uses PgVector from @mastra/pg for persistent vector storage
 */
export class GameDesignMemory {
  private vector: PgVector
  private embeddings: OpenAIEmbeddings
  private indexName: string
  private dimension: number
  private initialized = false

  constructor(config: GameDesignMemoryConfig) {
    this.vector = new PgVector({
      id: config.indexName || DEFAULT_INDEX_NAME,
      connectionString: config.connectionString,
    })
    this.embeddings = new OpenAIEmbeddings({
      modelName: GAME_DESIGN_EMBEDDING_MODEL,
    })
    this.indexName = config.indexName || DEFAULT_INDEX_NAME
    this.dimension = config.dimension || DEFAULT_DIMENSION
  }

  /**
   * Initialize the vector index if it doesn't exist
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    await this.vector.createIndex({
      indexName: this.indexName,
      dimension: this.dimension,
      metric: VectorIndexMetric.Cosine,
    })

    this.initialized = true
  }

  /**
   * Add a game design pattern to the vector store
   */
  async addPattern(pattern: Omit<GameDesignPattern, 'score'>): Promise<string> {
    await this.initialize()

    // Create text representation for embedding
    const textForEmbedding = this.patternToText(pattern)

    // Generate embedding using LangChain
    const embedding = await this.embeddings.embedQuery(textForEmbedding)

    // Upsert to vector store
    const [id] = await this.vector.upsert({
      indexName: this.indexName,
      vectors: [embedding],
      metadata: [
        {
          id: pattern.id,
          title: pattern.title,
          description: pattern.description,
          category: pattern.category,
          tags: pattern.tags.join(GameDesignPatternDelimiter.TagsJoin),
          examples: pattern.examples?.join(GameDesignPatternDelimiter.ExamplesJoin) || '',
        },
      ],
      ids: [pattern.id],
    })

    return id
  }

  /**
   * Add multiple patterns in batch
   */
  async addPatterns(patterns: Omit<GameDesignPattern, 'score'>[]): Promise<string[]> {
    await this.initialize()

    const textsForEmbedding = patterns.map(p => this.patternToText(p))

    // Generate embeddings in batch using LangChain
    const embeddings = await this.embeddings.embedDocuments(textsForEmbedding)

    // Upsert all to vector store
    const ids = await this.vector.upsert({
      indexName: this.indexName,
      vectors: embeddings,
      metadata: patterns.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        tags: p.tags.join(GameDesignPatternDelimiter.TagsJoin),
        examples: p.examples?.join(GameDesignPatternDelimiter.ExamplesJoin) || '',
      })),
      ids: patterns.map(p => p.id),
    })

    return ids
  }

  /**
   * Search for relevant game design patterns
   */
  async search(query: string, topK = 5): Promise<GameDesignPattern[]> {
    await this.initialize()

    // Generate query embedding
    const embedding = await this.embeddings.embedQuery(query)

    // Query vector store
    const results = await this.vector.query({
      indexName: this.indexName,
      queryVector: embedding,
      topK,
      includeVector: false,
    })

    // Transform results back to GameDesignPattern
    return results.map(r => gameDesignPatternFromVectorRow(r))
  }

  /**
   * Search by category
   */
  async searchByCategory(
    query: string,
    category: GameDesignPattern['category'],
    topK = 5
  ): Promise<GameDesignPattern[]> {
    await this.initialize()

    const embedding = await this.embeddings.embedQuery(query)

    const results = await this.vector.query({
      indexName: this.indexName,
      queryVector: embedding,
      topK: topK * 2, // Fetch more to filter
      includeVector: false,
      filter: {
        category: { $eq: category },
      },
    })

    return results.slice(0, topK).map(r => gameDesignPatternFromVectorRow(r))
  }

  /**
   * Delete a pattern by ID
   */
  async deletePattern(patternId: string): Promise<void> {
    await this.initialize()
    await this.vector.deleteVector({
      indexName: this.indexName,
      id: patternId,
    })
  }

  /**
   * Get index statistics
   */
  async getStats(): Promise<{ count: number; dimension: number }> {
    await this.initialize()
    const stats = await this.vector.describeIndex({ indexName: this.indexName })
    return {
      count: stats.count,
      dimension: stats.dimension,
    }
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    await this.vector.disconnect()
  }

  private patternToText(pattern: Omit<GameDesignPattern, 'score'>): string {
    const parts = [
      `Title: ${pattern.title}`,
      `Category: ${pattern.category}`,
      `Description: ${pattern.description}`,
    ]

    if (pattern.tags.length > 0) {
      parts.push(`Tags: ${pattern.tags.join(GameDesignPatternDelimiter.TagsJoin)}`)
    }

    if (pattern.examples && pattern.examples.length > 0) {
      parts.push(`Examples: ${pattern.examples.join(GameDesignPatternDelimiter.ExamplesTextJoin)}`)
    }

    return parts.join('\n')
  }
}

/**
 * Create a GameDesignMemory instance with default configuration
 */
export function createGameDesignMemory(connectionString?: string): GameDesignMemory {
  const connString = connectionString || process.env.DATABASE_URL

  if (!connString) {
    throw new Error(GameDesignMemoryError.DatabaseUrlRequired)
  }

  return new GameDesignMemory({
    connectionString: connString,
  })
}
