/**
 * Hallucination Detector Evaluator
 *
 * Detects fabricated content in agent outputs:
 * - Invalid/fake URLs
 * - Made-up external references
 * - Fabricated statistics or facts
 * - Invented characters, locations, or events not in the world bible
 * - Facts that contradict established canon
 *
 * Uses Claude Opus 4.5 for LLM-based semantic hallucination detection.
 */

import { ChatAnthropic } from '@langchain/anthropic'
import { CustomEvaluator, EvaluatorInput, EvaluatorResult } from '../types'

// URL patterns that are commonly hallucinated
const SUSPICIOUS_URL_PATTERNS = [
  /youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}/, // YouTube videos
  /imdb\.com\/title\/tt\d+/, // IMDB titles
  /wikipedia\.org\/wiki\//, // Wikipedia
  /amazon\.com\/dp\//, // Amazon products
  /twitter\.com\/\w+\/status\//, // Twitter/X posts
  /github\.com\/[\w-]+\/[\w-]+/, // GitHub repos
  /medium\.com\/@[\w-]+\//, // Medium articles
]

// Patterns that indicate external reference (might be fabricated)
const EXTERNAL_REFERENCE_PATTERNS = [
  /according to [\w\s]+ study/i,
  /research (shows|indicates|proves)/i,
  /\d+% of (people|users|customers)/i,
  /published in [\w\s]+/i,
  /statistics? (show|indicate)/i,
  /study by [\w\s]+ found/i,
]

/**
 * Validate a URL by attempting to fetch it
 */
async function validateUrl(url: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EvalBot/1.0)',
      },
    })

    clearTimeout(timeout)

    if (response.ok || response.status === 405) {
      // 405 = Method Not Allowed, but URL exists
      return { valid: true }
    }

    if (response.status === 404) {
      return { valid: false, error: 'Not found (404)' }
    }

    return { valid: true } // Other status codes might still be valid
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Fetch failed',
    }
  }
}

export const hallucinationDetector: CustomEvaluator = {
  name: 'hallucination-detector',

  evaluate: async ({ output }: EvaluatorInput): Promise<EvaluatorResult> => {
    const outputStr = typeof output === 'string' ? output : JSON.stringify(output)

    // Extract all URLs
    const urlPattern = /https?:\/\/[^\s"'<>\])}]+/g
    const urls = outputStr.match(urlPattern) || []

    // Find suspicious URLs
    const suspiciousUrls: string[] = []
    const invalidUrls: string[] = []
    const validUrls: string[] = []

    for (const url of urls) {
      const isSuspicious = SUSPICIOUS_URL_PATTERNS.some(pattern => pattern.test(url))

      if (isSuspicious) {
        suspiciousUrls.push(url)

        // Validate the URL
        const result = await validateUrl(url)
        if (!result.valid) {
          invalidUrls.push(url)
        } else {
          validUrls.push(url)
        }
      }
    }

    // Check for external reference patterns
    const externalReferences: string[] = []
    for (const pattern of EXTERNAL_REFERENCE_PATTERNS) {
      const matches = outputStr.match(pattern)
      if (matches) {
        externalReferences.push(...matches)
      }
    }

    // Calculate score
    const hasInvalidUrls = invalidUrls.length > 0
    const hasSuspiciousReferences = externalReferences.length > 2 // Allow some natural references

    let score = 1.0
    const reasons: string[] = []

    if (hasInvalidUrls) {
      score -= 0.5 * (invalidUrls.length / Math.max(urls.length, 1))
      reasons.push(`${invalidUrls.length} invalid URL(s)`)
    }

    if (hasSuspiciousReferences) {
      score -= 0.1 * (externalReferences.length - 2)
      reasons.push(`${externalReferences.length} unverifiable external references`)
    }

    score = Math.max(0, Math.min(1, score))

    return {
      score,
      reasoning:
        reasons.length > 0
          ? `Found issues: ${reasons.join(', ')}`
          : 'No hallucination indicators detected',
      metadata: {
        totalUrls: urls.length,
        suspiciousUrls,
        invalidUrls,
        validUrls,
        externalReferences: externalReferences.slice(0, 5), // Limit for readability
      },
    }
  },
}

/**
 * Fast heuristic version that doesn't make network calls
 */
export const hallucinationHeuristic: CustomEvaluator = {
  name: 'hallucination-heuristic',

  evaluate: async ({ output }: EvaluatorInput): Promise<EvaluatorResult> => {
    const outputStr = typeof output === 'string' ? output : JSON.stringify(output)

    const urlPattern = /https?:\/\/[^\s"'<>\])}]+/g
    const urls = outputStr.match(urlPattern) || []

    // Check for suspicious URL patterns without validating
    const suspiciousUrls = urls.filter(url =>
      SUSPICIOUS_URL_PATTERNS.some(pattern => pattern.test(url))
    )

    // Check for specific red flags
    const redFlags: string[] = []

    // Random-looking video IDs (YouTube)
    const ytMatches = outputStr.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/g) || []
    if (ytMatches.length > 0) {
      redFlags.push(`${ytMatches.length} YouTube link(s) - potentially fabricated`)
    }

    // External references without citations
    const externalRefs = EXTERNAL_REFERENCE_PATTERNS.filter(p => p.test(outputStr)).length
    if (externalRefs > 1) {
      redFlags.push(`${externalRefs} external reference patterns - verify sources`)
    }

    // Made-up statistics
    const statsPattern = /\b\d{1,3}(\.\d+)?%\s+(of|increase|decrease)/gi
    const stats = outputStr.match(statsPattern) || []
    if (stats.length > 2) {
      redFlags.push(`${stats.length} statistics - potentially fabricated`)
    }

    // Calculate score
    let score = 1.0

    if (suspiciousUrls.length > 0) {
      score -= 0.2 * suspiciousUrls.length
    }

    if (redFlags.length > 0) {
      score -= 0.1 * redFlags.length
    }

    score = Math.max(0, Math.min(1, score))

    return {
      score,
      reasoning:
        redFlags.length > 0
          ? `Potential hallucination indicators: ${redFlags.join('; ')}`
          : suspiciousUrls.length > 0
            ? `${suspiciousUrls.length} URL(s) need verification`
            : 'No obvious hallucination indicators',
      metadata: {
        urls: urls.slice(0, 10),
        suspiciousUrls,
        redFlags,
      },
    }
  },
}

// ============================================
// LLM-BASED SEMANTIC HALLUCINATION DETECTION
// ============================================

const SEMANTIC_HALLUCINATION_PROMPT = `You are a ruthless fact-checker for a prestige television writers room. Your job is to catch ANY fabricated content that isn't grounded in the established canon.

## Your Sacred Duty
Identify content that was INVENTED by the AI and not present in or derivable from the established world bible/canon.

## Types of Hallucinations to Detect

### 1. INVENTED ENTITIES
- Characters that don't exist in the world bible
- Locations not established in the world
- Factions or organizations never mentioned
- Objects or artifacts pulled from nowhere

### 2. CONTRADICTORY FACTS
- Events that contradict established timeline
- Character traits that conflict with their established personality
- World rules being violated (e.g., dead character appearing alive)
- Historical facts that don't match the established lore

### 3. IMPOSSIBLE KNOWLEDGE
- Characters knowing things they shouldn't know
- References to future events (unless justified by prophecy/time travel)
- Information appearing without any source

### 4. FABRICATED CONTEXT
- Made-up backstories not in the canon
- Invented relationships between characters
- Created history that wasn't established

## ESTABLISHED CANON (Source of Truth)
{reference}

## CONTENT TO VERIFY
{output}

## Instructions
Compare the content against the canon. Every claim in the output should either:
1. Be directly stated in the canon, OR
2. Be a reasonable inference from the canon

If it's neither, it's a hallucination.

Respond with ONLY valid JSON:
{
  "score": 0.85,
  "reasoning": "Summary of hallucination analysis",
  "hallucinations": [
    {
      "type": "invented_entity|contradictory_fact|impossible_knowledge|fabricated_context",
      "evidence": "The exact quote or element that is hallucinated",
      "issue": "Why this is a hallucination",
      "severity": "minor|major|critical"
    }
  ],
  "verifiedClaims": ["List of claims that were verified against canon"],
  "confidence": 0.9
}`

/**
 * LLM-based semantic hallucination detector using Claude Opus 4.5
 * Verifies content against established world bible/canon
 */
export const semanticHallucinationDetector: CustomEvaluator = {
  name: 'semantic-hallucination',

  evaluate: async ({ output, reference }: EvaluatorInput): Promise<EvaluatorResult> => {
    // If no reference provided, can only do URL-based checks
    if (!reference || Object.keys(reference).length === 0) {
      // Fall back to URL-based detection
      return hallucinationDetector.evaluate({ input: {}, output })
    }

    try {
      const model = new ChatAnthropic({
        modelName: 'claude-opus-4-5-20251101',
        temperature: 0, // Zero temperature for factual verification
        maxRetries: 2,
      })

      const outputStr = typeof output === 'string' ? output : JSON.stringify(output, null, 2)
      const referenceStr = JSON.stringify(reference, null, 2)

      const prompt = SEMANTIC_HALLUCINATION_PROMPT.replace('{reference}', referenceStr).replace(
        '{output}',
        outputStr.slice(0, 8000)
      )

      const response = await model.invoke(prompt)
      const content =
        typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to parse hallucination check response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      // Count severity levels
      const hallucinations = parsed.hallucinations || []
      const criticalCount = hallucinations.filter((h: any) => h.severity === 'critical').length
      const majorCount = hallucinations.filter((h: any) => h.severity === 'major').length

      return {
        score: Math.max(0, Math.min(1, parsed.score)),
        reasoning: parsed.reasoning,
        metadata: {
          hallucinations,
          verifiedClaims: parsed.verifiedClaims,
          confidence: parsed.confidence,
          criticalHallucinations: criticalCount,
          majorHallucinations: majorCount,
          evaluatedBy: 'claude-opus-4-5-20251101',
        },
      }
    } catch (error) {
      console.error('Semantic hallucination detection failed:', error)
      // Fall back to heuristic
      return hallucinationHeuristic.evaluate({ input: {}, output })
    }
  },
}

/**
 * Combined hallucination evaluator - runs both URL and semantic checks
 */
export const combinedHallucinationEvaluator: CustomEvaluator = {
  name: 'hallucination-combined',

  evaluate: async ({ input, output, reference }: EvaluatorInput): Promise<EvaluatorResult> => {
    // Run both evaluations in parallel
    const [urlResult, semanticResult] = await Promise.all([
      hallucinationDetector.evaluate({ input, output }),
      reference
        ? semanticHallucinationDetector.evaluate({ input, output, reference })
        : Promise.resolve({ score: 1.0, reasoning: 'No reference for semantic check', metadata: {} }),
    ])

    // Combine scores - semantic is more important if we have reference
    const hasReference = reference && Object.keys(reference).length > 0
    const combinedScore = hasReference
      ? urlResult.score * 0.3 + semanticResult.score * 0.7 // 70% semantic, 30% URL
      : urlResult.score // Only URL-based

    return {
      score: combinedScore,
      reasoning: `URL checks: ${urlResult.reasoning}. ${hasReference ? `Semantic: ${semanticResult.reasoning}` : ''}`,
      metadata: {
        urlAnalysis: urlResult.metadata,
        semanticAnalysis: hasReference ? semanticResult.metadata : null,
        combinedScore,
      },
    }
  },
}
