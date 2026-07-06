import { createStorytellerAgent, normalizeMastraTraceId } from '@/domains/storyteller'
import { EventEmitter } from 'node:events'
import { BibleSection, assembleStorytellerContext } from '@/domains/storyteller'
import {
  mapToolResultToAction,
  detectLoadingSection,
  getActionDedupeKey,
  type DetectedSection,
} from '@/domains/storyteller'

// Node.js Runtime required for Mastra core dependencies
export const runtime = 'nodejs'

interface StreamChunk {
  type: string
  payload?: any
}

// Import Langfuse observability with enhanced tracing
import {
  langfuse,
  isLangfuseEnabled,
  recordToolCall,
  recordError,
  flushObservability,
} from '@/agent-core/observability'
import { getErrorMessage } from '@/shared/errors/error-utils'

// Use the imported langfuse client if enabled
const langfuseClient = isLangfuseEnabled ? langfuse : null

export async function POST(req: Request) {
  let trace: ReturnType<typeof langfuse.trace> | null = null
  let generation: ReturnType<ReturnType<typeof langfuse.trace>['generation']> | null = null

  try {
    // Security: Require authentication
    const { requireAuth } = await import('@/lib/auth')
    const { verifyProjectAccess, verifyEpisodeAccess } = await import('@/domains/storyteller')

    const { session } = await requireAuth()
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse body parameters
    const {
      message,
      projectId,
      episodeId,
      traceId: bodyTraceId,
      agenticMode,
      currentPhase,
      sessionId: bodySessionId,
      userId,
    } = await req.json()

    // Security: Validate required parameters
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid message parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
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

    // Generate sessionId for Langfuse session tracking
    // Sessions group multiple traces together for multi-turn conversations
    // @see https://langfuse.com/docs/observability/features/sessions
    // Security: Use session user ID instead of client-provided userId
    const sessionId =
      bodySessionId || `session-${projectId || 'unknown'}-${episodeId || Date.now()}`
    const safeUserId = session.user.id // Always use authenticated user ID

    // Create trace with session context
    if (langfuseClient) {
      try {
        trace = langfuseClient.trace({
          name: 'storyteller-chat',
          id: traceId,
          sessionId, // Links this trace to the session for grouped view in Langfuse
          userId: safeUserId, // Use authenticated user ID
          metadata: {
            projectId,
            episodeId,
            agenticMode,
            source: 'web-ui',
            userEmail: session.user.email, // Track user email for audit
          },
          tags: ['storyteller', 'chat', projectId ? `project:${projectId}` : 'no-project'].filter(
            Boolean
          ),
        })
        console.log(`[Langfuse] Created trace ${traceId} in session ${sessionId}`)
      } catch (e) {
        console.warn('Failed to create Langfuse trace:', e)
      }
    }

    // 1. Fetch + format FULL context (project, bible, story plan, characters, beats, RAG)
    const { contextPrompt, existingBibleData } = await assembleStorytellerContext({
      projectId,
      episodeId,
      message,
      currentPhase,
      userId: session.user.id,
      onError: err => {
        try {
          trace?.update({ metadata: { contextError: String(err) } })
        } catch {
          /* ignore */
        }
      },
    })

    const agent = await createStorytellerAgent()

    // No pattern matching - LLM decides what to update via tool calls.
    // Section is extracted from the tool result, not pre-detected.
    let detectedSection: DetectedSection = BibleSection.FULL
    const isSectionUpdate = false // Will be determined by tool call
    const sectionPrompt = '' // No forced section mode

    // Prepend context and AGENTIC INSTRUCTION
    let agenticInstruction = ''

    if (agenticMode) {
      agenticInstruction = `
### GENIUS MODE ENABLED (IQ 200)
You are a Genius Orchestrator. You combine the ruthless realism of George R. R. Martin with the "out of the box" narrative complexity of Vince Gilligan.

1. DO NOT provide a direct response. ALWAYS delegate to the Council of Agents.
2. Demand "out of the box" solutions and IQ 200 creative depth from your Council.
3. If the request is for lore or world-building, the Council is still required for multi-layered thinking.
4. Passage user's request as the 'goal' to the tool.
`
    }

    const promptWithContext = contextPrompt
      ? `${contextPrompt}\n${sectionPrompt}\n${agenticInstruction}\nUSER REQUEST:\n${message}\n\nRemember: Use projectId="${projectId}" for all tool calls that require it.`
      : `${sectionPrompt}\n${agenticInstruction}\n${message}`

    // Create a generation span for the LLM call (safe - won't throw)
    // The generation object is used to create child spans for tool calls
    let generationId: string | undefined
    try {
      if (trace) {
        generation = trace.generation({
          name: 'storyteller-agent-stream',
          input: promptWithContext || '(no prompt provided)', // Ensure never undefined
          model: 'gpt-4o',
          metadata: {
            projectId: projectId || '(no project)',
            episodeId: episodeId || '(no episode)',
          },
        })
        // Capture generation ID for child span linkage
        // Langfuse SDK stores the ID in the 'id' property
        generationId = (generation as any)?.id || (generation as any)?.observationId
        console.log(`[Langfuse] Created generation with ID: ${generationId}`)
      }
    } catch (e) {
      console.warn('Failed to create Langfuse generation:', e)
    }

    // Create EventBus for Workflow Visibility
    // EventEmitter imported at top level to avoid edge runtime issues
    const { workflowContext, WORKFLOW_EVENTS } =
      await import('@/domains/storyteller')
    const eventBus = new EventEmitter()
    const activeSpans = new Map<string, ReturnType<NonNullable<typeof trace>['span']>>() // Track spans by step name

    // Bridge Workflow Events to LangFuse & Logging
    eventBus.on(WORKFLOW_EVENTS.STEP_START, ({ step, agent }) => {
      // 1. LangFuse Span
      try {
        if (trace) {
          const span = trace.span({
            name: `workflow-step: ${step}`,
            metadata: { agent, projectId },
            input: { step },
          })
          activeSpans.set(step, span)
        }
      } catch { } // Safe
    })

    eventBus.on(WORKFLOW_EVENTS.STEP_COMPLETE, ({ step, output }) => {
      // 1. Close LangFuse Span
      try {
        const span = activeSpans.get(step)
        if (span) {
          // Ensure output is never undefined for Langfuse
          const safeOutput = output
            ? typeof output === 'string'
              ? output
              : JSON.stringify(output)
            : '(no output)'
          span.end({ output: safeOutput })
          activeSpans.delete(step)
        }
      } catch { } // Safe
    })

    // Log generation request detection (detection logic moved up before prompt construction)
    // Prepare context wrapper with memory for multi-turn conversations
    // See: https://mastra.ai/docs/agents/agent-memory
    const streamOptions: Record<string, unknown> = {
      // Use 'auto' for tool choice - 'required' causes infinite loops
      // The agent prompt already instructs to use tools for generation
      toolChoice: 'auto',
      // Allow up to 10 steps for complex multi-tool workflows
      maxSteps: 10,
      telemetry: {
        isEnabled: true,
        traceId,
        metadata: {
          projectId,
          episodeId,
        },
      },
      // Memory context for conversation persistence
      // resource: stable user/project identifier
      // thread: specific conversation session (per episode or project)
      memory: {
        resource: projectId || 'anonymous',
        thread: episodeId || `project-${projectId}` || 'general',
      },
    }

    // existingBibleData (for diff "before" state) comes from assembleStorytellerContext above.

    const result = await workflowContext.run({ traceId, sessionId, userId, eventBus }, async () => {
      return agent.stream(promptWithContext, streamOptions)
    })

    // Create SSE stream that useChatStream can parse
    const encoder = new TextEncoder()
    let fullText = ''
    let toolCallSummary: string[] = [] // Track tool calls for Langfuse output
    const toolCallStartTimes = new Map<string, number>() // Track tool call durations for Langfuse

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
          } catch (e) {
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
          } catch (e) {
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

        // Bridge Workflow Events to SSE Stream
        const onStepStart = ({ step, agent }: { step: string; agent?: string }) => {
          safeEnqueue(
            `data: ${JSON.stringify({
              type: 'agent_status',
              agent: agent || 'Storyteller',
              status: 'working',
              message: `${step}...`,
              startTime: Date.now(),
            })}\n\n`
          )
        }

        const onStepComplete = ({ step, output }: { step: string; output?: unknown }) => {
          // Optional: Emit intermediate "thinking" or "result" blocks if desired
          if (output && typeof output === 'string') {
            safeEnqueue(
              `data: ${JSON.stringify({
                type: 'thinking',
                thinking: `[${step} Output]:\n${output.substring(0, 150)}...`,
                agent: 'Storyteller',
              })}\n\n`
            )
          }
        }

        // Handle agent thinking events from specialized agents (Psychologist, Gardener, etc.)
        const onAgentThought = ({ agent, thinking }: { agent: string; thinking: string }) => {
          if (thinking) {
            safeEnqueue(
              `data: ${JSON.stringify({
                type: 'thinking',
                thinking,
                agent,
                timestamp: Date.now(),
              })}\n\n`
            )
          }
        }

        // Handle human-in-the-loop questions from workflow
        const onQuestionAsked = (data: {
          stepId: string
          questionType: string
          question: string
          options: Array<{
            id: string
            label: string
            description?: string
            consequence?: string
            recommended?: boolean
          }>
          traceId?: string
          runId?: string
        }) => {
          // Convert to AgentQuestion format expected by the UI
          const agentQuestion = {
            id: `q-${data.stepId}-${Date.now()}`,
            agentName: 'Writers Room',
            question: data.question,
            questionType: 'single_choice' as const,
            options: data.options,
            context: 'The workflow needs your creative input to proceed.',
            urgency: 'blocking' as const,
            defaultOption: data.options.find(o => o.recommended)?.id,
            timeout: 120, // 2 minutes to decide
          }

          safeEnqueue(
            `data: ${JSON.stringify({
              type: 'questions',
              questions: [agentQuestion],
              workflowStepId: data.stepId,
              workflowRunId: data.runId, // Include runId for resume API
              traceId: data.traceId,
            })}\n\n`
          )

          // Also send awaiting_input to pause the thinking indicator
          safeEnqueue(
            `data: ${JSON.stringify({
              type: 'awaiting_input',
              reason: 'creative_decision',
              workflowRunId: data.runId,
            })}\n\n`
          )
        }

        // Handle workflow suspended event (includes runId)
        const onWorkflowSuspended = (data: {
          runId: string
          stepId: string
          projectId: string
        }) => {
          console.log(`[Stream] Workflow suspended: ${data.runId} at step ${data.stepId}`)
        }

        eventBus.on(WORKFLOW_EVENTS.STEP_START, onStepStart)
        eventBus.on(WORKFLOW_EVENTS.STEP_COMPLETE, onStepComplete)
        eventBus.on(WORKFLOW_EVENTS.AGENT_THOUGHT, onAgentThought)
        eventBus.on(WORKFLOW_EVENTS.QUESTION_ASKED, onQuestionAsked)
        eventBus.on(WORKFLOW_EVENTS.WORKFLOW_SUSPENDED, onWorkflowSuspended)

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
              const part = chunk as StreamChunk
              try {
                const { type, payload } = part || {}
                if (!type) continue

                // Handle stream errors (e.g. OpenAI quota exceeded)
                if (type === 'error') {
                  const errorDetails = payload?.error || payload
                  const errorMessage = errorDetails?.message || 'Unknown stream error'
                  const errorCode = errorDetails?.code || 'STREAM_ERROR'

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

                // Mastra VNext (v0.24+) chunk types
                if (type === 'text-delta') {
                  const text = payload?.text || payload?.textDelta || ''
                  if (text) {
                    fullText += text
                    safeEnqueue(`data: ${JSON.stringify({ type: 'token', token: text })}\n\n`)
                  }
                } else if (type === 'reasoning' || type === 'thinking') {
                  // Extended thinking / chain-of-thought from the model
                  const thinking = payload?.text || payload?.thinking || payload?.reasoning || ''
                  if (thinking) {
                    safeEnqueue(
                      `data: ${JSON.stringify({
                        type: 'thinking',
                        thinking,
                        agent: 'Storyteller',
                      })}\n\n`
                    )
                  }
                } else if (type === 'tool-call') {
                  const toolName = payload?.toolName || 'tool'
                  const toolArgs = payload?.args || {}

                  console.log(`[Stream] Tool call: ${toolName}, args keys:`, Object.keys(toolArgs))

                  // Track tool call for Langfuse output
                  toolCallSummary.push(`Tool: ${toolName}`)

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
                } else if (type === 'tool-result') {
                  const toolName = payload?.toolName || ''
                  const toolResult = payload?.result
                  console.log(
                    `[Stream] Tool result received: ${toolName}`,
                    typeof toolResult === 'string' ? toolResult.substring(0, 200) : toolResult
                  )

                  // Parse tool result early - needed for both Langfuse and SSE events
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamically parsed JSON from tool results
                  let parsed: any
                  try {
                    parsed = typeof toolResult === 'string' ? JSON.parse(toolResult) : toolResult
                  } catch {
                    parsed = toolResult
                  }

                  // Record tool call in Langfuse for observability (nested under generation)
                  try {
                    // Calculate duration from tool call start
                    const startTime = toolCallStartTimes.get(toolName)
                    const durationMs = startTime ? Date.now() - startTime : undefined
                    toolCallStartTimes.delete(toolName) // Clean up

                    recordToolCall({
                      traceId,
                      parentObservationId: generationId, // Link to parent generation
                      toolName,
                      args: payload?.args || {},
                      result: parsed,
                      error:
                        parsed?.error ||
                        (parsed?.message?.includes?.('Error') ? parsed.message : undefined),
                      durationMs,
                    })
                  } catch {
                    /* ignore tracing errors */
                  }

                  // Track tool result for Langfuse output
                  const resultSummary =
                    typeof toolResult === 'string'
                      ? toolResult.substring(0, 200)
                      : JSON.stringify(toolResult).substring(0, 200)
                  toolCallSummary.push(`Result (${toolName}): ${resultSummary}...`)

                  // Send tool_result event with PARSED result for client
                  safeEnqueue(
                    `data: ${JSON.stringify({
                      type: 'tool_result',
                      toolName,
                      result: parsed, // Send parsed result so client can access .phase, .success, etc.
                    })}\n\n`
                  )

                  // Continue with action event mapping
                  try {
                    // Safe logging of tool result status
                    if (typeof parsed === 'object' && parsed !== null) {
                      console.log(
                        `[Stream] Parsed tool result success=${parsed.success}, keys:`,
                        Object.keys(parsed)
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
                              await import('@/domains/storyteller')

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
                                  value.map(async (item: any) => {
                                    if (typeof item === 'string') {
                                      return await entityAutoLinker.autoLink(item, projectId)
                                    } else if (item && typeof item === 'object') {
                                      // Handle objects with text fields
                                      const linkedItem = { ...item }
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
                          confidence: parsed?.confidence || 1.0,
                          reasoning: parsed?.message || `Tool ${toolName} completed successfully`,
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
                } else if (type === 'step-start') {
                  // High fidelity activity tracking
                  safeEnqueue(
                    `data: ${JSON.stringify({
                      type: 'agent_status',
                      agent: 'Storyteller',
                      status: 'thinking',
                      message: `Step: ${payload?.stepName || 'Processing'}`,
                      details: Array.isArray(payload?.tools) ? payload.tools.join(', ') : undefined,
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
            const err = streamIterationError as any

            // Extract user-friendly error message
            let errorMessage = 'An error occurred while processing your request.'
            let errorCode = 'STREAM_ERROR'

            if (err?.error?.code === 'insufficient_quota') {
              errorMessage =
                '⚠️ OpenAI API quota exceeded. Please check your billing details or try again later.'
              errorCode = 'QUOTA_EXCEEDED'
            } else if (err?.error?.message) {
              errorMessage = err.error.message
              errorCode = err.error.code || 'API_ERROR'
            } else if (err?.message) {
              errorMessage = getErrorMessage(err)
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
                await import('@/domains/storyteller')
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

          // End Langfuse generation and trace (safe - won't throw)
          try {
            // Build comprehensive output including text and tool calls - ensure no undefined values
            // Use finalText (with auto-linked entities) for accurate tracing
            const langfuseOutput = {
              text: finalText || '(no text output)',
              toolCalls: toolCallSummary.length > 0 ? toolCallSummary : ['(no tool calls)'],
              summary: finalText
                ? finalText.slice(0, 500)
                : toolCallSummary.length > 0
                  ? toolCallSummary.slice(0, 3).join(' | ')
                  : '(empty response)',
              entitiesLinked: finalText !== fullText, // Track if auto-linking was applied
            }
            generation?.end({ output: langfuseOutput })
            trace?.update({
              output: langfuseOutput,
              input: promptWithContext || '(no input)', // Ensure trace input is also set
            })
            if (langfuseClient) {
              try {
                await langfuseClient.flush()
              } catch { }
            }
          } catch {
            /* ignore langfuse errors */
          }

          safeClose()
        } catch (error) {
          console.error('Stream processing error:', error)

          // Log error to Langfuse (safe - won't throw)
          try {
            generation?.end({
              output: error instanceof Error ? error.message : 'Stream failed',
              level: 'ERROR',
              statusMessage: error instanceof Error ? error.message : 'Unknown error',
            })
            if (langfuseClient) {
              try {
                await langfuseClient.flush()
              } catch { }
            }
          } catch {
            /* ignore */
          }

          safeEnqueue(
            `data: ${JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : 'Stream failed',
            })}\n\n`
          )
          safeClose()
        } finally {
          // Cleanup listeners
          eventBus.off(WORKFLOW_EVENTS.STEP_START, onStepStart)
          eventBus.off(WORKFLOW_EVENTS.STEP_COMPLETE, onStepComplete)
          eventBus.off(WORKFLOW_EVENTS.AGENT_THOUGHT, onAgentThought)
          eventBus.off(WORKFLOW_EVENTS.QUESTION_ASKED, onQuestionAsked)
          eventBus.off(WORKFLOW_EVENTS.WORKFLOW_SUSPENDED, onWorkflowSuspended)
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
      await flushObservability()
    } catch {
      /* ignore */
    }

    return new Response(JSON.stringify({ error: 'Streaming failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
