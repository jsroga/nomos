// NOTE: import from specific server-side submodules rather than the
// `@/domains/storyteller` barrel — that barrel also re-exports client UI
// components (e.g. CorkBoard), which pulls client-only hooks into this
// server Route Handler's build graph and breaks compilation.
import { createStorytellerAgent } from '@/domains/storyteller/agents'
import { normalizeMastraTraceId } from '@/domains/storyteller/agents/tracing'
import {
  RUN_BEAT_DRAFT_WORKFLOW_TOOL_ID,
  VERDICT_STEP_ID,
  buildStorytellerRequestContext,
} from '@/domains/storyteller/io/mastra-runtime'
import { isKnownChatModel, resolveChatModelId } from '@/domains/storyteller/config/ChatModelCatalog'
import { BibleSection } from '@/domains/storyteller/core'
import { assembleStorytellerContext } from '@/domains/storyteller/services/ContextAssemblyService'
import {
  mapToolResultToAction,
  detectLoadingSection,
  getActionDedupeKey,
  type DetectedSection,
} from '@/domains/storyteller/config/tool-result-mapper'
import { recordError } from '@/shared/observability/observability'
import { getErrorMessage } from '@/shared/errors/error-utils'

// Node.js Runtime required for Mastra core dependencies
export const runtime = 'nodejs'

/** Narrow an unknown JSON value to an indexable record (no casts downstream). */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Extract a human-readable message/code pair from an unknown stream error. */
function toErrorInfo(raw: unknown): { message: string; code: string } {
  if (isRecord(raw)) {
    const message = typeof raw.message === 'string' ? raw.message : 'Unknown stream error'
    const code = typeof raw.code === 'string' ? raw.code : 'STREAM_ERROR'
    return { message, code }
  }
  if (typeof raw === 'string' && raw) return { message: raw, code: 'STREAM_ERROR' }
  return { message: 'Unknown stream error', code: 'STREAM_ERROR' }
}

export async function POST(req: Request) {
  try {
    // Security: Require authentication
    const { requireAuth } = await import('@/shared/auth/auth')
    const { verifyProjectAccess, verifyEpisodeAccess } = await import(
      '@/domains/storyteller/services/AccessVerificationService'
    )

    const { session } = await requireAuth()
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse body parameters
    // Request contract unchanged: `sessionId` and `userId` remain accepted
    // body params (the legacy workflow-context consumer is gone).
    const {
      message,
      projectId,
      episodeId,
      traceId: bodyTraceId,
      agenticMode,
      currentPhase,
      modelName,
    } = await req.json()

    // Security: Validate required parameters
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid message parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Resolve the chat model id. Unknown / unset values fall back to the
    // global default so existing clients (which send no `modelName`) keep
    // working. Explicitly unknown ids are rejected to avoid silently hitting
    // an unconfigured provider.
    const resolvedModelName = resolveChatModelId(modelName)
    if (!isKnownChatModel(resolvedModelName)) {
      return new Response(
        JSON.stringify({ error: `Unknown model: ${resolvedModelName}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Security: Limit message length to prevent abuse
    if (message.length > 10000) {
      return new Response(JSON.stringify({ error: 'Message too long (max 10000 characters)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Security: Verify project access
    if (projectId && !(await verifyProjectAccess(projectId, session.user.id))) {
      return new Response(JSON.stringify({ error: 'Project not found or access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Security: Verify episode access
    if (episodeId && !(await verifyEpisodeAccess(episodeId, session.user.id))) {
      return new Response(JSON.stringify({ error: 'Episode not found or access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const traceId = normalizeMastraTraceId(req.headers.get('x-trace-id') || bodyTraceId)

    // 1. Fetch + format FULL context
    const { contextPrompt, existingBibleData } = await assembleStorytellerContext({
      projectId,
      episodeId,
      message,
      currentPhase,
      userId: session.user.id,
      onError: err => {
        console.warn('[Stream] Context assembly error:', err)
      },
    })

    const agent = await createStorytellerAgent(resolvedModelName)

    // No pattern matching - LLM decides what to update via tool calls.
    // Section is extracted from the tool result, not pre-detected.
    let detectedSection: DetectedSection = BibleSection.FULL
    const isSectionUpdate = false // Will be determined by tool call
    const sectionPrompt = '' // No forced section mode

    // Prepend context and AGENTIC INSTRUCTION
    let agenticInstruction = ''

    if (agenticMode) {
      // The writers'-room council is gone; agentic mode now means "prefer the
      // full GRRM pipeline over ad-hoc chat drafting".
      agenticInstruction = `
### AGENTIC MODE
For any request to write, draft, or generate a story beat or scene, call 'run_beat_draft_workflow' rather than drafting in chat.
`
    }

    const promptWithContext = contextPrompt
      ? `${contextPrompt}\n${sectionPrompt}\n${agenticInstruction}\nUSER REQUEST:\n${message}\n\nRemember: Use projectId="${projectId}" for all tool calls that require it.`
      : `${sectionPrompt}\n${agenticInstruction}\n${message}`

    // existingBibleData (for diff "before" state) comes from assembleStorytellerContext above.

    // Server-trusted per-request values: tools prefer these over model-supplied
    // args (IDs), and the author's model resolver reads the picker choice.
    const requestContext = buildStorytellerRequestContext({
      projectId,
      episodeId,
      authorModel: resolvedModelName,
    })

    // toolChoice 'auto' — 'required' causes infinite loops; the prompt already
    // instructs when to use tools. (The previous untyped options bag also
    // carried telemetry/memory fields the agent wrapper never forwarded.)
    const result = await agent.stream(promptWithContext, {
      toolChoice: 'auto',
      traceId,
      requestContext,
    })

    // Create SSE stream that useChatStream can parse
    const encoder = new TextEncoder()
    let fullText = ''
    const toolCallStartTimes = new Map<string, number>()

    // Track emitted actions to prevent duplicates (same tool + same section = skip)
    const emittedActionKeys = new Set<string>()

    // Collect actions to emit AFTER final message (better UX - approval appears at end)
    const pendingActions: Record<string, unknown>[] = []

    const stream = new ReadableStream({
      async start(controller) {
        // Track if controller is closed to prevent "Controller is already closed" errors
        let isStreamClosed = false

        // Safe enqueue helper that checks if stream is still open
        const safeEnqueue = (data: string) => {
          if (isStreamClosed) return false
          try {
            controller.enqueue(encoder.encode(data))
            return true
          } catch (_e) {
            console.warn('[Stream] Enqueue failed, stream likely closed')
            isStreamClosed = true
            return false
          }
        }

        // Safe close helper
        const safeClose = () => {
          if (isStreamClosed) return
          isStreamClosed = true
          try {
            controller.close()
          } catch (_e) {
            console.warn('[Stream] Close failed, already closed')
          }
        }

        // IMMEDIATELY emit section_loading if this is a section update
        if (isSectionUpdate) {
          safeEnqueue(
            `data: ${JSON.stringify({
              type: 'section_loading',
              section: detectedSection,
              loading: true,
              message: `Generating ${detectedSection}...`,
            })}\n\n`
          )
          console.log(`[Stream] Emitted section_loading: ${detectedSection} = true`)
        }

        // (The legacy writers'-room event-bus bridge lived here. Its only
        // emitter was the deleted StoryWorkflow, so those frames never fired;
        // the beat-draft verdict now flows through the tool-result branch below.)

        try {
          // Send start event
          safeEnqueue(`data: ${JSON.stringify({ type: 'start', traceId })}\n\n`)

          // If this is a section-specific update, emit section_loading event to trigger shimmer
          if (isSectionUpdate) {
            safeEnqueue(
              `data: ${JSON.stringify({
                type: 'section_loading',
                section: detectedSection,
                loading: true,
                message: `Generating ${detectedSection}...`,
              })}\n\n`
            )
          }

          try {
            for await (const chunk of result.fullStream) {
              try {
                // Handle stream errors (e.g. OpenAI quota exceeded)
                if (chunk.type === 'error') {
                  const { message: errorMessage, code: errorCode } = toErrorInfo(
                    chunk.payload.error
                  )

                  console.error('[Stream] Error chunk received:', errorMessage)

                  safeEnqueue(
                    `data: ${JSON.stringify({
                      type: 'error',
                      error: {
                        message: errorMessage,
                        code: errorCode,
                      },
                    })}\n\n`
                  )

                  safeEnqueue(
                    `data: ${JSON.stringify({
                      type: 'message',
                      message: {
                        sender: 'System',
                        content: `❌ **API Error:** ${errorMessage}`,
                        type: 'error',
                      },
                    })}\n\n`
                  )

                  safeEnqueue(`data: ${JSON.stringify({ type: 'complete' })}\n\n`)
                  safeClose()
                  return
                }

                // Mastra chunk types (official union from @mastra/core/stream)
                if (chunk.type === 'text-delta') {
                  const text = chunk.payload.text
                  if (text) {
                    fullText += text
                    safeEnqueue(`data: ${JSON.stringify({ type: 'token', token: text })}\n\n`)
                  }
                } else if (chunk.type === 'reasoning-delta') {
                  // Extended thinking / chain-of-thought from the model
                  const thinking = chunk.payload.text
                  if (thinking) {
                    safeEnqueue(
                      `data: ${JSON.stringify({
                        type: 'thinking',
                        thinking,
                        agent: 'Storyteller',
                      })}\n\n`
                    )
                  }
                } else if (chunk.type === 'tool-call') {
                  const toolName = chunk.payload.toolName || 'tool'
                  const toolArgs = isRecord(chunk.payload.args) ? chunk.payload.args : {}

                  console.log(`[Stream] Tool call: ${toolName}, args keys:`, Object.keys(toolArgs))

                  // Emit section_loading when update tools are called
                  const loadingSection = detectLoadingSection(toolName, toolArgs)
                  if (loadingSection) {
                    safeEnqueue(
                      `data: ${JSON.stringify({
                        type: 'section_loading',
                        section: loadingSection,
                        loading: true,
                      })}\n\n`
                    )
                  }

                  safeEnqueue(
                    `data: ${JSON.stringify({
                      type: 'agent_status',
                      agent: 'Storyteller',
                      status: 'thinking',
                      message: `Using ${toolName}...`,
                    })}\n\n`
                  )

                  // Track tool call start time for duration calculation
                  toolCallStartTimes.set(toolName, Date.now())
                } else if (chunk.type === 'tool-result') {
                  const toolName = chunk.payload.toolName || ''
                  const toolResult: unknown = chunk.payload.result
                  console.log(
                    `[Stream] Tool result received: ${toolName}`,
                    typeof toolResult === 'string' ? toolResult.substring(0, 200) : toolResult
                  )

                  // Parse tool result early — needed for SSE events.
                  // `parsed` stays unknown; every access below goes through
                  // the isRecord/typeof narrowing helpers (no casts).
                  let parsed: unknown
                  try {
                    parsed = typeof toolResult === 'string' ? JSON.parse(toolResult) : toolResult
                  } catch {
                    parsed = toolResult
                  }
                  const parsedRecord = isRecord(parsed) ? parsed : undefined

                  // Calculate duration from tool call start
                  const startTime = toolCallStartTimes.get(toolName)
                  if (startTime) {
                    toolCallStartTimes.delete(toolName)
                  }

                  // Send tool_result event with PARSED result for client
                  safeEnqueue(
                    `data: ${JSON.stringify({
                      type: 'tool_result',
                      toolName,
                      result: parsed, // Send parsed result so client can access .phase, .success, etc.
                    })}\n\n`
                  )

                  // Beat-draft verdict gate: when the workflow entry tool
                  // suspends at the editorial verdict, surface it through the
                  // EXISTING questions/awaiting_input frames (published wire
                  // contract — no new frame types). The UI answers via the
                  // existing POST /api/storyteller/workflow/resume.
                  if (
                    toolName === RUN_BEAT_DRAFT_WORKFLOW_TOOL_ID &&
                    parsedRecord &&
                    parsedRecord.status === 'suspended' &&
                    typeof parsedRecord.runId === 'string' &&
                    parsedRecord.runId.length > 0
                  ) {
                    const workflowRunId = parsedRecord.runId
                    const verdictQuestion = {
                      id: `q-editorial-verdict-${Date.now()}`,
                      agentName: 'Storyteller',
                      question:
                        'The draft and critiques are ready. What is your editorial verdict?',
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

                    safeEnqueue(
                      `data: ${JSON.stringify({
                        type: 'questions',
                        questions: [verdictQuestion],
                        workflowStepId: VERDICT_STEP_ID,
                        workflowRunId,
                        traceId,
                      })}\n\n`
                    )
                    safeEnqueue(
                      `data: ${JSON.stringify({
                        type: 'awaiting_input',
                        reason: 'creative_decision',
                        workflowRunId,
                      })}\n\n`
                    )
                  }

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
                      episodeId,
                      isSectionUpdate,
                      currentSection: detectedSection,
                    })

                    // Interactive / notification outcomes are emitted directly (no action)
                    if (outcome.kind === 'questions') {
                      safeEnqueue(
                        `data: ${JSON.stringify({ type: 'questions', questions: outcome.questions })}\n\n`
                      )
                      continue
                    }
                    if (outcome.kind === 'info') {
                      safeEnqueue(
                        `data: ${JSON.stringify({ type: 'info', message: outcome.message, data: outcome.data })}\n\n`
                      )
                      continue
                    }
                    if (outcome.kind === 'navigation') {
                      safeEnqueue(
                        `data: ${JSON.stringify({ type: 'navigation', action: outcome.action, episodeId: outcome.episodeId })}\n\n`
                      )
                      continue
                    }

                    let actionType: string | null = null
                    let actionPayload: Record<string, unknown> = {}
                    let requiresApproval = false

                    if (outcome.kind === 'action') {
                      actionType = outcome.actionType
                      actionPayload = outcome.actionPayload
                      requiresApproval = outcome.requiresApproval
                      detectedSection = outcome.detectedSection
                    }

                    // Collect action to emit AFTER final message (better UX)
                    if (actionType) {
                      // Generate deduplication key to prevent emitting same action multiple times
                      const dedupeKey = getActionDedupeKey(toolName, detectedSection, actionPayload)

                      if (emittedActionKeys.has(dedupeKey)) {
                        console.log(
                          `[Stream] Skipping duplicate action: ${actionType} for section ${detectedSection}`
                        )
                      } else {
                        // Mark this action as emitted
                        emittedActionKeys.add(dedupeKey)

                        // Auto-link entities in action payload fields before storing
                        let linkedPayload = { ...actionPayload }
                        if (projectId) {
                          try {
                            const { entityAutoLinker } =
                              await import('@/domains/storyteller/services/EntityAutoLinkerService')

                            // Auto-link text fields in the payload
                            for (const [key, value] of Object.entries(linkedPayload)) {
                              if (typeof value === 'string' && value.length > 10) {
                                linkedPayload[key] = await entityAutoLinker.autoLink(
                                  value,
                                  projectId
                                )
                              } else if (Array.isArray(value)) {
                                // Handle arrays (e.g., plotTwists)
                                linkedPayload[key] = await Promise.all(
                                  value.map(async (item: unknown) => {
                                    if (typeof item === 'string') {
                                      return await entityAutoLinker.autoLink(item, projectId)
                                    } else if (isRecord(item)) {
                                      // Handle objects with text fields
                                      const linkedItem: Record<string, unknown> = { ...item }
                                      for (const [field, fieldValue] of Object.entries(
                                        linkedItem
                                      )) {
                                        if (
                                          typeof fieldValue === 'string' &&
                                          fieldValue.length > 10
                                        ) {
                                          linkedItem[field] = await entityAutoLinker.autoLink(
                                            fieldValue,
                                            projectId
                                          )
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
                        }

                        // Collect action to emit after final message
                        const actionWithBefore = {
                          type: actionType,
                          payload: {
                            ...linkedPayload,
                            _before: existingBibleData[detectedSection] || null, // For diff viewer
                          },
                          status: requiresApproval ? 'pending' : 'committed',
                          confidence:
                            typeof parsedRecord?.confidence === 'number'
                              ? parsedRecord.confidence
                              : 1.0,
                          reasoning:
                            typeof parsedRecord?.message === 'string'
                              ? parsedRecord.message
                              : `Tool ${toolName} completed successfully`,
                        }

                        pendingActions.push(actionWithBefore)
                        console.log(
                          `[Stream] Collected action for later emission: ${actionType} (approval=${requiresApproval})`
                        )

                        // End section loading when we have a detected section
                        if (detectedSection !== 'full' && toolName === 'update_world_bible') {
                          safeEnqueue(
                            `data: ${JSON.stringify({
                              type: 'section_loading',
                              section: detectedSection,
                              loading: false,
                            })}\n\n`
                          )
                        }
                      }
                    }
                  } catch {
                    // Tool result wasn't JSON or parsing failed - that's ok
                  }
                } else if (chunk.type === 'step-start') {
                  // High fidelity activity tracking. StepStartPayload carries
                  // no step name — the emitted frame has always rendered as
                  // 'Step: Processing' at runtime; kept byte-identical.
                  safeEnqueue(
                    `data: ${JSON.stringify({
                      type: 'agent_status',
                      agent: 'Storyteller',
                      status: 'thinking',
                      message: 'Step: Processing',
                    })}\n\n`
                  )
                }
              } catch (chunkError) {
                // Log but don't crash on individual chunk errors
                console.warn('Stream chunk error:', chunkError)
              }
            }
          } catch (streamIterationError: unknown) {
            // The fullStream iterator threw - extract error details and send to client
            console.error('Stream iteration error:', streamIterationError)
            const errRecord = isRecord(streamIterationError) ? streamIterationError : undefined
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
              errorMessage = getErrorMessage(streamIterationError)
            }

            // Send error event to client
            safeEnqueue(
              `data: ${JSON.stringify({
                type: 'error',
                error: {
                  message: errorMessage,
                  code: errorCode,
                  details:
                    process.env.NODE_ENV === 'development'
                      ? String(streamIterationError)
                      : undefined,
                },
              })}\n\n`
            )

            // Also send as a message so it's visible in chat
            safeEnqueue(
              `data: ${JSON.stringify({
                type: 'message',
                message: {
                  sender: 'System',
                  content: `❌ **Error:** ${errorMessage}`,
                  type: 'error',
                },
              })}\n\n`
            )

            safeEnqueue(`data: ${JSON.stringify({ type: 'complete' })}\n\n`)
            safeClose()
            return
          }

          // Auto-link entity names in generated text before sending
          let finalText = fullText
          if (projectId && fullText.length > 0) {
            try {
              const { entityAutoLinker } =
                await import('@/domains/storyteller/services/EntityAutoLinkerService')
              finalText = await entityAutoLinker.autoLink(fullText, projectId)
            } catch (err) {
              console.warn('[Stream] Entity auto-linking failed:', err)
              // Continue with original text
            }
          }

          // Send final message with auto-linked entities
          safeEnqueue(
            `data: ${JSON.stringify({
              type: 'message',
              message: {
                sender: 'Storyteller',
                content: finalText,
                type: 'ai',
              },
            })}\n\n`
          )

          // NOW emit any collected actions (appears after final message for better UX)
          for (const action of pendingActions) {
            safeEnqueue(
              `data: ${JSON.stringify({
                type: 'action',
                action,
              })}\n\n`
            )
            console.log(`[Stream] Emitted action at end: ${action.type}`)
          }

          // Send complete event
          safeEnqueue(`data: ${JSON.stringify({ type: 'complete' })}\n\n`)

          safeClose()
        } catch (error) {
          console.error('Stream processing error:', error)

          safeEnqueue(
            `data: ${JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : 'Stream failed',
            })}\n\n`
          )
          safeClose()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'x-trace-id': traceId,
      },
    })
  } catch (error) {
    console.error('Streaming error:', error)

    // Record error with categorization
    const errorTraceId = `error-${Date.now()}`
    try {
      recordError(errorTraceId, error instanceof Error ? error : new Error(String(error)), {
        category: 'SYSTEM',
        agentName: 'Storyteller',
        recoverable: false,
      })
    } catch {
      /* ignore */
    }

    return new Response(JSON.stringify({ error: 'Streaming failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
