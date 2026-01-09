/**
 * Loop Creator Chat API
 * 
 * Streaming endpoint for game loop design conversations.
 * Uses Server-Sent Events for real-time updates.
 */

import { NextRequest } from 'next/server'
import { 
  getLoopCreatorGraph, 
  streamLoopCreator, 
  StreamEvent 
} from '@/domains/loop-creator/graph/loop-graph'
import { 
  createInitialLoopState, 
  LoopCreatorState 
} from '@/domains/loop-creator/graph/state'
import { HumanMessage } from '@langchain/core/messages'

export const maxDuration = 120 // 2 minutes max

interface ChatRequest {
  message: string
  projectId: string
  threadId?: string
  context?: {
    gameGenre?: string
    gamePlatform?: string
    targetAudience?: string
    gameDescription?: string
    nodes?: any[]
    edges?: any[]
  }
  modelConfig?: {
    model?: string
    temperature?: number
  }
}

/**
 * Helper to safely encode SSE data
 */
function formatSSE(data: any): string {
  const jsonStr = JSON.stringify(data)
  return `data: ${jsonStr}\n\n`
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json()
    const { message, projectId, threadId, context, modelConfig } = body

    if (!message || !projectId) {
      return new Response(
        JSON.stringify({ error: 'message and projectId are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false

        const safeEnqueue = (data: any) => {
          if (isClosed) return
          try {
            controller.enqueue(new TextEncoder().encode(formatSSE(data)))
          } catch (error) {
            console.error('[LoopAPI] Enqueue error:', error)
            isClosed = true
          }
        }

        const safeClose = () => {
          if (isClosed) return
          isClosed = true
          try {
            controller.close()
          } catch {
            // Already closed
          }
        }

        try {
          // Create initial state or continue from thread
          let initialState: LoopCreatorState

          if (threadId) {
            // Continue existing conversation - add new human message
            const graph = await getLoopCreatorGraph()
            const existingState = await graph.getState({ configurable: { thread_id: threadId } })
            
            if (existingState.values) {
              initialState = {
                ...existingState.values as LoopCreatorState,
                messages: [
                  ...(existingState.values as LoopCreatorState).messages,
                  new HumanMessage(message),
                ],
                pendingQuestions: [], // Clear pending questions
                pendingActions: [], // Clear pending actions
              }
            } else {
              // Thread not found, create new
              initialState = createInitialLoopState(projectId, message, {
                ...context,
                existingNodes: context?.nodes,
                existingEdges: context?.edges,
              })
            }
          } else {
            // New conversation
            initialState = createInitialLoopState(projectId, message, {
              ...context,
              existingNodes: context?.nodes,
              existingEdges: context?.edges,
            })
          }

          // Add model config if provided
          if (modelConfig) {
            initialState.modelConfig = {
              model: modelConfig.model || 'gpt-4o',
              temperature: modelConfig.temperature ?? 0.5,
            }
          }

          // Emit start event
          safeEnqueue({
            type: 'start',
            threadId: threadId || initialState.sessionId,
            timestamp: Date.now(),
          })

          // Stream events from the graph
          const config = {
            configurable: {
              thread_id: threadId || initialState.sessionId,
            },
          }

          const finalState = await streamLoopCreator(
            initialState,
            config,
            (event: StreamEvent) => {
              if (isClosed) return
              safeEnqueue(event)
            }
          )

          // Emit final state summary
          safeEnqueue({
            type: 'state',
            mechanics: finalState.mechanics.length,
            connections: finalState.connections.length,
            loops: finalState.loops.length,
            progressionSystems: finalState.progressionSystems.length,
            balanceScore: finalState.balanceAnalysis?.overallScore,
            phase: finalState.currentPhase,
            timestamp: Date.now(),
          })

          // Emit complete event
          safeEnqueue({
            type: 'complete',
            threadId: threadId || initialState.sessionId,
            timestamp: Date.now(),
          })

        } catch (error) {
          console.error('[LoopAPI] Stream error:', error)
          safeEnqueue({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now(),
          })
        } finally {
          safeClose()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })

  } catch (error) {
    console.error('[LoopAPI] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * GET endpoint for health check
 */
export async function GET() {
  return new Response(
    JSON.stringify({ 
      status: 'ok', 
      service: 'loop-creator',
      timestamp: Date.now(),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}

