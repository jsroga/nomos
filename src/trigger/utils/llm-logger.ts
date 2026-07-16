/**
 * LLM Request Logger for Trigger.dev Tasks
 *
 * Logs all LLM requests with exact input/output, prompts, and image URLs
 * to the Trigger.dev panel for debugging and monitoring.
 */

import { logger } from '@trigger.dev/sdk/v3'
import {
  LlmLogEntryType,
  LlmLogFallback,
  LlmLogMessage,
  LlmLogSanitize,
  LlmLogSensitiveKeyFragment,
} from '@/trigger/constants/llm-logger'
import { isPlainObject } from '@/shared/data/json-guards'

export { extractImageUrls, extractPrompt } from './llm-logger-extract'

export interface LLMRequestLog {
  provider: 'openai' | 'gemini' | 'nano-banana' | 'anthropic' | 'stability' | 'midjourney' | 'meshy' | 'other'
  model?: string
  prompt?: string
  messages?: Array<{ role: string; content: string | unknown }>
  inputImageUrls?: string[]
  outputImageUrls?: string[]
  input?: unknown
  output?: unknown
  error?: string
  metadata?: Record<string, unknown>
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
    ...(input !== undefined && input !== null ? { input: sanitizeForLogging(input) } : {}),
    ...(output !== undefined && output !== null ? { output: sanitizeForLogging(output) } : {}),
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
    ...(input !== undefined && input !== null ? { input: sanitizeForLogging(input) } : {}),
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
    ...(output !== undefined && output !== null ? { output: sanitizeForLogging(output) } : {}),
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
    ...(input !== undefined && input !== null ? { input: sanitizeForLogging(input) } : {}),
    ...metadata,
  }

  logger.error(LlmLogMessage.RequestError, logEntry)
}

function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase()
  return (
    lowerKey.includes(LlmLogSensitiveKeyFragment.Key) ||
    lowerKey.includes(LlmLogSensitiveKeyFragment.Secret) ||
    lowerKey.includes(LlmLogSensitiveKeyFragment.Token)
  )
}

function sanitizeStringForLogging(value: string): string {
  if (value.length > 1000 && value.match(/^data:image/)) {
    return LlmLogSanitize.Base64ImageTruncated
  }

  if (value.length > 5000) {
    return value.substring(0, 500) + LlmLogSanitize.TruncatedSuffix
  }

  return value
}

function sanitizeObjectForLogging(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    sanitized[key] = isSensitiveKey(key) ? LlmLogSanitize.Redacted : sanitizeForLogging(value)
  }
  return sanitized
}

function sanitizeForLogging(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data
  }

  if (typeof data === 'string') {
    return sanitizeStringForLogging(data)
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLogging(item))
  }

  if (isPlainObject(data)) {
    return sanitizeObjectForLogging(data)
  }

  return data
}
