/**
 * SSE tool-call chunk handler — section shimmer, agent status, timing.
 */

import { detectLoadingSection } from '@/domains/storyteller/config/tool-result-mapper'
import { emitFrame, isRecord, type StreamSession } from './stream-session-wire'

/** `chunk.type === 'tool-call'` — section shimmer + agent status + timing. */
export function handleToolCallChunk(
  session: StreamSession,
  payload: { toolName?: string; args?: unknown }
): void {
  const toolName = payload.toolName || 'tool'
  const toolArgs = isRecord(payload.args) ? payload.args : {}

  console.log(`[Stream] Tool call: ${toolName}, args keys:`, Object.keys(toolArgs))

  // Emit section_loading when update tools are called
  const loadingSection = detectLoadingSection(toolName, toolArgs)
  if (loadingSection) {
    emitFrame(session.writer, {
      type: 'section_loading',
      section: loadingSection,
      loading: true,
    })
  }

  emitFrame(session.writer, {
    type: 'agent_status',
    agent: 'Storyteller',
    status: 'thinking',
    message: `Using ${toolName}...`,
  })

  // Track tool call start time for duration calculation
  session.toolCallStartTimes.set(toolName, Date.now())
}
