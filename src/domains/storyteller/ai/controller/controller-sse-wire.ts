/**
 * AgentController event → SSE frame-intent mapper (PLAN-V2 Phase 4.3).
 *
 * Pure translation of `AgentControllerEvent`s into semantic frame intents that
 * the flagged stream route applies through the EXISTING `stream-wire` emitters
 * — so the controller path emits byte-identical frames to the legacy path (ADR
 * §"SSE mapping"). Kept pure (no writer, no session) so it is unit-tested with
 * synthetic events, no LLM/DB keys required.
 *
 * `-wire.ts` so the no-magic-string rule permits the external library's event
 * discriminant literals (needed for TS narrowing — const-widened strings would
 * not narrow the `AgentControllerEvent` union).
 */


import '@/shared/data/server-guard'
import type {
  AgentControllerEvent,
  AgentControllerMessage,
  AgentControllerMessageContent,
} from '@mastra/core/agent-controller'

/** Per-stream mutable state: how much of each message's text/thinking was already emitted. */
export interface ControllerStreamContext {
  emittedText: Map<string, number>
  emittedThinking: Map<string, number>
  /** toolCallId → toolName, captured on tool_start for use on tool_end (which omits the name). */
  toolNames: Map<string, string>
}

export function createControllerStreamContext(): ControllerStreamContext {
  return { emittedText: new Map(), emittedThinking: new Map(), toolNames: new Map() }
}

/**
 * Semantic frame intents. The route maps each to a concrete `stream-wire`
 * emitter, guaranteeing byte-parity with the legacy path.
 */
export type ControllerFrameIntent =
  | { kind: 'token'; token: string }
  | { kind: 'thinking'; thinking: string }
  | { kind: 'status' }
  | { kind: 'info'; message: string }
  | { kind: 'error'; error: unknown }
  | { kind: 'toolResult'; toolName: string; result: unknown; isError: boolean }
  | { kind: 'planQuestion'; toolCallId: string; toolName: string; args: unknown }
  | { kind: 'complete' }

/** Single pass over message parts: accumulate text and reasoning separately. */
function extractMessageStreams(content: AgentControllerMessageContent[]): {
  text: string
  thinking: string
} {
  let text = ''
  let thinking = ''
  for (const part of content) {
    if (part.type === 'text') text += part.text
    else if (part.type === 'thinking') thinking += part.thinking
  }
  return { text, thinking }
}

/** Emit only the newly-appended slice of a snapshot string (controller messages are cumulative). */
function deltaFor(seen: Map<string, number>, id: string, full: string): string | undefined {
  const prev = seen.get(id) ?? 0
  if (full.length <= prev) return undefined
  seen.set(id, full.length)
  return full.slice(prev)
}

function mapMessageSnapshot(
  message: AgentControllerMessage,
  ctx: ControllerStreamContext
): ControllerFrameIntent[] {
  const intents: ControllerFrameIntent[] = []
  const { text, thinking } = extractMessageStreams(message.content)

  const thinkingDelta = deltaFor(ctx.emittedThinking, message.id, thinking)
  if (thinkingDelta) intents.push({ kind: 'thinking', thinking: thinkingDelta })

  const textDelta = deltaFor(ctx.emittedText, message.id, text)
  if (textDelta) intents.push({ kind: 'token', token: textDelta })

  return intents
}

/**
 * Map one controller event to zero or more frame intents (ADR §"SSE mapping").
 * `agent_start` maps to nothing here — the route emits the single `Start` frame
 * at stream open, matching the legacy path.
 */
export function mapControllerEvent(
  event: AgentControllerEvent,
  ctx: ControllerStreamContext
): ControllerFrameIntent[] {
  switch (event.type) {
    case 'message_start':
    case 'message_update':
    case 'message_end':
      return mapMessageSnapshot(event.message, ctx)
    case 'tool_start':
      ctx.toolNames.set(event.toolCallId, event.toolName)
      return [{ kind: 'status' }]
    case 'tool_approval_required':
      // The plan-first gate: `submit_plan` (and any approval-required tool)
      // surfaces as a plan question — the same UI affordance as the verdict.
      return [
        {
          kind: 'planQuestion',
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          args: event.args,
        },
      ]
    case 'tool_end':
      return [
        {
          kind: 'toolResult',
          toolName: ctx.toolNames.get(event.toolCallId) ?? '',
          result: event.result,
          isError: event.isError,
        },
      ]
    case 'mode_changed':
      return [{ kind: 'info', message: `Mode: ${event.modeId}` }]
    case 'info':
      return [{ kind: 'info', message: event.message }]
    case 'error':
      return [{ kind: 'error', error: event.error }]
    case 'agent_end':
      // A failed run already surfaced an `error` event; only a clean end completes.
      return event.reason === 'error' ? [] : [{ kind: 'complete' }]
    default:
      return []
  }
}
