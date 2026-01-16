/**
 * Grounding Service
 *
 * Tracks citations and verifies that AI responses are grounded in retrieved documents.
 * Provides:
 * - Citation session management
 * - Response grounding analysis
 * - Ungrounded claim detection
 * - Grounding score calculation
 */

import { v4 as uuidv4 } from 'uuid'
import { CitationInfo } from '@/domains/storyteller/services/rag-service'

export interface GroundingContext {
  sessionId: string
  projectId: string
  retrievedChunks: Map<string, RetrievedChunk>
  usedCitations: Set<string>
  claimsAnalysis: ClaimAnalysis[]
  groundingScore: number
}

export interface RetrievedChunk {
  id: string
  content: string
  metadata: Record<string, any>
  citationMarker: string
  confidence: number
}

export interface ClaimAnalysis {
  claim: string
  isGrounded: boolean
  supportingCitations: string[]
  confidence: number
}

export interface GroundingAnalysisResult {
  groundedClaims: Array<{ claim: string; citations: string[] }>
  ungroundedClaims: string[]
  groundingScore: number
  citationsUsed: CitationInfo[]
  citationsAvailable: CitationInfo[]
}

// Active grounding sessions
const groundingSessions = new Map<string, GroundingContext>()

/**
 * Grounding Instructions to inject into agent prompts
 */
export const GROUNDING_INSTRUCTIONS = `
## CITATION REQUIREMENTS

When making factual claims about the story world, you MUST:

1. **Search First**: Use search_series_bible BEFORE making claims about:
   - Character motivations, history, or relationships
   - World rules and their consequences
   - Past story events or decisions
   - Faction goals or conflicts

2. **Cite Sources**: Reference retrieved passages using [1], [2], etc.
   - Example: "Walter's transformation [1] is driven by his fear of mortality [2]"

3. **Acknowledge Uncertainty**: If no source found, state:
   - "Based on the current bible, there's no established..."
   - "This would be a new addition to the world..."

4. **Never Fabricate**:
   - No fake URLs, dates, or statistics
   - No invented character backstories not in bible
   - No made-up world rules

Responses without proper citations for factual claims will be flagged.
`

export class GroundingService {
  /**
   * Start a new grounding session
   */
  startSession(projectId: string): GroundingContext {
    const sessionId = uuidv4()
    const context: GroundingContext = {
      sessionId,
      projectId,
      retrievedChunks: new Map(),
      usedCitations: new Set(),
      claimsAnalysis: [],
      groundingScore: 0,
    }

    groundingSessions.set(sessionId, context)
    return context
  }

  /**
   * Get an existing session
   */
  getSession(sessionId: string): GroundingContext | undefined {
    return groundingSessions.get(sessionId)
  }

  /**
   * Register retrieved documents for a session
   */
  registerRetrieval(
    sessionId: string,
    chunks: Array<{
      id: string
      content: string
      metadata: Record<string, any>
      confidence: number
    }>
  ): void {
    const context = groundingSessions.get(sessionId)
    if (!context) {
      console.warn(`[Grounding] Session ${sessionId} not found`)
      return
    }

    chunks.forEach((chunk, index) => {
      context.retrievedChunks.set(chunk.id, {
        ...chunk,
        citationMarker: `[${context.retrievedChunks.size + 1}]`,
      })
    })
  }

  /**
   * Analyze a response for grounding
   */
  analyzeGrounding(sessionId: string, response: string): GroundingAnalysisResult {
    const context = groundingSessions.get(sessionId)

    if (!context) {
      return {
        groundedClaims: [],
        ungroundedClaims: [],
        groundingScore: 0,
        citationsUsed: [],
        citationsAvailable: [],
      }
    }

    // Extract citation markers from response
    const citationPattern = /\[(\d+)\]/g
    const usedMarkers = new Set<string>()
    let match

    while ((match = citationPattern.exec(response)) !== null) {
      usedMarkers.add(`[${match[1]}]`)
    }

    // Find which chunks were cited
    const citationsUsed: CitationInfo[] = []
    const citationsAvailable: CitationInfo[] = []

    for (const [chunkId, chunk] of context.retrievedChunks) {
      const citationInfo: CitationInfo = {
        id: chunkId,
        marker: chunk.citationMarker,
        source: chunk.metadata.documentType || 'unknown',
        chunkId: chunkId,
        confidence: chunk.confidence,
      }

      citationsAvailable.push(citationInfo)

      if (usedMarkers.has(chunk.citationMarker)) {
        citationsUsed.push(citationInfo)
        context.usedCitations.add(chunkId)
      }
    }

    // Analyze claims (simple heuristic-based approach)
    const { groundedClaims, ungroundedClaims } = this.analyzeClaims(response, context, usedMarkers)

    // Calculate grounding score
    const groundingScore = this.calculateGroundingScore(
      response,
      groundedClaims.length,
      ungroundedClaims.length,
      citationsUsed.length,
      citationsAvailable.length
    )

    context.groundingScore = groundingScore

    return {
      groundedClaims,
      ungroundedClaims,
      groundingScore,
      citationsUsed,
      citationsAvailable,
    }
  }

  /**
   * Analyze claims in the response
   */
  private analyzeClaims(
    response: string,
    context: GroundingContext,
    usedMarkers: Set<string>
  ): { groundedClaims: Array<{ claim: string; citations: string[] }>; ungroundedClaims: string[] } {
    const groundedClaims: Array<{ claim: string; citations: string[] }> = []
    const ungroundedClaims: string[] = []

    // Split response into sentences
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 10)

    // Patterns that indicate factual claims
    const factualPatterns = [
      /\b(is|are|was|were|has|have|had)\b.*\b(the|a|an)\b/i,
      /\baccording to\b/i,
      /\bknown (for|as)\b/i,
      /\b(character|faction|world|rule|story)\b/i,
      /\b(motivation|goal|fear|conflict)\b/i,
    ]

    // Patterns that indicate new proposals (not needing citations)
    const proposalPatterns = [
      /\bi suggest\b/i,
      /\bwe could\b/i,
      /\bwhat if\b/i,
      /\bperhaps\b/i,
      /\bmight be\b/i,
      /\bpropose\b/i,
      /\bnew\b.*\b(idea|concept|approach)\b/i,
    ]

    for (const sentence of sentences) {
      const trimmed = sentence.trim()

      // Skip if it's clearly a proposal, not a factual claim
      if (proposalPatterns.some(p => p.test(trimmed))) {
        continue
      }

      // Check if it looks like a factual claim
      const isFactualClaim = factualPatterns.some(p => p.test(trimmed))

      if (!isFactualClaim) {
        continue
      }

      // Check if claim has citation
      const hasCitation =
        usedMarkers.size > 0 && Array.from(usedMarkers).some(marker => trimmed.includes(marker))

      if (hasCitation) {
        const citations = Array.from(usedMarkers).filter(m => trimmed.includes(m))
        groundedClaims.push({ claim: trimmed, citations })
      } else {
        // Check if claim content matches retrieved chunks
        const contentMatch = this.checkContentMatch(trimmed, context)

        if (contentMatch.isMatch) {
          groundedClaims.push({ claim: trimmed, citations: contentMatch.matchingMarkers })
        } else {
          ungroundedClaims.push(trimmed)
        }
      }
    }

    return { groundedClaims, ungroundedClaims }
  }

  /**
   * Check if claim content matches retrieved chunks
   */
  private checkContentMatch(
    claim: string,
    context: GroundingContext
  ): { isMatch: boolean; matchingMarkers: string[] } {
    const claimLower = claim.toLowerCase()
    const claimWords = claimLower.split(/\s+/).filter(w => w.length > 4)
    const matchingMarkers: string[] = []

    for (const [_, chunk] of context.retrievedChunks) {
      const chunkLower = chunk.content.toLowerCase()

      // Count word overlap
      const matchCount = claimWords.filter(word => chunkLower.includes(word)).length
      const overlapRatio = matchCount / claimWords.length

      if (overlapRatio > 0.3) {
        matchingMarkers.push(chunk.citationMarker)
      }
    }

    return {
      isMatch: matchingMarkers.length > 0,
      matchingMarkers,
    }
  }

  /**
   * Calculate grounding score
   */
  private calculateGroundingScore(
    response: string,
    groundedCount: number,
    ungroundedCount: number,
    citationsUsed: number,
    citationsAvailable: number
  ): number {
    // If no claims detected, assume grounded
    if (groundedCount === 0 && ungroundedCount === 0) {
      return 1.0
    }

    const totalClaims = groundedCount + ungroundedCount
    const claimScore = totalClaims > 0 ? groundedCount / totalClaims : 1.0

    // Bonus for using available citations
    const citationBonus = citationsAvailable > 0 ? (citationsUsed / citationsAvailable) * 0.2 : 0

    return Math.min(1.0, claimScore + citationBonus)
  }

  /**
   * End a grounding session
   */
  endSession(sessionId: string): GroundingContext | undefined {
    const context = groundingSessions.get(sessionId)
    groundingSessions.delete(sessionId)
    return context
  }

  /**
   * Get grounding instructions for prompts
   */
  getGroundingInstructions(): string {
    return GROUNDING_INSTRUCTIONS
  }

  /**
   * Create a summary of grounding issues
   */
  createGroundingSummary(result: GroundingAnalysisResult): string {
    const parts: string[] = []

    parts.push(`Grounding Score: ${Math.round(result.groundingScore * 100)}%`)
    parts.push(`Citations Used: ${result.citationsUsed.length}/${result.citationsAvailable.length}`)

    if (result.ungroundedClaims.length > 0) {
      parts.push(`\n⚠️ Ungrounded Claims (${result.ungroundedClaims.length}):`)
      result.ungroundedClaims.slice(0, 3).forEach(claim => {
        parts.push(`  - "${claim.slice(0, 100)}..."`)
      })
      if (result.ungroundedClaims.length > 3) {
        parts.push(`  ... and ${result.ungroundedClaims.length - 3} more`)
      }
    }

    return parts.join('\n')
  }
}

// Singleton instance
let groundingServiceInstance: GroundingService | null = null

export function getGroundingService(): GroundingService {
  if (!groundingServiceInstance) {
    groundingServiceInstance = new GroundingService()
  }
  return groundingServiceInstance
}
