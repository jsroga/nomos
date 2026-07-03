/**
 * Loop Creator Chat API
 *
 * Streaming endpoint for game loop design conversations.
 * Uses Server-Sent Events for real-time updates.
 * Runs on Mastra framework (same pattern as Storyteller).
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { verifyProjectAccess } from '@/domains/storyteller'
import { streamLoopCreator } from '@/domains/loop-creator/graph/loop-graph'
import { LoopCreatorState } from '@/domains/loop-creator/graph/state'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { langfuse, isLangfuseEnabled } from '@/agent-core/observability'

export const maxDuration = 120
export const runtime = 'nodejs'

interface CanvasNode {
  id: string
  type?: string
  label?: string
  data?: { label?: string; nodeType?: string; description?: string }
  description?: string
  position?: { x: number; y: number }
}

interface CanvasEdge {
  id: string
  source: string
  target: string
  label?: string
}

interface ChatRequest {
  message: string
  projectId: string
  threadId?: string
  sessionId?: string // Langfuse session ID for grouped traces
  userId?: string // User ID for tracking
  /** Recent conversation so the agent has context (avoids stateless replies) */
  recentMessages?: { role: 'user' | 'assistant'; content: string }[]
  context?: {
    gameGenre?: string
    gamePlatform?: string
    targetAudience?: string
    gameDescription?: string
    nodes?: CanvasNode[]
    edges?: CanvasEdge[]
  }
  modelConfig?: {
    model?: string
    temperature?: number
  }
}

// StreamEvent interface for UI compatibility
interface StreamEvent {
  type:
  | 'node'
  | 'message'
  | 'action'
  | 'questions'
  | 'token'
  | 'error'
  | 'start'
  | 'state'
  | 'complete'
  node?: string
  agent?: string
  content?: string
  message?: {
    type: string
    content: string
    sender: string
    name: string
  }
  action?: {
    type: string
    payload: unknown
    confidence?: number
    reasoning?: string
  }
  questions?: unknown[]
  error?: string
  timestamp: number
  threadId?: string
  mechanics?: number
  connections?: number
  loops?: number
  progressionSystems?: number
  balanceScore?: number
  phase?: string
}

function formatSSE(data: StreamEvent): string {
  const jsonStr = JSON.stringify(data)
  return `data: ${jsonStr}\n\n`
}


export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body: ChatRequest = await req.json()
    const {
      message,
      projectId,
      threadId,
      context,
      recentMessages,
      modelConfig,
      sessionId: bodySessionId,
      userId,
    } = body

    if (!message || !projectId) {
      return new Response(JSON.stringify({ error: 'message and projectId are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Verify project access
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return new Response(JSON.stringify({ error: 'Project not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Generate Langfuse session ID for grouping traces
    const langfuseSessionId = bodySessionId || `session-loop-creator-${projectId}`

    // Create Langfuse trace with session for observability
    let trace: ReturnType<typeof langfuse.trace> | null = null
    if (isLangfuseEnabled) {
      try {
        trace = langfuse.trace({
          name: 'loop-creator-chat',
          sessionId: langfuseSessionId,
          userId: userId || session.user.id,
          metadata: {
            projectId,
            source: 'loop-creator',
          },
          tags: ['loop-creator', 'chat', `project:${projectId}`],
        })
        console.log(`[Langfuse] Created loop-creator trace in session ${langfuseSessionId}`)
      } catch (e) {
        console.warn('[Langfuse] Failed to create trace:', e)
      }
    }

    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false

        const safeEnqueue = (data: StreamEvent) => {
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
          const currentThreadId = threadId || crypto.randomUUID()

          safeEnqueue({
            type: 'start',
            threadId: currentThreadId,
            timestamp: Date.now(),
          })

          const initialState: LoopCreatorState = {
            messages: [
              ...(recentMessages?.map(m =>
                m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
              ) || []),
              new HumanMessage(message),
            ],
            roundCount: 0,
            gameContext: {
              gameGenre: context?.gameGenre,
              gamePlatform: context?.gamePlatform,
              targetAudience: context?.targetAudience,
              gameDescription: context?.gameDescription,
            },
            currentPhase: 'ideation',
            nextAgent: 'supervisor',
          }

          // Let the LoopGraph run and stream events
          const finalState = await streamLoopCreator(
            initialState,
            { configurable: { thread_id: currentThreadId } },
            (event) => {
              safeEnqueue(event as StreamEvent)
            }
          )

          safeEnqueue({
            type: 'state',
            mechanics: finalState.mechanics?.length ?? 0,
            connections: finalState.connections?.length ?? 0,
            loops: finalState.loops?.length ?? 0,
            progressionSystems: finalState.progressionSystems?.length ?? 0,
            balanceScore: finalState.balanceAnalysis?.overallScore,
            phase: finalState.currentPhase || 'ideation',
            timestamp: Date.now(),
          })

          safeEnqueue({
            type: 'complete',
            threadId: currentThreadId,
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
        Connection: 'keep-alive',
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

export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'loop-creator',
      stack: 'mastra',
      timestamp: Date.now(),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}
