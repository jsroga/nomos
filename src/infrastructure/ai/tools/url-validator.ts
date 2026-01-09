/**
 * URL Validator Tool
 * 
 * Prevents hallucinated URLs by validating:
 * - URL format and reachability
 * - Platform-specific validation (YouTube, etc.)
 * - Pattern detection for common hallucination signatures
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

export interface URLValidationResult {
  url: string
  isValid: boolean
  isReachable: boolean
  isLikelyHallucinated: boolean
  platform?: 'youtube' | 'spotify' | 'imdb' | 'wikipedia' | 'github' | 'other'
  metadata?: {
    title?: string
    description?: string
    thumbnail?: string
    duration?: number
  }
  error?: string
  hallucinationReason?: string
}

// Patterns that indicate a hallucinated URL
const HALLUCINATION_PATTERNS = [
  // YouTube IDs with too many repeated characters
  { pattern: /youtube\.com\/watch\?v=.*(.)\1{4,}/, reason: 'Repeated characters in video ID' },
  // YouTube IDs with obvious patterns like XXXXXXXXXX
  { pattern: /youtube\.com\/watch\?v=[X]{5,}/, reason: 'Placeholder X characters in ID' },
  { pattern: /youtube\.com\/watch\?v=[A-Za-z]{11}$/, reason: 'All letters in video ID (rare)' },
  // Example/placeholder domains
  { pattern: /example\.(com|org|net)/, reason: 'Example domain' },
  { pattern: /placeholder\.(com|org|net)/, reason: 'Placeholder domain' },
  { pattern: /test\.(com|org|net)/, reason: 'Test domain' },
  // Lorem ipsum in URLs
  { pattern: /lorem|ipsum|dolor|amet/i, reason: 'Lorem ipsum text in URL' },
  // Obviously fake patterns
  { pattern: /fake|sample|dummy|mock/i, reason: 'Fake/sample keyword in URL' },
  // Sequential numbers/letters that look generated
  { pattern: /12345|abcde|qwert/i, reason: 'Sequential characters in URL' },
  // All zeros or similar
  { pattern: /[0]{6,}/, reason: 'Repeated zeros' },
]

// Platform-specific URL patterns
const PLATFORM_PATTERNS: Record<string, RegExp> = {
  youtube: /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  spotify: /spotify\.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/,
  imdb: /imdb\.com\/title\/(tt\d+)/,
  wikipedia: /(?:en\.)?wikipedia\.org\/wiki\/(.+)/,
  github: /github\.com\/([^\/]+\/[^\/]+)/,
}

/**
 * Detect if a URL is likely hallucinated based on patterns
 */
function detectHallucinationPatterns(url: string): { isLikelyHallucinated: boolean; reason?: string } {
  for (const { pattern, reason } of HALLUCINATION_PATTERNS) {
    if (pattern.test(url)) {
      return { isLikelyHallucinated: true, reason }
    }
  }
  return { isLikelyHallucinated: false }
}

/**
 * Identify the platform from a URL
 */
function identifyPlatform(url: string): URLValidationResult['platform'] {
  for (const [platform, pattern] of Object.entries(PLATFORM_PATTERNS)) {
    if (pattern.test(url)) {
      return platform as URLValidationResult['platform']
    }
  }
  return 'other'
}

/**
 * Extract YouTube video ID
 */
function extractYouTubeId(url: string): string | null {
  const match = url.match(PLATFORM_PATTERNS.youtube)
  return match ? match[1] : null
}

/**
 * Validate YouTube URL via API (if API key available)
 */
async function validateYouTubeURL(url: string): Promise<Partial<URLValidationResult>> {
  const videoId = extractYouTubeId(url)
  if (!videoId) {
    return { isValid: false, error: 'Invalid YouTube URL format' }
  }

  const apiKey = process.env.YOUTUBE_API_KEY
  
  // If no API key, just validate format and check for hallucination patterns
  if (!apiKey) {
    const hallucinationCheck = detectHallucinationPatterns(url)
    return {
      isValid: !hallucinationCheck.isLikelyHallucinated,
      isReachable: false, // Cannot verify without API
      ...hallucinationCheck,
    }
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`,
      { method: 'GET' }
    )

    if (!response.ok) {
      return { isValid: false, isReachable: false, error: `YouTube API error: ${response.status}` }
    }

    const data = await response.json()
    
    if (!data.items || data.items.length === 0) {
      return { 
        isValid: false, 
        isReachable: false, 
        isLikelyHallucinated: true,
        hallucinationReason: 'Video ID does not exist',
        error: 'Video not found' 
      }
    }

    const video = data.items[0]
    return {
      isValid: true,
      isReachable: true,
      metadata: {
        title: video.snippet?.title,
        description: video.snippet?.description?.slice(0, 200),
        thumbnail: video.snippet?.thumbnails?.default?.url,
      },
    }
  } catch (error) {
    return { 
      isValid: false, 
      isReachable: false, 
      error: error instanceof Error ? error.message : 'YouTube validation failed' 
    }
  }
}

/**
 * Validate URL with HEAD request
 */
async function validateURLWithHead(url: string): Promise<Partial<URLValidationResult>> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    })

    clearTimeout(timeout)

    return {
      isValid: true,
      isReachable: response.ok,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    }
  } catch (error) {
    const isAborted = error instanceof Error && error.name === 'AbortError'
    return {
      isValid: true, // URL format is valid
      isReachable: false,
      error: isAborted ? 'Request timeout' : (error instanceof Error ? error.message : 'Unknown error'),
    }
  }
}

/**
 * Main URL validation function
 */
export async function validateURL(
  url: string,
  options?: { skipReachabilityCheck?: boolean }
): Promise<URLValidationResult> {
  // Basic URL format validation
  try {
    new URL(url)
  } catch {
    return {
      url,
      isValid: false,
      isReachable: false,
      isLikelyHallucinated: false,
      error: 'Invalid URL format',
    }
  }

  // Check for hallucination patterns
  const hallucinationCheck = detectHallucinationPatterns(url)
  
  if (hallucinationCheck.isLikelyHallucinated) {
    return {
      url,
      isValid: false,
      isReachable: false,
      isLikelyHallucinated: true,
      hallucinationReason: hallucinationCheck.reason,
      platform: identifyPlatform(url),
    }
  }

  const platform = identifyPlatform(url)
  let validationResult: Partial<URLValidationResult> = {}

  // Platform-specific validation
  switch (platform) {
    case 'youtube':
      validationResult = await validateYouTubeURL(url)
      break
    default:
      if (!options?.skipReachabilityCheck) {
        validationResult = await validateURLWithHead(url)
      } else {
        validationResult = { isValid: true, isReachable: false }
      }
  }

  return {
    url,
    platform,
    isLikelyHallucinated: false,
    ...validationResult,
  } as URLValidationResult
}

/**
 * Batch validate multiple URLs
 */
export async function validateURLs(urls: string[]): Promise<URLValidationResult[]> {
  return Promise.all(urls.map(url => validateURL(url)))
}

/**
 * Extract all URLs from text
 */
export function extractURLsFromText(text: string): string[] {
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g
  return text.match(urlPattern) || []
}

/**
 * Validate all URLs in a text
 */
export async function validateURLsInText(text: string): Promise<{
  urls: URLValidationResult[]
  hasInvalidURLs: boolean
  hasHallucinatedURLs: boolean
}> {
  const urls = extractURLsFromText(text)
  
  if (urls.length === 0) {
    return { urls: [], hasInvalidURLs: false, hasHallucinatedURLs: false }
  }

  const results = await validateURLs(urls)
  
  return {
    urls: results,
    hasInvalidURLs: results.some(r => !r.isValid),
    hasHallucinatedURLs: results.some(r => r.isLikelyHallucinated),
  }
}

/**
 * Create LangChain tool for URL validation
 */
export const createURLValidatorTool = () => {
  return new DynamicStructuredTool({
    name: 'validate_url',
    description: `Validate that a URL is real and accessible.
    
MUST be called before including ANY URL in responses.
Returns validation status, platform detection, and hallucination warnings.

DO NOT include URLs in your response that fail validation.`,
    schema: z.object({
      url: z.string().describe('The URL to validate'),
      skipReachabilityCheck: z.boolean().optional().default(false)
        .describe('Skip checking if URL is reachable (faster but less thorough)'),
    }),
    func: async ({ url, skipReachabilityCheck }) => {
      const result = await validateURL(url, { skipReachabilityCheck })
      
      if (result.isLikelyHallucinated) {
        return `❌ HALLUCINATED URL DETECTED: ${url}
Reason: ${result.hallucinationReason}

DO NOT include this URL in your response. Generate content without it or ask the user for the correct URL.`
      }
      
      if (!result.isValid) {
        return `❌ INVALID URL: ${url}
Error: ${result.error}

DO NOT include this URL in your response.`
      }
      
      if (!result.isReachable) {
        return `⚠️ URL format valid but could not verify: ${url}
Platform: ${result.platform || 'unknown'}
Error: ${result.error || 'Could not reach URL'}

Use with caution - consider asking the user to verify.`
      }
      
      let response = `✅ VALID URL: ${url}
Platform: ${result.platform || 'generic'}`
      
      if (result.metadata?.title) {
        response += `\nTitle: ${result.metadata.title}`
      }
      
      return response
    },
  })
}

// Singleton instance of the tool
let urlValidatorToolInstance: ReturnType<typeof createURLValidatorTool> | null = null

export function getURLValidatorTool() {
  if (!urlValidatorToolInstance) {
    urlValidatorToolInstance = createURLValidatorTool()
  }
  return urlValidatorToolInstance
}

