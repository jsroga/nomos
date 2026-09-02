/**
 * Core SSE wire types and frame emitters shared by stream chunk handlers.
 */

import type { DetectedSection } from '@/domains/storyteller/config/tool-result-mapper'
import { ChatFrameType } from '@/shared/chat/core/protocol'
import type { ProjectScope } from '@/shared/auth/project-scope'

export { ChatFrameType as ChatStreamFrameType }

/** Narrow an unknown JSON value to an indexable record (no casts downstream). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Extract a human-readable message/code pair from an unknown stream error. */
export function toErrorInfo(raw: unknown): { message: string; code: string } {
  if (isRecord(raw)) {
    const message = typeof raw.message === 'string' ? raw.message : 'Unknown stream error'
    const code = typeof raw.code === 'string' ? raw.code : 'STREAM_ERROR'
    return { message, code }
  }
  if (typeof raw === 'string' && raw) return { message: raw, code: 'STREAM_ERROR' }
  return { message: 'Unknown stream error', code: 'STREAM_ERROR' }
}

/** Safe writer over the ReadableStream controller (idempotent close). */
export interface SseWriter {
  enqueue: (data: string) => boolean
  close: () => void
}

/** Serialize one SSE frame exactly as the inline code did. */
export function emitFrame(writer: SseWriter, frame: unknown): boolean {
  return writer.enqueue(`data: ${JSON.stringify(frame)}\n\n`)
}

/** Mutable per-request stream state shared by the handlers. */
export interface StreamSession {
  writer: SseWriter
  traceId: string
  /** Present only when the request named a project the caller owns. */
  scope: ProjectScope | undefined
  episodeId: string | undefined
  isSectionUpdate: boolean
  existingBibleData: Record<string, unknown>
  toolCallStartTimes: Map<string, number>
  emittedActionKeys: Set<string>
  pendingActions: Record<string, unknown>[]
  detectedSection: DetectedSection
  fullText: string
  /**
   * Tokens the provider reported, which arrive in a `finish` chunk after the
   * response has been streamed. Undefined means the stream ended without the
   * provider saying — the call is then left unrecorded rather than written in
   * at zero cost, which would read as "this was free".
   */
  usage?: { promptTokens: number; completionTokens: number }
  model?: string
}
