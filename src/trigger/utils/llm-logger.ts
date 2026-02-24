/**
 * LLM Request Logger for Trigger.dev Tasks
 * 
 * Logs all LLM requests with exact input/output, prompts, and image URLs
 * to the Trigger.dev panel for debugging and monitoring.
 */

import { logger } from '@trigger.dev/sdk/v3'

export interface LLMRequestLog {
  provider: 'openai' | 'gemini' | 'anthropic' | 'stability' | 'midjourney' | 'meshy' | 'other'
  model?: string
  prompt?: string
  messages?: Array<{ role: string; content: string | any }>
  inputImageUrls?: string[]
  outputImageUrls?: string[]
  input?: any
  output?: any
  error?: string
  metadata?: Record<string, any>
}

/**
 * Log an LLM request with full details
 */
export function logLLMRequest(logData: LLMRequestLog) {
  const {
    provider,
    model,
    prompt,
    messages,
    inputImageUrls,
    outputImageUrls,
    input,
    output,
    error,
    metadata = {},
  } = logData

  // Build comprehensive log entry
  const logEntry = {
    type: 'llm_request',
    provider,
    model: model || 'unknown',
    timestamp: new Date().toISOString(),
    ...(prompt && { prompt }),
    ...(messages && { messages }),
    ...(inputImageUrls && inputImageUrls.length > 0 && { inputImageUrls }),
    ...(outputImageUrls && outputImageUrls.length > 0 && { outputImageUrls }),
    ...(input && { input: sanitizeForLogging(input) }),
    ...(output && { output: sanitizeForLogging(output) }),
    ...(error && { error }),
    ...metadata,
  }

  if (error) {
    logger.error('[LLM Request]', logEntry)
  } else {
    logger.info('[LLM Request]', logEntry)
  }
}

/**
 * Log LLM request start (before making the call)
 */
export function logLLMRequestStart(logData: Omit<LLMRequestLog, 'output' | 'error'>) {
  const {
    provider,
    model,
    prompt,
    messages,
    inputImageUrls,
    input,
    metadata = {},
  } = logData

  const logEntry = {
    type: 'llm_request_start',
    provider,
    model: model || 'unknown',
    timestamp: new Date().toISOString(),
    ...(prompt && { prompt }),
    ...(messages && { messages }),
    ...(inputImageUrls && inputImageUrls.length > 0 && { inputImageUrls }),
    ...(input && { input: sanitizeForLogging(input) }),
    ...metadata,
  }

  logger.info('[LLM Request Start]', logEntry)
}

/**
 * Log LLM request completion (after successful call)
 */
export function logLLMRequestComplete(logData: Omit<LLMRequestLog, 'error'>) {
  const {
    provider,
    model,
    outputImageUrls,
    output,
    metadata = {},
  } = logData

  const logEntry = {
    type: 'llm_request_complete',
    provider,
    model: model || 'unknown',
    timestamp: new Date().toISOString(),
    ...(outputImageUrls && outputImageUrls.length > 0 && { outputImageUrls }),
    ...(output && { output: sanitizeForLogging(output) }),
    ...metadata,
  }

  logger.info('[LLM Request Complete]', logEntry)
}

/**
 * Log LLM request error
 */
export function logLLMRequestError(logData: LLMRequestLog) {
  const {
    provider,
    model,
    error,
    input,
    metadata = {},
  } = logData

  const logEntry = {
    type: 'llm_request_error',
    provider,
    model: model || 'unknown',
    timestamp: new Date().toISOString(),
    error: error || 'Unknown error',
    ...(input && { input: sanitizeForLogging(input) }),
    ...metadata,
  }

  logger.error('[LLM Request Error]', logEntry)
}

/**
 * Sanitize data for logging (remove sensitive info, truncate large values)
 */
function sanitizeForLogging(data: any): any {
  if (data === null || data === undefined) {
    return data
  }

  // Handle base64 image data - replace with placeholder
  if (typeof data === 'string' && data.length > 1000 && data.match(/^data:image/)) {
    return '[Base64 Image Data - truncated]'
  }

  // Handle large base64 strings
  if (typeof data === 'string' && data.length > 5000) {
    return data.substring(0, 500) + '... [truncated]'
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLogging(item))
  }

  // Handle objects
  if (typeof data === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(data)) {
      // Skip sensitive keys
      if (key.toLowerCase().includes('key') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('token')) {
        sanitized[key] = '[REDACTED]'
        continue
      }

      // Handle nested objects
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeForLogging(value)
      } else {
        sanitized[key] = sanitizeForLogging(value)
      }
    }
    return sanitized
  }

  return data
}

/**
 * Extract image URLs from various response formats
 */
export function extractImageUrls(data: any): string[] {
  const urls: string[] = []

  if (!data) return urls

  // Handle OpenAI DALL-E response
  if (data.data && Array.isArray(data.data)) {
    for (const item of data.data) {
      if (item.url) urls.push(item.url)
      if (item.b64_json) urls.push('[Base64 Image Data]')
    }
  }

  // Handle Gemini response
  if (data.candidates && Array.isArray(data.candidates)) {
    for (const candidate of data.candidates) {
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inline_data || part.inlineData) {
            urls.push('[Base64 Image Data]')
          }
        }
      }
    }
  }

  // Handle LegNext/Midjourney response
  if (data.output) {
    if (data.output.image_url) urls.push(data.output.image_url)
    if (data.output.image_urls && Array.isArray(data.output.image_urls)) {
      urls.push(...data.output.image_urls)
    }
  }

  // Handle direct image_url
  if (data.image_url) urls.push(data.image_url)
  if (data.image_urls && Array.isArray(data.image_urls)) {
    urls.push(...data.image_urls)
  }

  // Handle nested objects recursively
  if (typeof data === 'object') {
    for (const value of Object.values(data)) {
      if (typeof value === 'object' && value !== null) {
        urls.push(...extractImageUrls(value))
      }
    }
  }

  return [...new Set(urls)] // Remove duplicates
}

/**
 * Extract prompt from various input formats
 */
export function extractPrompt(data: any): string | undefined {
  if (!data) return undefined

  // Direct prompt
  if (typeof data.prompt === 'string') return data.prompt
  if (typeof data.text === 'string') return data.text

  // From messages array
  if (data.messages && Array.isArray(data.messages)) {
    const userMessage = data.messages.find((m: any) => m.role === 'user')
    if (userMessage?.content) {
      if (typeof userMessage.content === 'string') {
        return userMessage.content
      }
      if (Array.isArray(userMessage.content)) {
        const textPart = userMessage.content.find((p: any) => p.type === 'text')
        if (textPart?.text) return textPart.text
      }
    }
  }

  // From contents array (Gemini format)
  if (data.contents && Array.isArray(data.contents)) {
    for (const content of data.contents) {
      if (content.parts && Array.isArray(content.parts)) {
        const textPart = content.parts.find((p: any) => p.text)
        if (textPart?.text) return textPart.text
      }
    }
  }

  return undefined
}
