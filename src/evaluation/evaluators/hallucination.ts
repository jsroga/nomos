/**
 * Hallucination Detector Evaluator
 * 
 * Detects fabricated content in agent outputs:
 * - Invalid/fake URLs
 * - Made-up external references
 * - Fabricated statistics or facts
 */

import { CustomEvaluator, EvaluatorInput, EvaluatorResult } from '../types'

// URL patterns that are commonly hallucinated
const SUSPICIOUS_URL_PATTERNS = [
  /youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}/,  // YouTube videos
  /imdb\.com\/title\/tt\d+/,                    // IMDB titles
  /wikipedia\.org\/wiki\//,                      // Wikipedia
  /amazon\.com\/dp\//,                           // Amazon products
  /twitter\.com\/\w+\/status\//,                 // Twitter/X posts
  /github\.com\/[\w-]+\/[\w-]+/,                 // GitHub repos
  /medium\.com\/@[\w-]+\//,                      // Medium articles
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
      const isSuspicious = SUSPICIOUS_URL_PATTERNS.some((pattern) => pattern.test(url))

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
    const suspiciousUrls = urls.filter((url) =>
      SUSPICIOUS_URL_PATTERNS.some((pattern) => pattern.test(url))
    )

    // Check for specific red flags
    const redFlags: string[] = []

    // Random-looking video IDs (YouTube)
    const ytMatches = outputStr.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/g) || []
    if (ytMatches.length > 0) {
      redFlags.push(`${ytMatches.length} YouTube link(s) - potentially fabricated`)
    }

    // External references without citations
    const externalRefs = EXTERNAL_REFERENCE_PATTERNS.filter((p) => p.test(outputStr)).length
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

