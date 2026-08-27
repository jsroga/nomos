/**
 * Loop Creator Chat API
 *
 * Streaming endpoint for game loop design conversations.
 * Uses Server-Sent Events for real-time updates.
 * Runs on Mastra framework (same pattern as Storyteller).
 */

import { NextRequest } from 'next/server'
// Side-effect: register the loop-creator Mastra agents on the central instance
// before any request triggers getMastraInstance() (via withMastraSpan on the
// flagged LOOP_CREATOR_MASTRA path).
import '@/domains/loop-creator/core/io/mastra-runtime'
import { requireAuth } from '@/shared/auth/auth'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { streamLoopCreator } from '@/domains/loop-creator/server'
import { type LoopCreatorState, createInitialLoopState } from '@/domains/loop-creator'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import {
  ContentType,
  LoopCreatorChatPhase,
  LoopCreatorChatRole,
  LoopCreatorHealthStatus,
  LoopCreatorServiceId,
  LoopCreatorStreamEventType,
  SseAccelBuffering,
  SseCacheControl,
  SseHeader,
} from '@/shared/data/constants/protocol'

export const maxDuration = 120

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
  sessionId?: string
  userId?: string
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

import type { StreamEvent as LoopOrchestratorStreamEvent } from '@/domains/loop-creator/core/graph/loop-orchestrator'

interface StreamEvent {
  type:
  | LoopCreatorStreamEventType.Node
  | LoopCreatorStreamEventType.Message
  | LoopCreatorStreamEventType.Action
  | LoopCreatorStreamEventType.Questions
  | LoopCreatorStreamEventType.Token
  | LoopCreatorStreamEventType.Error
  | LoopCreatorStreamEventType.Start
  | LoopCreatorStreamEventType.State
  | LoopCreatorStreamEventType.Complete
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

type ChatStreamEvent = StreamEvent | LoopOrchestratorStreamEvent

function formatSSE(data: ChatStreamEvent): string {
  const jsonStr = JSON.stringify(data)
  return `data: ${jsonStr}\n\n`
}

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return new Response(JSON.stringify({ error: API_ERROR.UNAUTHORIZED }), {
        status: 401,
        headers: { 'Content-Type': ContentType.Json },
      })
    }

    const body: ChatRequest = await req.json()
    const { message, projectId, threadId, context, recentMessages } = body

    if (!message || !projectId) {
      return new Response(JSON.stringify({ error: API_ERROR.LOOP_CHAT_MESSAGE_PROJECT_REQUIRED }), {
        status: 400,
        headers: { 'Content-Type': ContentType.Json },
      })
    }

    if (!(await tryProjectScope(projectId, session.user.id))) {
      return new Response(JSON.stringify({ error: API_ERROR.PROJECT_ACCESS_DENIED }), {
        status: 404,
        headers: { 'Content-Type': ContentType.Json },
      })
    }

    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false

        const safeEnqueue = (data: ChatStreamEvent) => {
          if (isClosed) return
          try {
            controller.enqueue(new TextEncoder().encode(formatSSE(data)))
          } catch (error) {
            console.error(API_LOG_PREFIX.LOOP_API_ENQUEUE_ERROR, error)
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
            type: LoopCreatorStreamEventType.Start,
            threadId: currentThreadId,
            timestamp: Date.now(),
          })

          const initialState: LoopCreatorState = {
            ...createInitialLoopState(projectId, message, context),
            // Seed the graph with the recent conversation history, not just the
            // latest turn that the factory defaults to.
            messages: [
              ...(recentMessages?.map(m =>
                m.role === LoopCreatorChatRole.User
                  ? new HumanMessage(m.content)
                  : new AIMessage(m.content)
              ) || []),
              new HumanMessage(message),
            ],
          }

          const finalState = await streamLoopCreator(
            initialState,
            { configurable: { thread_id: currentThreadId } },
            event => {
              safeEnqueue(event)
            }
          )

          safeEnqueue({
            type: LoopCreatorStreamEventType.State,
            mechanics: finalState.mechanics?.length ?? 0,
            connections: finalState.connections?.length ?? 0,
            loops: finalState.loops?.length ?? 0,
            progressionSystems: finalState.progressionSystems?.length ?? 0,
            balanceScore: finalState.balanceAnalysis?.overallScore,
            phase: finalState.currentPhase || LoopCreatorChatPhase.Ideation,
            timestamp: Date.now(),
          })

          safeEnqueue({
            type: LoopCreatorStreamEventType.Complete,
            threadId: currentThreadId,
            timestamp: Date.now(),
          })
        } catch (error) {
          console.error(API_LOG_PREFIX.LOOP_API_STREAM_ERROR, error)
          safeEnqueue({
            type: LoopCreatorStreamEventType.Error,
            error: error instanceof Error ? error.message : API_ERROR.UNKNOWN_ERROR,
            timestamp: Date.now(),
          })
        } finally {
          safeClose()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': SseHeader.ContentType,
        'Cache-Control': SseCacheControl.NoCacheNoTransform,
        Connection: SseHeader.Connection,
        'X-Accel-Buffering': SseAccelBuffering.No,
      },
    })
  } catch (error) {
    console.error(API_LOG_PREFIX.LOOP_API_ERROR, error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : API_ERROR.UNKNOWN_ERROR,
      }),
      { status: 500, headers: { 'Content-Type': ContentType.Json } }
    )
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({
      status: LoopCreatorHealthStatus.Ok,
      service: LoopCreatorServiceId.LoopCreator,
      stack: LoopCreatorServiceId.Mastra,
      timestamp: Date.now(),
    }),
    { headers: { 'Content-Type': ContentType.Json } }
  )
}
