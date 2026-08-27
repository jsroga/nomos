/**
 * Contextual Summary Service
 *
 * Generates AI-powered contextual descriptions for entity references.
 * Uses GraphRAG to include related entities for richer context.
 *
 * When hovering over [Elara] in "A close ally of Elara is working with the guild",
 * the tooltip shows WHY Elara is relevant in this specific context, including
 * her relationships discovered via graph traversal.
 */

import { createOpenAI } from '@ai-sdk/openai'
import { openRouterClientConfig } from '@/shared/agent-kernel/models'
import { generateText } from 'ai'
import { entityGraphService } from './entity-graph-service'
import { relationshipEnricher } from './relationship-enricher-service'
import { parseEntityType } from '@/domains/storyteller/core/entities/entity-type-guards'
import type { ProjectScope } from '@/shared/auth/project-scope'
import {
  CONTEXTUAL_SUMMARY_GENERATION_FAILED_LOG,
  CONTEXTUAL_SUMMARY_GRAPHRAG_FAILED_LOG,
  CONTEXTUAL_SUMMARY_MODEL,
  CONTEXTUAL_SUMMARY_NO_DESCRIPTION,
  RELATIONSHIP_JOIN_SEPARATOR,
} from '@/domains/storyteller/services/constants/contextual-summary'

interface ContextualSummaryRequest {
  entityId: string
  entityName: string
  entityType: string
  entityDescription: string // Base description from registry
  surroundingText: string // The sentence/paragraph containing the reference
  /** Which project, and proof the caller may read it. */
  scope: ProjectScope
}

interface ContextualSummaryResult {
  contextualSummary: string
  generatedAt: Date
  cacheHit: boolean
  relatedEntities?: string[] // Names of related entities used in generation
}

// Cache contextual summaries to avoid repeated LLM calls
// Simple in-memory cache with TTL
const summaryCache = new Map<string, { result: ContextualSummaryResult; timestamp: number }>()

// Rate limiting to prevent abuse (per-project limits)
// Tracks number of summary generations per project in the last minute
const rateLimitMap = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT_PER_MINUTE = 20 // Max 20 summary generations per project per minute
const RATE_LIMIT_WINDOW = 60000 // 1 minute window

/**
 * Generate a simple hash for cache keys
 */
function hashText(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Generate cache key for contextual summary
 */
function getCacheKey(projectId: string, entityId: string, context: string): string {
  return `${projectId}:${entityId}:${hashText(context)}`
}

/**
 * Build relationship context using GraphRAG
 * Finds related entities and their relationships to enrich the summary
 */
async function buildGraphRAGContext(
  entityId: string,
  entityName: string,
  entityType: string,
  scope: ProjectScope
): Promise<{ relationshipContext: string; relatedEntities: string[] }> {
  try {
    // Use GraphRAG to find related entities (1-2 hops)
    const relatedEntities = await entityGraphService.findRelatedEntitiesWithScoring(
      [entityId],
      scope,
      {
        maxDepth: 2,
        maxResults: 5,
        threshold: 0.5,
        randomWalkSteps: 50, // Quick random walk for scoring
      }
    )

    // Filter out the entity itself
    const others = relatedEntities.filter(e => e.id !== entityId)

    if (others.length === 0) {
      return { relationshipContext: '', relatedEntities: [] }
    }

    // Get enriched relationship data
    const parsedEntityType = parseEntityType(entityType)
    if (!parsedEntityType) {
      return { relationshipContext: '', relatedEntities: [] }
    }

    const enriched = await relationshipEnricher.enrichEntity(
      entityId,
      parsedEntityType,
      entityName,
      scope,
      ''
    )

    // Build context string from relationships
    const relationshipParts: string[] = []

    for (const rel of enriched.relationships.slice(0, 4)) {
      relationshipParts.push(`${rel.relationshipType} ${rel.targetName} (${rel.targetType})`)
    }

    // Add related entities discovered via graph
    const graphDiscovered = others
      .filter(e => !enriched.relationships.some(r => r.targetId === e.id))
      .slice(0, 3)

    for (const entity of graphDiscovered) {
      relationshipParts.push(
        `connected to ${entity.name} (${entity.type}, relevance: ${(entity.relevance * 100).toFixed(0)}%)`
      )
    }

    const relationshipContext =
      relationshipParts.length > 0 ? `Known relationships: ${relationshipParts.join(RELATIONSHIP_JOIN_SEPARATOR)}` : ''

    const relatedNames = [
      ...enriched.relationships.map(r => r.targetName),
      ...graphDiscovered.map(e => e.name),
    ]

    return { relationshipContext, relatedEntities: relatedNames }
  } catch (error) {
    console.warn(CONTEXTUAL_SUMMARY_GRAPHRAG_FAILED_LOG, error)
    return { relationshipContext: '', relatedEntities: [] }
  }
}

/**
 * Generate an AI-powered contextual summary for an entity reference
 * Uses GraphRAG to include related entities for richer context
 *
 * @param request - The request containing entity info and surrounding context
 * @returns Contextual summary explaining the entity's relevance
 */
export async function generateContextualSummary(
  request: ContextualSummaryRequest
): Promise<ContextualSummaryResult> {
  // Security: Sanitize and limit input sizes
  const safeRequest = {
    ...request,
    entityName: request.entityName.slice(0, 200),
    entityType: request.entityType.slice(0, 50),
    entityDescription: request.entityDescription.slice(0, 500),
    surroundingText: request.surroundingText.slice(0, 1000), // Already limited in API, but double-check
  }

  const cacheKey = getCacheKey(
    safeRequest.scope.projectId,
    safeRequest.entityId,
    safeRequest.surroundingText
  )

  // Check cache first with TTL
  const cached = summaryCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < 1000 * 60 * 30) {
    return { ...cached.result, cacheHit: true }
  }

  // If surrounding text is too short AND we already have a description, just return base description.
  // BUT if we don't have a description (like auto-registered stubs), we should ALWAYS try to generate one.
  const hasDescription = safeRequest.entityDescription && safeRequest.entityDescription.trim() !== ''
  if (safeRequest.surroundingText.length < 20 && hasDescription) {
    return {
      contextualSummary: safeRequest.entityDescription,
      generatedAt: new Date(),
      cacheHit: false,
    }
  }

  // Security: Rate limiting per project
  const now = Date.now()
  const rateLimit = rateLimitMap.get(safeRequest.scope.projectId)

  if (rateLimit) {
    if (now - rateLimit.windowStart < RATE_LIMIT_WINDOW) {
      if (rateLimit.count >= RATE_LIMIT_PER_MINUTE) {
        console.warn(
          `[ContextualSummary] Rate limit exceeded for project ${safeRequest.scope.projectId}`
        )
        // Return base description instead of blocking completely
        return {
          contextualSummary:
            safeRequest.entityDescription ||
            `${safeRequest.entityName} (${safeRequest.entityType})`,
          generatedAt: new Date(),
          cacheHit: false,
        }
      }
      rateLimit.count++
    } else {
      // Reset window
      rateLimit.count = 1
      rateLimit.windowStart = now
    }
  } else {
    rateLimitMap.set(safeRequest.scope.projectId, { count: 1, windowStart: now })
  }

  try {
    // Build relationship context using GraphRAG
    const { relationshipContext, relatedEntities } = await buildGraphRAGContext(
      safeRequest.entityId,
      safeRequest.entityName,
      safeRequest.entityType,
      safeRequest.scope
    )

    const openRouter = openRouterClientConfig()
    const openrouter = createOpenAI({ apiKey: openRouter.apiKey, baseURL: openRouter.baseURL })
    const { text } = await generateText({
      model: openrouter(CONTEXTUAL_SUMMARY_MODEL),
      system: `You are a story assistant that provides brief, contextual descriptions of story elements.
Given an entity, its relationships, and the sentence where it appears, explain the entity's relevance in that specific context.

If the surrounding sentence is very short or doesn't provide enough information, you MUST infer a high-quality baseline description of what this entity likely is, based on its name, type, and relationships.

Rules:
- Maximum 2 sentences
- Focus on WHY this entity matters in this context
- Reference the action/plot point happening in the sentence if available
- Incorporate relationship information if relevant to the context
- Be concise, atmospheric, and story-focused
- Don't repeat obvious information already in the sentence
- DO NOT say "There isn't enough information" or similar phrases. Always provide a thematic, immersive description based on the name.`,
      prompt: `Entity: ${safeRequest.entityName} (${safeRequest.entityType})
Base description: ${safeRequest.entityDescription || CONTEXTUAL_SUMMARY_NO_DESCRIPTION}
${relationshipContext ? `\n${relationshipContext}` : ''}

Sentence containing this entity (might be very short):
"${safeRequest.surroundingText.slice(0, 500)}"

Write a 1-2 sentence contextual description explaining ${safeRequest.entityName}'s relevance or baseline identity:`,
      maxRetries: 1,
      temperature: 0.3,
    })

    const result: ContextualSummaryResult = {
      contextualSummary: text.trim(),
      generatedAt: new Date(),
      cacheHit: false,
      relatedEntities,
    }

    // Cache the result with timestamp
    summaryCache.set(cacheKey, { result, timestamp: Date.now() })

    return result
  } catch (error) {
    console.error(CONTEXTUAL_SUMMARY_GENERATION_FAILED_LOG, error)
    // Fallback to base description
    return {
      contextualSummary:
        safeRequest.entityDescription || `${safeRequest.entityName} (${safeRequest.entityType})`,
      generatedAt: new Date(),
      cacheHit: false,
    }
  }
}

/**
 * Batch generate contextual summaries for multiple entities in the same text
 * More efficient than individual calls
 */
export async function generateBatchContextualSummaries(
  requests: ContextualSummaryRequest[]
): Promise<Map<string, ContextualSummaryResult>> {
  const results = new Map<string, ContextualSummaryResult>()

  // Check cache and collect uncached requests
  const uncached: ContextualSummaryRequest[] = []

  for (const request of requests) {
    const cacheKey = getCacheKey(request.scope.projectId, request.entityId, request.surroundingText)
    const cached = summaryCache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < 1000 * 60 * 30) {
      results.set(request.entityId, { ...cached.result, cacheHit: true })
    } else {
      uncached.push(request)
    }
  }

  // If everything was cached, return early
  if (uncached.length === 0) {
    return results
  }

  // Generate remaining summaries (could batch into single prompt for efficiency)
  // For now, generate in parallel with rate limiting
  const batchPromises = uncached.map(async request => {
    const result = await generateContextualSummary(request)
    results.set(request.entityId, result)
  })

  await Promise.all(batchPromises)

  return results
}

/** project-scope: none — evicts local cache entries, reads no project data. */
export function invalidateProjectSummaries(projectId: string): number {
  let cleared = 0
  for (const key of summaryCache.keys()) {
    if (key.startsWith(`${projectId}:`)) {
      summaryCache.delete(key)
      cleared++
    }
  }
  return cleared
}

/**
 * Clean up expired cache entries
 */
function cleanupCache() {
  const now = Date.now()
  const ttl = 1000 * 60 * 30 // 30 minutes
  for (const [key, value] of summaryCache.entries()) {
    if (now - value.timestamp > ttl) {
      summaryCache.delete(key)
    }
  }
}

// Periodically clean cache
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupCache, 1000 * 60 * 10) // Clean every 10 minutes
}

export const contextualSummaryService = {
  generate: generateContextualSummary,
  generateBatch: generateBatchContextualSummaries,
  invalidate: invalidateProjectSummaries,
}
