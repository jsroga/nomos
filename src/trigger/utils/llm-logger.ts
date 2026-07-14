/**
 * LLM Request Logger for Trigger.dev Tasks
 *
 * Logs all LLM requests with exact input/output, prompts, and image URLs
 * to the Trigger.dev panel for debugging and monitoring.
 */

import { logger } from '@trigger.dev/sdk/v3'
import {
  LLM_LOG_USER_ROLE,
  LlmContentPartType,
  LlmLogEntryType,
  LlmLogFallback,
  LlmLogMessage,
  LlmLogSanitize,
  LlmLogSensitiveKeyFragment,
} from '@/trigger/constants/llm-logger'

export interface LLMRequestLog {
  provider: 'openai' | 'gemini' | 'nano-banana' | 'anthropic' | 'stability' | 'midjourney' | 'meshy' | 'other'
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

  const logEntry = {
    type: LlmLogEntryType.Request,
    provider,
    model: model || LlmLogFallback.UnknownModel,
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
    logger.error(LlmLogMessage.Request, logEntry)
  } else {
    logger.info(LlmLogMessage.Request, logEntry)
  }
}

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
    type: LlmLogEntryType.RequestStart,
    provider,
    model: model || LlmLogFallback.UnknownModel,
    timestamp: new Date().toISOString(),
    ...(prompt && { prompt }),
    ...(messages && { messages }),
    ...(inputImageUrls && inputImageUrls.length > 0 && { inputImageUrls }),
    ...(input && { input: sanitizeForLogging(input) }),
    ...metadata,
  }

  logger.info(LlmLogMessage.RequestStart, logEntry)
}

export function logLLMRequestComplete(logData: Omit<LLMRequestLog, 'error'>) {
  const {
    provider,
    model,
    outputImageUrls,
    output,
    metadata = {},
  } = logData

  const logEntry = {
    type: LlmLogEntryType.RequestComplete,
    provider,
    model: model || LlmLogFallback.UnknownModel,
    timestamp: new Date().toISOString(),
    ...(outputImageUrls && outputImageUrls.length > 0 && { outputImageUrls }),
    ...(output && { output: sanitizeForLogging(output) }),
    ...metadata,
  }

  logger.info(LlmLogMessage.RequestComplete, logEntry)
}

export function logLLMRequestError(logData: LLMRequestLog) {
  const {
    provider,
    model,
    error,
    input,
    metadata = {},
  } = logData

  const logEntry = {
    type: LlmLogEntryType.RequestError,
    provider,
    model: model || LlmLogFallback.UnknownModel,
    timestamp: new Date().toISOString(),
    error: error || LlmLogFallback.UnknownError,
    ...(input && { input: sanitizeForLogging(input) }),
    ...metadata,
  }

  logger.error(LlmLogMessage.RequestError, logEntry)
}

function sanitizeForLogging(data: any): any {
  if (data === null || data === undefined) {
    return data
  }

  if (typeof data === 'string' && data.length > 1000 && data.match(/^data:image/)) {
    return LlmLogSanitize.Base64ImageTruncated
  }

  if (typeof data === 'string' && data.length > 5000) {
    return data.substring(0, 500) + LlmLogSanitize.TruncatedSuffix
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLogging(item))
  }

  if (typeof data === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(data)) {
      if (
        key.toLowerCase().includes(LlmLogSensitiveKeyFragment.Key) ||
        key.toLowerCase().includes(LlmLogSensitiveKeyFragment.Secret) ||
        key.toLowerCase().includes(LlmLogSensitiveKeyFragment.Token)
      ) {
        sanitized[key] = LlmLogSanitize.Redacted
        continue
      }

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

export function extractImageUrls(data: any): string[] {
  const urls: string[] = []

  if (!data) return urls

  if (data.data && Array.isArray(data.data)) {
    for (const item of data.data) {
      if (item.url) urls.push(item.url)
      if (item.b64_json) urls.push(LlmLogSanitize.Base64Image)
    }
  }

  if (data.candidates && Array.isArray(data.candidates)) {
    for (const candidate of data.candidates) {
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inline_data || part.inlineData) {
            urls.push(LlmLogSanitize.Base64Image)
          }
        }
      }
    }
  }

  if (data.output) {
    if (data.output.image_url) urls.push(data.output.image_url)
    if (data.output.image_urls && Array.isArray(data.output.image_urls)) {
      urls.push(...data.output.image_urls)
    }
  }

  if (data.image_url) urls.push(data.image_url)
  if (data.image_urls && Array.isArray(data.image_urls)) {
    urls.push(...data.image_urls)
  }

  if (typeof data === 'object') {
    for (const value of Object.values(data)) {
      if (typeof value === 'object' && value !== null) {
        urls.push(...extractImageUrls(value))
      }
    }
  }

  return [...new Set(urls)]
}

export function extractPrompt(data: any): string | undefined {
  if (!data) return undefined

  if (typeof data.prompt === 'string') return data.prompt
  if (typeof data.text === 'string') return data.text

  if (data.messages && Array.isArray(data.messages)) {
    const userMessage = data.messages.find((m: any) => m.role === LLM_LOG_USER_ROLE)
    if (userMessage?.content) {
      if (typeof userMessage.content === 'string') {
        return userMessage.content
      }
      if (Array.isArray(userMessage.content)) {
        const textPart = userMessage.content.find((p: any) => p.type === LlmContentPartType.Text)
        if (textPart?.text) return textPart.text
      }
    }
  }

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
