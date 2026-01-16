/**
 * Re-ranking Module
 *
 * Re-scores initial retrieval results using cross-encoder or Cohere Rerank.
 * Improves retrieval precision by better scoring query-document relevance.
 */

import { SearchResult } from './hybrid-search'

// ============================================
// TYPES
// ============================================

export type RerankerProvider = 'cohere' | 'cross-encoder' | 'heuristic'

export interface RerankerConfig {
  provider: RerankerProvider
  topK: number // Initial retrieval count
  rerankedTopK: number // Final return count
  minScore: number // Filter low-confidence results
  cohereModel?: string // Cohere model (if using Cohere)
}

export interface RerankResult {
  results: SearchResult[]
  originalCount: number
  filteredCount: number
  provider: RerankerProvider
  latencyMs: number
}

const DEFAULT_CONFIG: RerankerConfig = {
  provider: 'heuristic', // Default to fast heuristic
  topK: 10,
  rerankedTopK: 5,
  minScore: 0.3,
  cohereModel: 'rerank-english-v3.0',
}

// ============================================
// HEURISTIC RERANKER
// ============================================

/**
 * Fast heuristic-based reranking
 *
 * Uses multiple signals to improve ranking:
 * - Term overlap between query and document
 * - Position of query terms (earlier = better)
 * - Document length normalization
 * - Exact phrase matches
 */
function rerankHeuristic(
  query: string,
  results: SearchResult[],
  config: RerankerConfig
): SearchResult[] {
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length > 2)
  const queryLower = query.toLowerCase()

  const scoredResults = results.map(result => {
    const content = result.content.toLowerCase()
    let score = result.score // Start with original score

    // 1. Term overlap bonus
    const matchedTerms = queryTerms.filter(term => content.includes(term))
    const termOverlap = matchedTerms.length / queryTerms.length
    score += termOverlap * 0.2

    // 2. Exact phrase match bonus
    if (content.includes(queryLower)) {
      score += 0.3
    }

    // 3. Position bonus (terms appearing earlier = better)
    let positionScore = 0
    for (const term of queryTerms) {
      const pos = content.indexOf(term)
      if (pos !== -1) {
        // Earlier position = higher score (inverse relationship)
        positionScore += Math.max(0, 1 - pos / content.length)
      }
    }
    score += (positionScore / queryTerms.length) * 0.1

    // 4. Document length penalty (very long docs might be less focused)
    if (content.length > 5000) {
      score *= 0.95
    } else if (content.length < 100) {
      score *= 0.9 // Very short docs might lack context
    }

    // 5. Title/header match bonus
    const firstLine = content.split('\n')[0]
    const titleMatch = queryTerms.filter(term => firstLine.includes(term)).length
    score += (titleMatch / queryTerms.length) * 0.1

    return { ...result, score: Math.min(1, score) }
  })

  // Sort by new score and filter
  return scoredResults
    .sort((a, b) => b.score - a.score)
    .filter(r => r.score >= config.minScore)
    .slice(0, config.rerankedTopK)
}

// ============================================
// COHERE RERANKER
// ============================================

interface CohereRerankResponse {
  results: Array<{
    index: number
    relevance_score: number
  }>
}

/**
 * Cohere API-based reranking
 * Requires COHERE_API_KEY environment variable
 */
async function rerankCohere(
  query: string,
  results: SearchResult[],
  config: RerankerConfig
): Promise<SearchResult[]> {
  const apiKey = process.env.COHERE_API_KEY

  if (!apiKey) {
    console.warn('COHERE_API_KEY not set, falling back to heuristic reranking')
    return rerankHeuristic(query, results, config)
  }

  try {
    const response = await fetch('https://api.cohere.ai/v1/rerank', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        documents: results.map(r => r.content),
        model: config.cohereModel,
        top_n: config.rerankedTopK,
        return_documents: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.status}`)
    }

    const data = (await response.json()) as CohereRerankResponse

    // Map back to original results with new scores
    const rerankedResults = data.results
      .filter(r => r.relevance_score >= config.minScore)
      .map(r => ({
        ...results[r.index],
        score: r.relevance_score,
      }))

    return rerankedResults
  } catch (error) {
    console.warn('Cohere reranking failed, falling back to heuristic:', error)
    return rerankHeuristic(query, results, config)
  }
}

// ============================================
// CROSS-ENCODER RERANKER (Simplified)
// ============================================

/**
 * Cross-encoder style reranking using embeddings similarity
 *
 * Note: For true cross-encoder, you'd use a model like:
 * - cross-encoder/ms-marco-MiniLM-L-6-v2
 * - sentence-transformers/all-MiniLM-L6-v2
 *
 * This is a simplified version using the existing embedding infrastructure
 */
async function rerankCrossEncoder(
  query: string,
  results: SearchResult[],
  config: RerankerConfig
): Promise<SearchResult[]> {
  // For now, use heuristic as placeholder
  // TODO: Integrate with actual cross-encoder model
  console.log('Cross-encoder reranking not yet implemented, using heuristic')
  return rerankHeuristic(query, results, config)
}

// ============================================
// MAIN RERANKER CLASS
// ============================================

export class Reranker {
  private config: RerankerConfig

  constructor(config: Partial<RerankerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Rerank search results
   */
  async rerank(query: string, results: SearchResult[]): Promise<RerankResult> {
    const startTime = Date.now()
    const originalCount = results.length

    let rerankedResults: SearchResult[]

    switch (this.config.provider) {
      case 'cohere':
        rerankedResults = await rerankCohere(query, results, this.config)
        break
      case 'cross-encoder':
        rerankedResults = await rerankCrossEncoder(query, results, this.config)
        break
      case 'heuristic':
      default:
        rerankedResults = rerankHeuristic(query, results, this.config)
    }

    return {
      results: rerankedResults,
      originalCount,
      filteredCount: rerankedResults.length,
      provider: this.config.provider,
      latencyMs: Date.now() - startTime,
    }
  }

  /**
   * Get configuration
   */
  getConfig(): RerankerConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<RerankerConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let rerankerInstance: Reranker | null = null

export function getReranker(config?: Partial<RerankerConfig>): Reranker {
  if (!rerankerInstance || config) {
    rerankerInstance = new Reranker(config)
  }
  return rerankerInstance
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if Cohere reranking is available
 */
export function isCohereAvailable(): boolean {
  return !!process.env.COHERE_API_KEY
}

/**
 * Get recommended reranker based on available resources
 */
export function getRecommendedProvider(): RerankerProvider {
  if (process.env.COHERE_API_KEY) {
    return 'cohere'
  }
  return 'heuristic'
}
