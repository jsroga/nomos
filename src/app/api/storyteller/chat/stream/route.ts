import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { getWritersRoomGraph, writersRoomGraph } from '@/domains/storyteller/graph/writers-room'
import {
  actionExecutor,
  isSafeAction,
  formatActionForDisplay,
} from '@/domains/storyteller/actions/executor'
import { AgentAction, AgentQuestion } from '@/domains/storyteller/actions/types'
import { checkLangSmithConfig } from '@/lib/langsmith'
import { db } from '@/lib/db'
import { beats } from '@/domains/storyteller/db/schema'
import { eq, asc } from 'drizzle-orm'
import { runWithModelConfig, ModelConfig } from '@/domains/storyteller/config/model-context'
import { StreamCallback, StreamProgress } from '@/domains/storyteller/guardrails/types'

export const runtime = 'nodejs'
export const maxDuration = 120 // 120 second timeout for longer discussions

// Streaming mode: 'events' for token-level, 'nodes' for node-level only
type StreamMode = 'events' | 'nodes'

// Log LangSmith status on first load
const langsmithConfig = checkLangSmithConfig()
if (!langsmithConfig.enabled) {
  console.warn('LangSmith NOT configured:', langsmithConfig.issues.join(', '))
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      message,
      projectId,
      threadId,
      seriesBible,
      characters,
      episodeId,
      currentPhase,
      modelConfig,
      streamMode: requestedStreamMode,
      progressiveGeneration, // Enable progressive section-by-section bible generation
    } = body

    // Determine streaming mode - 'events' enables token-level streaming
    const streamMode: StreamMode = requestedStreamMode === 'events' ? 'events' : 'nodes'

    // Model config from frontend (Settings UI)
    const effectiveModelConfig: ModelConfig = {
      provider: modelConfig?.provider || 'openai',
      anthropicApiKey: modelConfig?.anthropicApiKey,
    }

    if (effectiveModelConfig.provider === 'anthropic') {
      console.log('Using Anthropic (Claude) for this request')
    }

    // Fetch existing beats for the episode
    let existingBeats: any[] = []
    if (episodeId) {
      try {
        const dbBeats = await db
          .select()
          .from(beats)
          .where(eq(beats.episodeId, episodeId))
          .orderBy(asc(beats.sequence))
        existingBeats = dbBeats.map(b => ({
          id: b.id,
          episodeId: b.episodeId,
          sequence: b.sequence,
          logline: b.logline,
          beatType: b.beatType,
          status: b.status,
          charactersInvolved: b.charactersInvolved || [],
          emotionalShifts: b.emotionalShifts || {},
        }))
        console.log(`Loaded ${existingBeats.length} existing beats for episode ${episodeId}`)
      } catch (err) {
        console.error('Failed to fetch existing beats:', err)
      }
    }

    const encoder = new TextEncoder()
    let isClosed = false

    // Wrap stream creation in model config context so agents use the correct provider
    const stream = runWithModelConfig(effectiveModelConfig, () => new ReadableStream({
      async start(controller) {
        const safeEnqueue = (data: string) => {
          if (!isClosed) {
            try {
              controller.enqueue(encoder.encode(data))
            } catch (e) {
              console.warn('Failed to enqueue, stream may be closed')
            }
          }
        }

        const safeClose = () => {
          if (!isClosed) {
            isClosed = true
            try {
              controller.close()
            } catch (e) {
              console.warn('Failed to close, stream may already be closed')
            }
          }
        }

        // Create stream callback for token-level streaming (passed to agents via state)
        const streamCallback: StreamCallback = (progress: StreamProgress) => {
          if (isClosed) return

          // Emit different event types based on progress type
          switch (progress.type) {
            case 'token':
              safeEnqueue(
                `data: ${JSON.stringify({
                  type: 'token',
                  token: progress.token,
                  agent: progress.agent,
                  progress: progress.progress,
                })}\n\n`
              )
              break
            case 'section_start':
              safeEnqueue(
                `data: ${JSON.stringify({
                  type: 'section_start',
                  section: progress.section,
                  agent: progress.agent,
                })}\n\n`
              )
              break
            case 'section_complete':
              safeEnqueue(
                `data: ${JSON.stringify({
                  type: 'section_complete',
                  section: progress.section,
                  agent: progress.agent,
                  preview: typeof progress.content === 'string'
                    ? progress.content.substring(0, 200)
                    : undefined,
                })}\n\n`
              )
              break
            case 'thinking':
              safeEnqueue(
                `data: ${JSON.stringify({
                  type: 'thinking',
                  content: progress.content,
                  agent: progress.agent,
                })}\n\n`
              )
              break
          }
        }

        try {
          // Send initial event
          safeEnqueue(
            `data: ${JSON.stringify({
              type: 'start',
              message: 'Writers room is assembling...',
              streamMode,
            })}\n\n`
          )

          // Create initial state - use phase from request or default to premise
          // Include stream callback for token-level streaming
          const initialState = {
            projectId: projectId || 'default',
            episodeId: episodeId,
            currentPhase: (currentPhase || 'premise') as
              | 'premise'
              | 'breaking'
              | 'cardlock'
              | 'writing'
              | 'complete',
            seriesBible: seriesBible || {},
            // Extract master prompt from bible (frontend convention) or top level
            masterPrompt: seriesBible?.masterPrompt || body.masterPrompt,
            episodePrompt: body.episodePrompt,
            characters: characters || [],
            activeCast: body.activeCast || [],
            beatBoard: existingBeats, // Use existing beats from database
            unresolvedSetups: [],
            rejectedBeats: [],
            currentIteration: 0,
            phaseIterations: 0,
            maxIterationsPerPhase: 15, // Allow full agent discussions
            shouldTerminate: false,
            awaitingUserInput: false,
            messages: [
              new HumanMessage({
                content: message,
                name: 'User',
              }),
            ],
            // Pass stream callback for token-level streaming
            ...(streamMode === 'events' ? { _streamCallback: streamCallback } : {}),
            // Pass progressive generation flag
            ...(progressiveGeneration ? { _useProgressiveGeneration: true } : {}),
          }

          const config = {
            configurable: {
              thread_id: threadId || `thread-${Date.now()}`,
            },
            recursionLimit: 50, // Allow full agent chains
            // LangSmith tracing configuration
            runName: `WritersRoom-${currentPhase}-${Date.now()}`,
            tags: ['storyteller', currentPhase || 'unknown'],
            metadata: {
              projectId,
              episodeId,
              phase: currentPhase,
              streamMode,
            },
          }

          // Log state for debugging
          console.log('Starting graph stream with phase:', initialState.currentPhase, 'mode:', streamMode)
          console.log(
            'LangSmith tracing:',
            process.env.LANGCHAIN_TRACING_V2 ? 'ENABLED' : 'DISABLED'
          )

          // Get compiled graph (compile() is async in LangGraph 1.x)
          const graph = await getWritersRoomGraph()

          // Stream the graph execution using streamEvents for enhanced streaming
          if (streamMode === 'events') {
            // Use streamEvents for token-level streaming
            await streamWithEvents(graph, initialState, config, safeEnqueue, () => isClosed)
          } else {
            // Use standard stream for node-level streaming
            await streamWithNodes(graph, initialState, config, safeEnqueue, () => isClosed)
          }

          // Send completion event
          safeEnqueue(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
          safeClose()
        } catch (error) {
          console.error('Streaming error:', error)
          safeEnqueue(
            `data: ${JSON.stringify({
              type: 'error',
              message: error instanceof Error ? error.message : 'Unknown error',
            })}\n\n`
          )
          safeClose()
        }
      },
      cancel() {
        isClosed = true
      },
    }))

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Stream setup error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to setup stream' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// ============================================
// STREAMING HELPERS
// ============================================

/**
 * Stream using node-level events (original behavior)
 */
async function streamWithNodes(
  graph: typeof writersRoomGraph,
  initialState: any,
  config: any,
  safeEnqueue: (data: string) => void,
  isClosed: () => boolean
) {
  let messageCount = 0
  let actionCount = 0
  const maxMessages = 30 // Safety limit

  // LangGraph 1.x: stream() returns a Promise, needs await and streamMode
  for await (const chunk of await graph.stream(initialState, { ...config, streamMode: 'updates' })) {
    if (isClosed() || messageCount >= maxMessages) {
      console.log(
        `Stream limit reached (messages: ${messageCount}, actions: ${actionCount})`
      )
      break
    }

    for (const [nodeName, nodeOutput] of Object.entries(chunk)) {
      if (nodeOutput && typeof nodeOutput === 'object' && 'messages' in nodeOutput) {
        const messages = (nodeOutput as any).messages || []

        for (const msg of messages) {
          messageCount++

          // Extract structured data from message
          const actions: AgentAction[] = (msg as any).actions || []
          const rawQuestions: AgentQuestion[] = (msg as any).questions || []

          // Filter out invalid/generic questions
          const questions = rawQuestions.filter(
            q =>
              q &&
              q.question &&
              q.question.trim().length > 10 &&
              !q.question.toLowerCase().includes('what would you like to do') &&
              q.options &&
              q.options.length > 0
          )

          const confidence: number | undefined = (msg as any).confidence
          const thinking: string | undefined = (msg as any).thinking

          // Format message for UI
          const formattedMsg = {
            type: msg._getType() === 'human' ? 'human' : 'ai',
            content:
              typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
            name: msg.name || nodeName,
            sender: msg.name || nodeName,
            actions,
            questions,
            confidence,
            thinking,
          }

          // Send the message
          safeEnqueue(
            `data: ${JSON.stringify({
              type: 'message',
              message: formattedMsg,
              node: nodeName,
            })}\n\n`
          )

          // Send actions separately for tracking
          for (const action of actions) {
            actionCount++
            console.log(
              `ACTION from ${msg.name || nodeName}:`,
              action.type,
              (action.payload as any)?.logline?.slice(0, 50) || ''
            )
            const display = formatActionForDisplay(action)
            safeEnqueue(
              `data: ${JSON.stringify({
                type: 'action',
                action,
                display,
                agent: msg.name || nodeName,
                isSafe: isSafeAction(action),
              })}\n\n`
            )
          }

          // Send questions for UI rendering
          if (questions.length > 0) {
            safeEnqueue(
              `data: ${JSON.stringify({
                type: 'questions',
                questions,
                agent: msg.name || nodeName,
              })}\n\n`
            )
          }
        }
      }

      // Check for termination signals
      if (nodeOutput && typeof nodeOutput === 'object') {
        const output = nodeOutput as any
        if (output.shouldTerminate) {
          console.log('Termination signal received')
          safeEnqueue(
            `data: ${JSON.stringify({ type: 'terminated', reason: 'shouldTerminate' })}\n\n`
          )
          return
        }
        if (output.awaitingUserInput) {
          console.log('Awaiting user input')
          safeEnqueue(
            `data: ${JSON.stringify({ type: 'awaiting_input', reason: 'question' })}\n\n`
          )
          return
        }
      }
    }
  }
}

/**
 * Stream using LangGraph streamEvents for token-level streaming
 */
async function streamWithEvents(
  graph: typeof writersRoomGraph,
  initialState: any,
  config: any,
  safeEnqueue: (data: string) => void,
  isClosed: () => boolean
) {
  let messageCount = 0
  let actionCount = 0
  const maxMessages = 30
  const seenNodes = new Set<string>()

  // Accumulate content per node for complete messages
  const nodeContent: Record<string, string> = {}

  try {
    // Use streamEvents for enhanced streaming (token-level events from LLMs)
    // LangGraph 1.x: streamEvents() returns a Promise
    for await (const event of await graph.streamEvents(initialState, {
      ...config,
      version: 'v2',
    })) {
      if (isClosed() || messageCount >= maxMessages) {
        console.log(`Stream limit reached (messages: ${messageCount})`)
        break
      }

      const eventType = event.event
      const eventData = event.data

      // Handle different event types
      switch (eventType) {
        case 'on_chat_model_stream': {
          // Token-level streaming from LLM
          const chunk = eventData?.chunk
          if (chunk?.content) {
            const token = typeof chunk.content === 'string' ? chunk.content : ''
            if (token) {
              safeEnqueue(
                `data: ${JSON.stringify({
                  type: 'token',
                  token,
                  node: event.name || 'unknown',
                })}\n\n`
              )
            }
          }
          break
        }

        case 'on_chain_start': {
          // Node started
          const nodeName = event.name
          if (nodeName && !seenNodes.has(nodeName)) {
            seenNodes.add(nodeName)
            safeEnqueue(
              `data: ${JSON.stringify({
                type: 'node_start',
                node: nodeName,
              })}\n\n`
            )
          }
          break
        }

        case 'on_chain_end': {
          // Node completed - extract output
          const nodeName = event.name
          const output = eventData?.output

          // Strict filtering: Only stream events from actual Graph Nodes to prevent duplication
          // from internal runnables like RunnableGuards or RunnableLambdas
          const VALID_NODES = new Set([
            'supervisor',
            'planner',
            'plotArchitect',
            'characterPsychology',
            'consequenceTracker',
            'devilsAdvocate',
            'writer',
            'scriptEditor',
            'premiseArchitect',
            'episodePremiseArchitect',
            'magicAgent',
            'utility_tools',
            'writer_tools'
          ])

          if (nodeName && VALID_NODES.has(nodeName) && output && typeof output === 'object') {
            // Check for messages in output
            if ('messages' in output) {
              const messages = output.messages || []
              for (const msg of messages) {
                messageCount++

                // Extract structured data from message
                const actions: AgentAction[] = (msg as any).actions || []
                const rawQuestions: AgentQuestion[] = (msg as any).questions || []

                // Filter out invalid/generic questions
                const questions = rawQuestions.filter(
                  (q: any) =>
                    q &&
                    q.question &&
                    q.question.trim().length > 10 &&
                    !q.question.toLowerCase().includes('what would you like to do') &&
                    q.options &&
                    q.options.length > 0
                )

                const confidence: number | undefined = (msg as any).confidence
                const thinking: string | undefined = (msg as any).thinking

                // Format message for UI
                const formattedMsg = {
                  type: msg._getType?.() === 'human' ? 'human' : 'ai',
                  content:
                    typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
                  name: (msg as any).name || nodeName,
                  sender: (msg as any).name || nodeName,
                  actions,
                  questions,
                  confidence,
                  thinking,
                }

                // Send the message
                safeEnqueue(
                  `data: ${JSON.stringify({
                    type: 'message',
                    message: formattedMsg,
                    node: nodeName,
                  })}\n\n`
                )

                // Send actions separately for tracking
                for (const action of actions) {
                  actionCount++
                  const display = formatActionForDisplay(action)
                  safeEnqueue(
                    `data: ${JSON.stringify({
                      type: 'action',
                      action,
                      display,
                      agent: (msg as any).name || nodeName,
                      isSafe: isSafeAction(action),
                    })}\n\n`
                  )
                }

                // Send questions for UI rendering
                if (questions.length > 0) {
                  safeEnqueue(
                    `data: ${JSON.stringify({
                      type: 'questions',
                      questions,
                      agent: (msg as any).name || nodeName,
                    })}\n\n`
                  )
                }
              }
            }

            // Check for termination signals
            if (output.shouldTerminate) {
              console.log('Termination signal received')
              safeEnqueue(
                `data: ${JSON.stringify({ type: 'terminated', reason: 'shouldTerminate' })}\n\n`
              )
              return
            }
            if (output.awaitingUserInput) {
              console.log('Awaiting user input')
              safeEnqueue(
                `data: ${JSON.stringify({ type: 'awaiting_input', reason: 'question' })}\n\n`
              )
              return
            }
          }

          // Send node complete event
          safeEnqueue(
            `data: ${JSON.stringify({
              type: 'node_complete',
              node: nodeName,
            })}\n\n`
          )
          break
        }

        case 'on_tool_start': {
          // Tool/Agent starting
          safeEnqueue(
            `data: ${JSON.stringify({
              type: 'tool_start',
              tool: event.name,
            })}\n\n`
          )
          break
        }

        case 'on_tool_end': {
          // Tool/Agent completed
          safeEnqueue(
            `data: ${JSON.stringify({
              type: 'tool_end',
              tool: event.name,
            })}\n\n`
          )
          break
        }
      }
    }
  } catch (error) {
    console.error('Error in streamEvents:', error)
    // Fall back to regular stream if streamEvents fails
    console.log('Falling back to node-level streaming')
    await streamWithNodes(graph, initialState, config, safeEnqueue, isClosed)
  }
}
