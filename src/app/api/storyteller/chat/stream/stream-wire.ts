/**
 * SSE wire module for the storyteller chat stream route: frame vocabulary
 * (enum) + Mastra chunk handlers + session state. Thin route constants and
 * shared frame emitters live in `stream-route-wire.ts`; controller event mapping
 * lives in `domains/storyteller/ai/controller/controller-sse-wire.ts`.
 *
 * Every emitted frame is BYTE-IDENTICAL to the previous inline code. The SSE
 * wire contract is frozen; change shapes only with the sse-wire-contract skill.
 *
 * PLAN-V2 3.2 relocates `ChatStreamFrameType` to `shared/chat/core/protocol.ts`
 * so route and useChatStream import the same contract.
 */

import {
  RUN_BEAT_DRAFT_WORKFLOW_TOOL_ID,
  VERDICT_STEP_ID,
} from '@/domains/storyteller/core/io/mastra-runtime'
import {
  mapToolResultToAction,
  detectLoadingSection,
  getActionDedupeKey,
  type DetectedSection,
} from '@/domains/storyteller/config/tool-result-mapper'
import { getErrorMessage } from '@/shared/errors/error-utils'

// The frame vocabulary lives in the chat platform protocol (PLAN-V2 3.2) —
// route and useChatStream import the SAME enum, so they cannot drift.
import { ChatFrameType } from '@/shared/chat/core/protocol'

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
  projectId: string | undefined
  episodeId: string | undefined
  isSectionUpdate: boolean
  existingBibleData: Record<string, unknown>
  toolCallStartTimes: Map<string, number>
  emittedActionKeys: Set<string>
  pendingActions: Record<string, unknown>[]
  detectedSection: DetectedSection
  fullText: string
}

/** `chunk.type === 'error'` — emit error + system message + complete, then close. */
export function handleErrorChunk(session: StreamSession, payloadError: unknown): void {
  const { message: errorMessage, code: errorCode } = toErrorInfo(payloadError)

  console.error('[Stream] Error chunk received:', errorMessage)

  emitFrame(session.writer, {
    type: 'error',
    error: {
      message: errorMessage,
      code: errorCode,
    },
  })

  emitFrame(session.writer, {
    type: 'message',
    message: {
      sender: 'System',
      content: `❌ **API Error:** ${errorMessage}`,
      type: 'error',
    },
  })

  emitFrame(session.writer, { type: 'complete' })
  session.writer.close()
}

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

/** Tool results arrive as strings or objects; parse leniently, never throw. */
function parseToolResult(toolResult: unknown): {
  parsed: unknown
  parsedRecord: Record<string, unknown> | undefined
} {
  let parsed: unknown
  try {
    parsed = typeof toolResult === 'string' ? JSON.parse(toolResult) : toolResult
  } catch {
    parsed = toolResult
  }
  return { parsed, parsedRecord: isRecord(parsed) ? parsed : undefined }
}

/**
 * Beat-draft verdict gate: when the workflow entry tool suspends at the
 * editorial verdict, surface it through the EXISTING questions/awaiting_input
 * frames (published wire contract — no new frame types). The UI answers via
 * the existing POST /api/storyteller/workflow/resume.
 */
function emitVerdictGateIfSuspended(
  session: StreamSession,
  toolName: string,
  parsedRecord: Record<string, unknown> | undefined
): void {
  if (
    toolName !== RUN_BEAT_DRAFT_WORKFLOW_TOOL_ID ||
    !parsedRecord ||
    parsedRecord.status !== 'suspended' ||
    typeof parsedRecord.runId !== 'string' ||
    parsedRecord.runId.length === 0
  ) {
    return
  }
  const workflowRunId = parsedRecord.runId
  const verdictQuestion = {
    id: `q-editorial-verdict-${Date.now()}`,
    agentName: 'Storyteller',
    question: 'The draft and critiques are ready. What is your editorial verdict?',
    questionType: 'single_choice' as const,
    options: [
      {
        id: 'approve',
        label: 'Approve',
        description: 'Revise against the critiques as-is',
        recommended: true,
      },
      {
        id: 'revise',
        label: 'Revise with note',
        description: 'Add editorial direction (it outranks the critics)',
      },
      {
        id: 'kill',
        label: 'Kill',
        description: 'Discard the draft entirely — nothing is saved',
      },
    ],
    context: 'Beat-draft pipeline paused at the editorial verdict.',
    urgency: 'blocking' as const,
    defaultOption: 'approve',
    timeout: 120,
  }

  emitFrame(session.writer, {
    type: 'questions',
    questions: [verdictQuestion],
    workflowStepId: VERDICT_STEP_ID,
    workflowRunId,
    traceId: session.traceId,
  })
  emitFrame(session.writer, {
    type: 'awaiting_input',
    reason: 'creative_decision',
    workflowRunId,
  })
}

/** Auto-link entity names in string/array payload fields (best-effort). */
async function autoLinkActionPayload(
  actionPayload: Record<string, unknown>,
  projectId: string
): Promise<Record<string, unknown>> {
  const linkedPayload = { ...actionPayload }
  try {
    const { entityAutoLinker } = await import(
      '@/domains/storyteller/services/entity-auto-linker-service'
    )

    // Auto-link text fields in the payload
    for (const [key, value] of Object.entries(linkedPayload)) {
      if (typeof value === 'string' && value.length > 10) {
        linkedPayload[key] = await entityAutoLinker.autoLink(value, projectId)
      } else if (Array.isArray(value)) {
        // Handle arrays (e.g., plotTwists)
        linkedPayload[key] = await Promise.all(
          value.map(async (item: unknown) => {
            if (typeof item === 'string') {
              return await entityAutoLinker.autoLink(item, projectId)
            } else if (isRecord(item)) {
              // Handle objects with text fields
              const linkedItem: Record<string, unknown> = { ...item }
              for (const [field, fieldValue] of Object.entries(linkedItem)) {
                if (typeof fieldValue === 'string' && fieldValue.length > 10) {
                  linkedItem[field] = await entityAutoLinker.autoLink(fieldValue, projectId)
                }
              }
              return linkedItem
            }
            return item
          })
        )
      }
    }
  } catch (err) {
    console.warn('[Stream] Entity auto-linking in payload failed:', err)
    // Continue with original payload
  }
  return linkedPayload
}

/** Dedupe, auto-link, and queue an action for post-message emission. */
async function collectAction(
  session: StreamSession,
  toolName: string,
  action: { actionType: string; actionPayload: Record<string, unknown>; requiresApproval: boolean },
  parsedRecord: Record<string, unknown> | undefined
): Promise<void> {
  const { actionType, actionPayload, requiresApproval } = action

  // Generate deduplication key to prevent emitting same action multiple times
  const dedupeKey = getActionDedupeKey(toolName, session.detectedSection, actionPayload)

  if (session.emittedActionKeys.has(dedupeKey)) {
    console.log(
      `[Stream] Skipping duplicate action: ${actionType} for section ${session.detectedSection}`
    )
    return
  }
  // Mark this action as emitted
  session.emittedActionKeys.add(dedupeKey)

  // Auto-link entities in action payload fields before storing
  const linkedPayload = session.projectId
    ? await autoLinkActionPayload(actionPayload, session.projectId)
    : { ...actionPayload }

  // Collect action to emit after final message
  const actionWithBefore = {
    type: actionType,
    payload: {
      ...linkedPayload,
      _before: session.existingBibleData[session.detectedSection] || null, // For diff viewer
    },
    status: requiresApproval ? 'pending' : 'committed',
    confidence: typeof parsedRecord?.confidence === 'number' ? parsedRecord.confidence : 1.0,
    reasoning:
      typeof parsedRecord?.message === 'string'
        ? parsedRecord.message
        : `Tool ${toolName} completed successfully`,
  }

  session.pendingActions.push(actionWithBefore)
  console.log(
    `[Stream] Collected action for later emission: ${actionType} (approval=${requiresApproval})`
  )

  // End section loading when we have a detected section
  if (session.detectedSection !== 'full' && toolName === 'update_world_bible') {
    emitFrame(session.writer, {
      type: 'section_loading',
      section: session.detectedSection,
      loading: false,
    })
  }
}

/** `chunk.type === 'tool-result'` — emit result, verdict gate, and outcome mapping. */
export async function handleToolResultChunk(
  session: StreamSession,
  payload: { toolName?: string; result?: unknown }
): Promise<void> {
  const toolName = payload.toolName || ''
  const toolResult: unknown = payload.result
  console.log(
    `[Stream] Tool result received: ${toolName}`,
    typeof toolResult === 'string' ? toolResult.substring(0, 200) : toolResult
  )

  // Parse tool result early — needed for SSE events. `parsed` stays unknown;
  // every access below goes through the narrowing helpers (no casts).
  const { parsed, parsedRecord } = parseToolResult(toolResult)

  // Calculate duration from tool call start
  const startTime = session.toolCallStartTimes.get(toolName)
  if (startTime) {
    session.toolCallStartTimes.delete(toolName)
  }

  // Send tool_result event with PARSED result for client
  emitFrame(session.writer, {
    type: 'tool_result',
    toolName,
    result: parsed, // Send parsed result so client can access .phase, .success, etc.
  })

  emitVerdictGateIfSuspended(session, toolName, parsedRecord)

  // Continue with action event mapping
  try {
    // Safe logging of tool result status
    if (parsedRecord) {
      console.log(
        `[Stream] Parsed tool result success=${parsedRecord.success}, keys:`,
        Object.keys(parsedRecord)
      )
    } else {
      console.log(
        `[Stream] Parsed tool result type=${typeof parsed}, value preview:`,
        typeof parsed === 'string' ? parsed.substring(0, 50) + '...' : parsed
      )
    }

    // Map the parsed tool result to a UI outcome (pure logic)
    const outcome = mapToolResultToAction({
      toolName,
      parsed,
      episodeId: session.episodeId,
      isSectionUpdate: session.isSectionUpdate,
      currentSection: session.detectedSection,
    })

    // Interactive / notification outcomes are emitted directly (no action)
    if (outcome.kind === 'questions') {
      emitFrame(session.writer, { type: 'questions', questions: outcome.questions })
      return
    }
    if (outcome.kind === 'info') {
      emitFrame(session.writer, { type: 'info', message: outcome.message, data: outcome.data })
      return
    }
    if (outcome.kind === 'navigation') {
      emitFrame(session.writer, {
        type: 'navigation',
        action: outcome.action,
        episodeId: outcome.episodeId,
      })
      return
    }

    if (outcome.kind === 'action') {
      session.detectedSection = outcome.detectedSection
      await collectAction(
        session,
        toolName,
        {
          actionType: outcome.actionType,
          actionPayload: outcome.actionPayload,
          requiresApproval: outcome.requiresApproval,
        },
        parsedRecord
      )
    }
  } catch {
    // Tool result wasn't JSON or parsing failed - that's ok
  }
}

/** fullStream iterator threw — emit error + message + complete, close. */
export function handleStreamIterationError(session: StreamSession, error: unknown): void {
  // The fullStream iterator threw - extract error details and send to client
  console.error('Stream iteration error:', error)
  const errRecord = isRecord(error) ? error : undefined
  const nestedError = isRecord(errRecord?.error) ? errRecord.error : undefined

  let errorMessage = 'An error occurred while processing your request.'
  let errorCode = 'STREAM_ERROR'

  if (nestedError?.code === 'insufficient_quota') {
    errorMessage =
      '⚠️ OpenAI API quota exceeded. Please check your billing details or try again later.'
    errorCode = 'QUOTA_EXCEEDED'
  } else if (typeof nestedError?.message === 'string') {
    errorMessage = nestedError.message
    errorCode = typeof nestedError.code === 'string' ? nestedError.code : 'API_ERROR'
  } else if (errRecord?.message) {
    errorMessage = getErrorMessage(error)
  }

  // Send error event to client
  emitFrame(session.writer, {
    type: 'error',
    error: {
      message: errorMessage,
      code: errorCode,
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
    },
  })

  // Also send as a message so it's visible in chat
  emitFrame(session.writer, {
    type: 'message',
    message: {
      sender: 'System',
      content: `❌ **Error:** ${errorMessage}`,
      type: 'error',
    },
  })

  emitFrame(session.writer, { type: 'complete' })
  session.writer.close()
}

/** Auto-link the final text, emit message + queued actions + complete, close. */
export async function finalizeStream(session: StreamSession): Promise<void> {
  // Auto-link entity names in generated text before sending
  let finalText = session.fullText
  if (session.projectId && session.fullText.length > 0) {
    try {
      const { entityAutoLinker } = await import(
        '@/domains/storyteller/services/entity-auto-linker-service'
      )
      finalText = await entityAutoLinker.autoLink(session.fullText, session.projectId)
    } catch (err) {
      console.warn('[Stream] Entity auto-linking failed:', err)
      // Continue with original text
    }
  }

  // Send final message with auto-linked entities
  emitFrame(session.writer, {
    type: 'message',
    message: {
      sender: 'Storyteller',
      content: finalText,
      type: 'ai',
    },
  })

  // NOW emit any collected actions (appears after final message for better UX)
  for (const action of session.pendingActions) {
    emitFrame(session.writer, {
      type: 'action',
      action,
    })
    console.log(`[Stream] Emitted action at end: ${action.type}`)
  }

  // Send complete event
  emitFrame(session.writer, { type: 'complete' })

  session.writer.close()
}
