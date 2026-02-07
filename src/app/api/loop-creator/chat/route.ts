/**
 * Loop Creator Chat API
 *
 * Streaming endpoint for game loop design conversations.
 * Uses Server-Sent Events for real-time updates.
 *
 * Migrated to Mastra-based GameDesignAgent (Phase 8)
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { verifyProjectAccess } from '@/domains/storyteller/lib/access-verification'
import { GameDesignAgent } from '@/domains/game-design/agent'
import { PlanPersistence } from '@/agent-core/planner'
import { langfuse, isLangfuseEnabled } from '@/agent-core/observability'

export const maxDuration = 120

interface ChatRequest {
  message: string
  projectId: string
  threadId?: string
  sessionId?: string // Langfuse session ID for grouped traces
  userId?: string // User ID for tracking
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

// StreamEvent interface for UI compatibility
interface StreamEvent {
  type: 'node' | 'message' | 'action' | 'questions' | 'token' | 'error' | 'start' | 'state' | 'complete'
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
    payload: any
    confidence?: number
    reasoning?: string
  }
  questions?: any[]
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

function formatSSE(data: any): string {
  const jsonStr = JSON.stringify(data)
  return `data: ${jsonStr}\n\n`
}

// In-memory session storage (for thread persistence)
// In production, this should use a database
const sessionStore = new Map<string, any>()

// Simple in-memory plan persistence
class InMemoryPlanPersistence implements PlanPersistence {
  private plans = new Map<string, any>()

  constructor(private threadId: string) {}

  async loadPlan() {
    return this.plans.get(this.threadId) || null
  }

  async savePlan(plan: any) {
    this.plans.set(this.threadId, plan)
  }
}

async function getAgent(threadId: string): Promise<GameDesignAgent> {
  const persistence = new InMemoryPlanPersistence(threadId)
  return GameDesignAgent.create({
    modelName: process.env.GAME_DESIGN_MODEL || 'openai:gpt-4o',
    persistence,
  })
}

function convertCanvasToMechanics(nodes: any[], edges: any[]) {
  const mechanics = (nodes || [])
    .filter((n: any) => n.type !== 'group')
    .map((n: any) => ({
      id: n.id,
      name: n.label || n.data?.label || n.id,
      type: (n.data?.nodeType || 'core') as any,
      description: n.data?.description || n.description || '',
      inputs: [],
      outputs: [],
      balanceFactors: { effort: 5, reward: 5, frequency: 5 },
    }))

  const connections = (edges || []).map((e: any) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'triggers' as any,
    label: e.label || '',
  }))

  return { mechanics, connections }
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
    const { message, projectId, threadId, context, modelConfig, sessionId: bodySessionId, userId } = body

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
    let trace: any = null
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

          // Get or create session state
          let sessionState = sessionStore.get(currentThreadId) || {
            mechanics: [],
            connections: [],
            loops: [],
            progressionSystems: [],
            balanceAnalysis: null,
            currentPhase: 'ideation',
            gameGenre: context?.gameGenre || '',
            gamePlatform: context?.gamePlatform || '',
            gameDescription: context?.gameDescription || '',
            targetAudience: context?.targetAudience || 'midcore',
          }

          // Update with canvas state if provided
          if (context?.nodes || context?.edges) {
            const { mechanics, connections } = convertCanvasToMechanics(
              context?.nodes || [],
              context?.edges || []
            )
            if (mechanics.length > 0) {
              sessionState.mechanics = mechanics
            }
            if (connections.length > 0) {
              sessionState.connections = connections
            }
          }

          // Update context
          if (context?.gameGenre) sessionState.gameGenre = context.gameGenre
          if (context?.gamePlatform) sessionState.gamePlatform = context.gamePlatform
          if (context?.gameDescription) sessionState.gameDescription = context.gameDescription
          if (context?.targetAudience) sessionState.targetAudience = context.targetAudience

          safeEnqueue({
            type: 'start',
            threadId: currentThreadId,
            timestamp: Date.now(),
          })

          // Get Mastra agent
          const agent = await getAgent(currentThreadId)

          // Emit node event for agent starting
          safeEnqueue({
            type: 'node',
            node: 'game_design_agent',
            agent: 'game_design_agent',
            timestamp: Date.now(),
          })

          // Run the agent
          const result = await agent.runWithContext({
            projectId,
            genre: sessionState.gameGenre || 'game',
            targetAudience: sessionState.targetAudience as any,
            existingMechanics: sessionState.mechanics,
            userMessage: message,
          })

          // Emit message event with agent response
          if (result.thought) {
            safeEnqueue({
              type: 'message',
              message: {
                type: 'ai',
                content: result.thought,
                sender: 'game_design_agent',
                name: 'Game Design Agent',
              },
              timestamp: Date.now(),
            })
          }

          // Handle different response types
          if (result.type === 'ASK_USER' && result.payload?.question) {
            safeEnqueue({
              type: 'questions',
              questions: [{
                id: crypto.randomUUID(),
                question: result.payload.question,
                options: result.payload.options || [],
              }],
              timestamp: Date.now(),
            })
          }

          if (result.type === 'EXECUTE_STEP' && result.payload) {
            // Emit action for tool execution
            safeEnqueue({
              type: 'action',
              action: {
                type: result.payload.tool || 'tool_call',
                payload: result.payload,
                reasoning: result.thought,
              },
              timestamp: Date.now(),
            })

            // If the action created mechanics or loops, update session state
            if (result.payload.mechanics) {
              sessionState.mechanics = result.payload.mechanics
            }
            if (result.payload.loops) {
              sessionState.loops = result.payload.loops
            }
            if (result.payload.balanceAnalysis) {
              sessionState.balanceAnalysis = result.payload.balanceAnalysis
            }
          }

          if (result.type === 'PROPOSE_PLAN' && result.payload?.plan) {
            safeEnqueue({
              type: 'action',
              action: {
                type: 'propose_plan',
                payload: result.payload.plan,
                reasoning: result.thought,
              },
              timestamp: Date.now(),
            })
          }

          if (result.type === 'FINISH') {
            sessionState.currentPhase = 'complete'
            if (result.payload) {
              // Update state with final results
              if (result.payload.mechanics) sessionState.mechanics = result.payload.mechanics
              if (result.payload.loops) sessionState.loops = result.payload.loops
              if (result.payload.balanceAnalysis) sessionState.balanceAnalysis = result.payload.balanceAnalysis
            }
          }

          // Save session state
          sessionStore.set(currentThreadId, sessionState)

          // Emit final state
          safeEnqueue({
            type: 'state',
            mechanics: sessionState.mechanics?.length || 0,
            connections: sessionState.connections?.length || 0,
            loops: sessionState.loops?.length || 0,
            progressionSystems: sessionState.progressionSystems?.length || 0,
            balanceScore: sessionState.balanceAnalysis?.overallScore,
            phase: sessionState.currentPhase,
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
