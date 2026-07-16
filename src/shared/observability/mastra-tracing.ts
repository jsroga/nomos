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
import { sanitizeInput, sanitizeOutput } from './observability'

interface WithSpanMetadata {
  userId?: string
  sessionId?: string
  [key: string]: unknown
}

/**
 * Handle passed to a {@link withMastraSpan} callback.
 *
 * `spanId` is the REAL Mastra span id — pass it as `tracingOptions.parentSpanId`
 * on an inner `agent.generate()/stream()` to nest that run explicitly under this
 * span (belt-and-suspenders alongside the ambient tracing context). Undefined
 * only when tracing is disabled.
 */
export interface MastraSpanHandle {
  spanId?: string
  end: () => void
}

/**
 * Run `fn` inside a real Mastra span named `name`, parented to trace `traceId`.
 * If tracing is disabled the callback still runs (span resolves to undefined).
 */
export async function withMastraSpan<T>(
  traceId: string,
  name: string,
  fn: (span: MastraSpanHandle) => Promise<T>,
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

  const handle: MastraSpanHandle = { spanId: span.id, end: () => span.end() }
  return executeWithContext({
    span,
    fn: async () => {
      try {
        const result = await fn(handle)
        span.end({ output: sanitizeOutput(result) })
        return result
      } catch (error) {
        span.error({ error: toError(error) })
        throw error
      }
    },
  })
}
