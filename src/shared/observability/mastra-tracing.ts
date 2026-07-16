/**
 * Real Mastra-backed tracing spans (server-only).
 *
 * Replaces the former no-op `withSpan` shim: named operation spans now record
 * through Mastra's native AI tracing (the `Observability` registry configured
 * in `create-mastra`), and any `agent.generate()` called inside the callback
 * nests under this span automatically via the AsyncLocalStorage tracing context.
 *
 * Server-only because it resolves the production Mastra instance; the
 * client-safe sanitizers stay in `./observability`.
 */

import '@/shared/data/server-guard'
import {
  getOrCreateSpan,
  executeWithContext,
  SpanType,
} from '@mastra/core/observability'
import { getMastraInstance } from '@/shared/agent-kernel/mastra-instance'
import { toError } from '@/shared/errors/error-utils'
import { sanitizeInput, sanitizeOutput, type TraceSpan } from './observability'

interface WithSpanMetadata {
  userId?: string
  sessionId?: string
  [key: string]: unknown
}

/**
 * Run `fn` inside a real Mastra span named `name`, parented to trace `traceId`.
 * If tracing is disabled the callback still runs (span resolves to undefined).
 */
export async function withMastraSpan<T>(
  traceId: string,
  name: string,
  fn: (span: TraceSpan) => Promise<T>,
  input?: unknown,
  metadata?: WithSpanMetadata
): Promise<T> {
  const span = getOrCreateSpan({
    type: SpanType.GENERIC,
    name,
    input: sanitizeInput(input),
    metadata,
    mastra: getMastraInstance(),
    tracingOptions: { traceId },
  })

  if (!span) {
    return fn({ end: () => {} })
  }

  return executeWithContext({
    span,
    fn: async () => {
      try {
        const result = await fn({ end: () => span.end() })
        span.end({ output: sanitizeOutput(result) })
        return result
      } catch (error) {
        span.error({ error: toError(error) })
        throw error
      }
    },
  })
}
