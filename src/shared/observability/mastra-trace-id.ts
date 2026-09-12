/** Mastra expects traceId to be 1–32 hexadecimal characters (no UUID dashes). */

import { randomBytes } from 'node:crypto'

export const MASTRA_TRACE_ID_HEX_ENCODING = 'hex'
const MASTRA_TRACE_ID_HEX_MAX = 32
const HEX_ID_PATTERN = /^[0-9a-fA-F]+$/

export function createMastraTraceId(): string {
  return randomBytes(16).toString(MASTRA_TRACE_ID_HEX_ENCODING)
}

export function normalizeMastraTraceId(id: string | null | undefined): string {
  if (!id) return createMastraTraceId()
  const hex = id.replace(/-/g, '').slice(0, MASTRA_TRACE_ID_HEX_MAX)
  if (HEX_ID_PATTERN.test(hex) && hex.length >= 1) return hex
  return createMastraTraceId()
}
