/**
 * Mastra-aligned tracing helpers.
 *
 * Agent/workflow spans are emitted by Mastra via `tracingOptions` on
 * `agent.generate()` / `agent.stream()` and the `Observability` registry on
 * `createMastra()`. This module only provides shared sanitization + thin
 * wrappers for legacy call sites.
 */

import { recordFromJson } from '@/shared/data/json-guards'
import {
  TraceSanitizeFallback,
  traceFieldFallback,
} from '@/shared/observability/constants/trace-sanitize'

export type TraceSpan = {
  end: (args?: unknown) => void
}

export type ScoreDataType = 'NUMERIC' | 'CATEGORICAL' | 'BOOLEAN'

export interface TraceScoreConfig {
  traceId: string
  name: string
  value: number | string | boolean
  comment?: string
  dataType?: ScoreDataType
  observationId?: string
  id?: string
}

const SENSITIVE_PATTERNS = [
  /password/i,
  /apikey/i,
  /api_key/i,
  /secret/i,
  /token/i,
  /credential/i,
  /auth/i,
  /bearer/i,
]

function isSensitiveField(key: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(key))
}

export function sanitizeTraceValue(value: unknown, fallback: string = TraceSanitizeFallback.Empty): unknown {
  if (value === undefined || value === null) {
    return fallback
  }
  if (typeof value === 'string') {
    return value || fallback
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(v => sanitizeTraceValue(v, fallback)) : [fallback]
  }
  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      if (isSensitiveField(key)) {
        sanitized[key] = TraceSanitizeFallback.Redacted
      } else {
        sanitized[key] = sanitizeTraceValue(val, traceFieldFallback(key))
      }
    }
    return sanitized
  }
  return value
}

function sanitizedObjectRecord(value: unknown, fallback: string): Record<string, unknown> {
  const result = sanitizeTraceValue(value, fallback)
  if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
    return recordFromJson(result)
  }
  return { value: result }
}

export function sanitizeInput(input: unknown): string | Record<string, unknown> {
  if (input === undefined || input === null) {
    return TraceSanitizeFallback.NoInputProvided
  }
  if (typeof input === 'string') {
    return input || TraceSanitizeFallback.EmptyInput
  }
  return sanitizedObjectRecord(input, TraceSanitizeFallback.Empty)
}

export function sanitizeOutput(output: unknown): string | Record<string, unknown> {
  if (output === undefined || output === null) {
    return TraceSanitizeFallback.NoOutput
  }
  if (typeof output === 'string') {
    return output || TraceSanitizeFallback.EmptyOutput
  }
  return sanitizedObjectRecord(output, TraceSanitizeFallback.Empty)
}

/** @deprecated Use sanitizeTraceValue */
export const sanitizeForLangfuse = sanitizeTraceValue

export interface AgentTraceContext {
  traceId: string
  agentName: string
  sessionId?: string
  userId?: string
  projectId?: string
  episodeId?: string
}

export function createAgentTrace(_ctx: AgentTraceContext): TraceSpan {
  return { end: () => {} }
}

export function recordAgentGeneration(
  _traceId: string,
  _agentName: string,
  _input: { prompt: string; context?: string },
  _output: { text: string; thinking?: string },
  _metadata?: { model?: string; temperature?: number; tokens?: number }
) {
  return { end: () => {} }
}

export function recordAgentScore(
  _traceId: string,
  _nameOrScores: string | TraceScoreConfig[],
  _value?: number,
  _comment?: string,
  _options?: { dataType?: ScoreDataType; id?: string; observationId?: string }
) {
  // Mastra scores: use observability.addScore on the Mastra instance when needed.
}

export function recordAgentThinking(
  _traceId: string,
  _agentName: string,
  _thinking: string
) {
  // no-op — Mastra captures model steps when tracingOptions are set
}

export async function withSpan<T>(
  _traceId: string,
  _name: string,
  fn: (span: TraceSpan) => Promise<T>,
  _input?: unknown,
  _metadata?: { userId?: string; sessionId?: string; [key: string]: unknown }
): Promise<T> {
  return fn({ end: () => {} })
}

export async function flushObservability() {
  // Mastra exporters flush via Mastra lifecycle / serverless flush hooks
}

export interface ToolCallTrace {
  traceId: string
  toolName: string
  args: Record<string, unknown>
  result?: unknown
  error?: string
  durationMs?: number
  parentObservationId?: string
}

export function recordToolCall(_traceData: ToolCallTrace) {
  // no-op — tool spans come from Mastra tool execution tracing
}

export function recordError(
  _traceId: string,
  _error: Error | string,
  _context?: {
    category?: 'USER' | 'SYSTEM' | 'TOOL' | 'LLM' | 'NETWORK'
    agentName?: string
    toolName?: string
    recoverable?: boolean
  }
) {
  // no-op
}

export function recordUserAction(
  _traceId: string,
  _action: {
    type: string
    approved: boolean
    payload?: unknown
    reasoning?: string
  }
) {
  // no-op
}
