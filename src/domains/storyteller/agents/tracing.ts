import { randomBytes } from 'node:crypto'
import { TRACE_ID_HEX_ENCODING } from '@/domains/storyteller/agents/constants/tracing'

/**
 * Trace-id helpers shared by the chat routes and the dev tooling.
 * (Moved out of the legacy orchestration/WorkflowContext so that module can
 * be deleted with the writers'-room architecture.)
 */

/** Mastra expects traceId to be 1-32 hexadecimal characters (no UUIDs). */
export function createMastraTraceId(): string {
  return randomBytes(16).toString(TRACE_ID_HEX_ENCODING)
}

/** Return a Mastra-compatible trace ID (1–32 hex chars). UUIDs are converted to 32 hex; invalid values get a new id. */
export function normalizeMastraTraceId(id: string | null | undefined): string {
  if (!id) return createMastraTraceId()
  const hex = id.replace(/-/g, '').slice(0, 32)
  if (/^[0-9a-fA-F]+$/.test(hex) && hex.length >= 1) return hex
  return createMastraTraceId()
}
