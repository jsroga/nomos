/**
 * Re-ranking Module
 *
 * Re-scores initial retrieval results using cross-encoder or Cohere Rerank.
 * Improves retrieval precision by better scoring query-document relevance.
 */

import { z } from 'zod'
import { SearchResult } from './hybrid-search'
import { ContentType, HttpMethod } from '@/shared/data/constants/protocol'
import {
  CohereRerankModel,
  RerankerLog,
  RerankerProviderId,
} from '@/shared/ai/constants/reranker'
import { OPENROUTER_BASE_URL } from '@/shared/agent-kernel/models'

// ============================================
// TYPES
// ============================================

export type RerankerProvider = `${RerankerProviderId}`

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
  provider: RerankerProviderId.Heuristic,
  topK: 10,
  rerankedTopK: 5,
  minScore: 0.3,
  cohereModel: CohereRerankModel.EnglishV3,
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
    // SearchResult carries combinedScore (vector+keyword); `result.score`
    // never existed — it read undefined, poisoning every heuristic score
    // to NaN so the minScore filter dropped all results.
    let score = result.combinedScore // Start with original score
    const firstLine = content.split('\n')[0]

    // Single pass over query terms: term overlap, position, and title match.
    let matchedCount = 0
    let titleMatchCount = 0
    let positionScore = 0
    for (const term of queryTerms) {
      if (content.includes(term)) matchedCount++
      if (firstLine.includes(term)) titleMatchCount++
      const pos = content.indexOf(term)
      // Earlier position = higher score (inverse relationship)
      if (pos !== -1) positionScore += Math.max(0, 1 - pos / content.length)
    }

    // 1. Term overlap bonus
    score += (matchedCount / queryTerms.length) * 0.2

    // 2. Exact phrase match bonus
    if (content.includes(queryLower)) {
      score += 0.3
    }

    // 3. Position bonus (terms appearing earlier = better)
    score += (positionScore / queryTerms.length) * 0.1

    // 4. Document length penalty (very long docs might be less focused)
    if (content.length > 5000) {
      score *= 0.95
    } else if (content.length < 100) {
      score *= 0.9 // Very short docs might lack context
    }

    // 5. Title/header match bonus
    score += (titleMatchCount / queryTerms.length) * 0.1

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

const cohereRerankResponseSchema = z.object({
  results: z.array(
    z.object({
      index: z.number(),
      relevance_score: z.number(),
    })
  ),
})

/**
 * Cohere rerank via OpenRouter (`POST /api/v1/rerank`).
 * Requires OPENROUTER_API_KEY; falls back to heuristic when missing.
 */
async function rerankCohere(
  query: string,
  results: SearchResult[],
  config: RerankerConfig
): Promise<SearchResult[]> {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    console.warn(RerankerLog.CohereKeyMissing)
    return rerankHeuristic(query, results, config)
  }

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/rerank`, {
      method: HttpMethod.Post,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': ContentType.Json,
      },
      body: JSON.stringify({
        query,
        documents: results.map(r => r.content),
        model: config.cohereModel,
        top_n: config.rerankedTopK,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter rerank error: ${response.status}`)
    }

    const data = cohereRerankResponseSchema.parse(await response.json())

    // Map back to original results with new scores
    const rerankedResults = data.results
      .filter(r => r.relevance_score >= config.minScore)
      .map(r => ({
        ...results[r.index],
        score: r.relevance_score,
      }))

    return rerankedResults
  } catch (error) {
    console.warn(RerankerLog.CohereFailed, error)
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
  console.log(RerankerLog.CrossEncoderNotImplemented)
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
      case RerankerProviderId.Cohere:
        rerankedResults = await rerankCohere(query, results, this.config)
        break
      case RerankerProviderId.CrossEncoder:
        rerankedResults = await rerankCrossEncoder(query, results, this.config)
        break
      case RerankerProviderId.Heuristic:
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
