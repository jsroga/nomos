import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { writersRoomGraph } from '@/domains/storyteller/graph/writers-room'
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

export const runtime = 'nodejs'
export const maxDuration = 120 // 120 second timeout for longer discussions

// Log LangSmith status on first load
const langsmithConfig = checkLangSmithConfig()
if (!langsmithConfig.enabled) {
  console.warn('LangSmith NOT configured:', langsmithConfig.issues.join(', '))
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { message, projectId, threadId, seriesBible, characters, episodeId, currentPhase, modelConfig } = body
    
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

        try {
          // Send initial event
          safeEnqueue(
            `data: ${JSON.stringify({ type: 'start', message: 'Writers room is assembling...' })}\n\n`
          )

          // Create initial state - use phase from request or default to premise
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
            characters: characters || [],
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
            },
          }

          // Log state for debugging
          console.log('Starting graph stream with phase:', initialState.currentPhase)
          console.log(
            'LangSmith tracing:',
            process.env.LANGCHAIN_TRACING_V2 ? 'ENABLED' : 'DISABLED'
          )

          // Stream the graph execution
          const streamResult = await writersRoomGraph.stream(initialState, config)
          let messageCount = 0
          let actionCount = 0
          const maxMessages = 30 // Safety limit

          for await (const chunk of streamResult) {
            if (isClosed || messageCount >= maxMessages) {
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
                      action.payload?.logline?.slice(0, 50) || ''
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
                  break
                }
                if (output.awaitingUserInput) {
                  console.log('Awaiting user input')
                  safeEnqueue(
                    `data: ${JSON.stringify({ type: 'awaiting_input', reason: 'question' })}\n\n`
                  )
                  break
                }
              }
            }
          }

          // Send completion event
          safeEnqueue(`data: ${JSON.stringify({ type: 'done', messageCount })}\n\n`)
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
