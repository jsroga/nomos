/**
 * SSE tool-result chunk handler — parse results, verdict gate, action mapping.
 */

import {
  RUN_BEAT_DRAFT_WORKFLOW_TOOL_ID,
  VERDICT_STEP_ID,
} from '@/domains/storyteller/core/io/mastra-runtime'
import {
  mapToolResultToAction,
  getActionDedupeKey,
} from '@/domains/storyteller/config/tool-result-mapper'
import { emitFrame, isRecord, type StreamSession } from './stream-session-wire'

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
