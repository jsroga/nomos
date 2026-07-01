/**
 * Shared helpers for working with Mastra/AI-SDK agent responses.
 *
 * Centralizes two patterns that were duplicated across every council agent:
 *  - extracting chain-of-thought ("thinking") from a generate() response, whose
 *    shape varies across SDK versions (reasoning / thinking / steps[0].thinking)
 *  - truncating long text for trace/observability payloads
 */

/** Max characters of context/output to include in trace payloads. */
export const TRACE_PREVIEW_CHARS = 500

/** Minimal shape we read from an agent generate() response. */
interface AgentResponseLike {
  reasoning?: unknown
  thinking?: unknown
  steps?: Array<{ thinking?: unknown }>
}

/**
 * Extract the model's chain-of-thought from a generate() response, tolerating
 * the different shapes returned across AI SDK / Mastra versions.
 */
export function extractThinking(response: unknown): string | undefined {
  const r = response as AgentResponseLike | null | undefined
  const candidate = r?.reasoning ?? r?.thinking ?? r?.steps?.[0]?.thinking
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : undefined
}

/** Truncate text for trace/observability payloads (default {@link TRACE_PREVIEW_CHARS}). */
export function truncateForTrace(text: string, max: number = TRACE_PREVIEW_CHARS): string {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) : text
}
