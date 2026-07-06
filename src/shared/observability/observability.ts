import { Langfuse, Span, LangfuseTraceClient } from 'langfuse'
import { getErrorMessage, toError } from '@/shared/errors/error-utils'

// Initialize Langfuse singleton with robust configuration
// Ensure environment variables LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY are set
export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl:
    process.env.LANGFUSE_BASE_URL || process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
  // Robust configuration
  flushAt: 5, // Flush every 5 events for responsiveness
  flushInterval: 1000, // Flush every 1 second
  requestTimeout: 10000, // 10 second timeout
  enabled: !!(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY),
})

// Check if Langfuse is properly configured
export const isLangfuseEnabled = !!(
  process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY
)

// Log initialization status
if (isLangfuseEnabled) {
  console.log('✅ Langfuse observability enabled')
} else {
  console.warn('⚠️ Langfuse not configured - tracing disabled')
}

// Score data types as per Langfuse SDK
export type ScoreDataType = 'NUMERIC' | 'CATEGORICAL' | 'BOOLEAN'

// Score configuration interface for structured score creation
export interface LangfuseScoreConfig {
  traceId: string
  name: string
  value: number | string | boolean
  comment?: string
  dataType?: ScoreDataType
  observationId?: string
  /** Optional idempotency key - use to prevent duplicate scores */
  id?: string
}

// =============================================================================
// INPUT/OUTPUT SANITIZATION - Prevent undefined values in Langfuse
// =============================================================================

// Sensitive field patterns to redact
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

/**
 * Check if a field name is sensitive
 */
function isSensitiveField(key: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(key))
}

/**
 * Sanitize a value for Langfuse input/output fields
 * Ensures we never send undefined - Langfuse shows this as literal "undefined"
 * Also redacts sensitive fields like passwords, API keys, tokens
 */
export function sanitizeForLangfuse(value: any, fallback: string = '(empty)'): any {
  if (value === undefined || value === null) {
    return fallback
  }
  if (typeof value === 'string') {
    return value || fallback
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(v => sanitizeForLangfuse(v, fallback)) : [fallback]
  }
  if (typeof value === 'object') {
    // Recursively sanitize object properties
    const sanitized: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      // Security: Redact sensitive fields
      if (isSensitiveField(key)) {
        sanitized[key] = '***REDACTED***'
      } else {
        sanitized[key] = sanitizeForLangfuse(val, `(no ${key})`)
      }
    }
    return sanitized
  }
  return value
}

/**
 * Sanitize span/generation input ensuring it's never undefined
 */
export function sanitizeInput(input: any): string | Record<string, unknown> {
  if (input === undefined || input === null) {
    return '(no input provided)'
  }
  if (typeof input === 'string') {
    return input || '(empty input)'
  }
  return sanitizeForLangfuse(input, '(empty)')
}

/**
 * Sanitize span/generation output ensuring it's never undefined
 */
export function sanitizeOutput(output: any): string | Record<string, unknown> {
  if (output === undefined || output === null) {
    return '(no output)'
  }
  if (typeof output === 'string') {
    return output || '(empty output)'
  }
  return sanitizeForLangfuse(output, '(empty)')
}

// =============================================================================
// AGENT TRACING - Enhanced tracing for storyteller agents
// =============================================================================

export interface AgentTraceContext {
  traceId: string
  agentName: string
  sessionId?: string
  userId?: string
  projectId?: string
  episodeId?: string
}

/**
 * Create a trace specifically for agent operations
 * Shows up clearly in Langfuse with agent metadata
 */
export function createAgentTrace(ctx: AgentTraceContext): LangfuseTraceClient {
  return langfuse.trace({
    id: ctx.traceId,
    name: `Agent: ${ctx.agentName}`,
    userId: ctx.userId,
    sessionId: ctx.sessionId,
    metadata: {
      agentName: ctx.agentName,
      projectId: ctx.projectId,
      episodeId: ctx.episodeId,
    },
    tags: ['storyteller', 'agent', ctx.agentName.toLowerCase()],
  })
}

/**
 * Record an agent generation (LLM call) with full tracing
 */
export function recordAgentGeneration(
  traceId: string,
  agentName: string,
  input: { prompt: string; context?: string },
  output: { text: string; thinking?: string },
  metadata?: { model?: string; temperature?: number; tokens?: number }
) {
  const generation = langfuse.generation({
    traceId,
    name: `${agentName}.generate`,
    model: metadata?.model || 'gpt-4o',
    input: sanitizeInput(input.prompt),
    output: sanitizeOutput(output.text),
    metadata: {
      context: input.context?.slice(0, 500) || '(no context)',
      hasThinking: !!output.thinking,
      thinkingPreview: output.thinking?.slice(0, 200) || '(no thinking)',
    },
    modelParameters: {
      temperature: metadata?.temperature,
    },
    usage: metadata?.tokens ? { totalTokens: metadata.tokens } : undefined,
  })
  return generation
}

/**
 * Record agent scores for evaluation
 * Supports both single score and array of scores
 *
 * Per Langfuse SDK docs: https://langfuse.com/docs/evaluation/evaluation-methods/scores-via-sdk
 * - Numeric scores: value as float (0-1 normalized)
 * - Categorical scores: value as string
 * - Boolean scores: value as 0 or 1
 */
export function recordAgentScore(
  traceId: string,
  nameOrScores: string | LangfuseScoreConfig[],
  value?: number,
  comment?: string,
  options?: { dataType?: ScoreDataType; id?: string; observationId?: string }
) {
  // Handle array of scores
  if (Array.isArray(nameOrScores)) {
    for (const score of nameOrScores) {
      const scoreValue = typeof score.value === 'boolean' ? (score.value ? 1 : 0) : score.value

      langfuse.score({
        traceId: score.traceId,
        name: score.name,
        value: scoreValue as number,
        comment: score.comment,
        dataType: score.dataType,
        observationId: score.observationId,
        id: score.id, // Idempotency key
      })
    }
    return
  }

  // Handle single score
  if (typeof nameOrScores === 'string' && value !== undefined) {
    langfuse.score({
      traceId,
      name: nameOrScores,
      value,
      comment,
      dataType: options?.dataType || 'NUMERIC',
      id: options?.id, // Idempotency key
      observationId: options?.observationId,
    })
  }
}

/**
 * Record agent thinking/reasoning for debugging
 */
export function recordAgentThinking(traceId: string, agentName: string, thinking: string) {
  langfuse.event({
    traceId,
    name: `${agentName}.thinking`,
    input: sanitizeInput(thinking?.slice(0, 2000)),
    metadata: { type: 'thinking', agentName },
  })
}

/**
 * Wraps an async function with a Langfuse span.
 * Supports passing userId and sessionId to link the trace.
 */
export async function withSpan<T>(
  traceId: string,
  name: string,
  fn: (span: Span) => Promise<T>,
  input?: any,
  metadata?: { userId?: string; sessionId?: string; [key: string]: any }
): Promise<T> {
  // Update trace metadata if provided
  if (metadata?.userId || metadata?.sessionId) {
    langfuse.trace({
      id: traceId,
      userId: metadata.userId,
      sessionId: metadata.sessionId,
    })
  }

  const span = langfuse.span({
    traceId,
    name,
    input: sanitizeInput(input),
    ...metadata,
  })

  try {
    const result = await fn(span)
    span.end({ output: sanitizeOutput(result) })
    return result
  } catch (error: unknown) {
    span.end({
      output: sanitizeOutput({ error: getErrorMessage(error) }),
      level: 'ERROR',
      statusMessage: getErrorMessage(error) || '(unknown error)',
    })
    throw error
  }
}

/**
 * Flushes events to Langfuse. Call this before process exit.
 */
export async function flushObservability() {
  if (!isLangfuseEnabled) return
  try {
    await langfuse.flush()
  } catch (e) {
    console.warn('Failed to flush Langfuse:', e)
  }
}

// =============================================================================
// TOOL CALL TRACING - Track tool invocations with proper parent linkage
// =============================================================================

export interface ToolCallTrace {
  traceId: string
  toolName: string
  args: Record<string, unknown>
  result?: any
  error?: string
  durationMs?: number
  /** Parent observation ID (generation or span) for proper nesting */
  parentObservationId?: string
}

/**
 * Record a tool call with full context and proper parent linkage
 * This creates a span that appears nested under the parent in Langfuse UI
 *
 * Per Langfuse docs, we use parentObservationId to link to parent generation
 */
export function recordToolCall(traceData: ToolCallTrace) {
  if (!isLangfuseEnabled) return

  try {
    // Create span config with sanitized input/output to prevent undefined
    const spanConfig: any = {
      traceId: traceData.traceId,
      name: `tool:${traceData.toolName}`,
      input: sanitizeInput(traceData.args),
      output: sanitizeOutput(traceData.result),
      metadata: {
        toolName: traceData.toolName,
        hasError: !!traceData.error,
        durationMs: traceData.durationMs,
      },
      level: traceData.error ? 'ERROR' : 'DEFAULT',
      statusMessage: traceData.error || undefined,
    }

    // Add parent linkage if provided
    if (traceData.parentObservationId) {
      spanConfig.parentObservationId = traceData.parentObservationId
    }

    const span = langfuse.span(spanConfig)

    // Always end the span immediately for tool calls (they're discrete events)
    span.end()

    console.log(
      `[Langfuse] Recorded tool call: ${traceData.toolName} (parent: ${traceData.parentObservationId || 'none'})`
    )

    return span
  } catch (e) {
    console.warn(`[Langfuse] Failed to record tool call ${traceData.toolName}:`, e)
    return null
  }
}

/**
 * Record an error with categorization
 */
export function recordError(
  traceId: string,
  error: Error | string,
  context?: {
    category?: 'USER' | 'SYSTEM' | 'TOOL' | 'LLM' | 'NETWORK'
    agentName?: string
    toolName?: string
    recoverable?: boolean
  }
) {
  if (!isLangfuseEnabled) return

  const errorMessage = error instanceof Error ? getErrorMessage(error) : error
  const errorStack = error instanceof Error ? toError(error).stack : undefined

  langfuse.event({
    traceId,
    name: 'error',
    input: sanitizeInput({
      message: errorMessage || '(unknown error)',
      stack: errorStack?.slice(0, 1000) || '(no stack)',
      category: context?.category || 'SYSTEM',
      agentName: context?.agentName || '(unknown agent)',
      toolName: context?.toolName || '(no tool)',
      recoverable: context?.recoverable ?? false,
    }),
    level: 'ERROR',
    metadata: {
      errorType: error instanceof Error ? toError(error).name : 'Unknown',
      ...context,
    },
  })
}

/**
 * Record action approval/rejection by user
 */
export function recordUserAction(
  traceId: string,
  action: {
    type: string
    approved: boolean
    payload?: any
    reasoning?: string
  }
) {
  if (!isLangfuseEnabled) return

  langfuse.event({
    traceId,
    name: action.approved ? 'action_approved' : 'action_rejected',
    input: sanitizeInput({
      actionType: action.type || '(unknown action)',
      payloadPreview: JSON.stringify(action.payload)?.slice(0, 500) || '(no payload)',
    }),
    metadata: {
      actionType: action.type,
      approved: action.approved,
      reasoning: action.reasoning || '(no reasoning)',
    },
  })

  // Also record as score for analytics
  langfuse.score({
    traceId,
    name: 'user_action_approval',
    value: action.approved ? 1 : 0,
    comment: `${action.type}: ${action.approved ? 'approved' : 'rejected'}`,
    dataType: 'BOOLEAN',
  })
}

// =============================================================================
// GRACEFUL SHUTDOWN - Ensure all traces are flushed
// =============================================================================

let isShuttingDown = false

async function gracefulShutdown() {
  if (isShuttingDown) return
  isShuttingDown = true

  console.log('🔄 Flushing Langfuse traces before shutdown...')
  try {
    await langfuse.flush()
    console.log('✅ Langfuse traces flushed')
  } catch (e) {
    console.warn('⚠️ Failed to flush Langfuse on shutdown:', e)
  }
}

// Register shutdown handlers (only in Node.js environment)
if (typeof process !== 'undefined' && process.on) {
  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)
  process.on('beforeExit', gracefulShutdown)
}
