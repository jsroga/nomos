/**
 * Loop Creator Graph
 *
 * LangGraph workflow for game loop design using supervisor pattern.
 * Based on LangChain 2025 best practices.
 */

import { StateGraph, END, START } from '@langchain/langgraph'
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres'
import { RunnableLambda } from '@langchain/core/runnables'
import { AIMessage } from '@langchain/core/messages'
import { LoopCreatorState, loopCreatorChannels, NextAgent, LoopCreatorPhase } from './state'
import { supervisorAgent } from '../agents/supervisor'
import { loopPlannerAgent } from '../agents/loop-planner'
import { mechanicsDesignerAgent } from '../agents/mechanics-designer'
import { balanceAnalystAgent } from '../agents/balance-analyst'
import { progressionArchitectAgent } from '../agents/progression-architect'
import { marketAnalystAgent } from '../agents/market-analyst-wrapper'

// Maximum rounds before forcing termination
const MAX_ROUNDS = 15

// Database connection for checkpointing
let checkpointer: PostgresSaver | null = null

async function getCheckpointer(): Promise<PostgresSaver | null> {
  if (checkpointer) return checkpointer

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.warn('[LoopGraph] No DATABASE_URL - running without checkpointer')
    return null
  }

  try {
    checkpointer = PostgresSaver.fromConnString(connectionString)
    await checkpointer.setup()
    return checkpointer
  } catch (error) {
    console.error('[LoopGraph] Failed to setup checkpointer:', error)
    return null
  }
}

/**
 * Router function to determine next node
 */
function routeToNextAgent(state: LoopCreatorState): NextAgent | 'END' {
  console.log('[LoopGraph routeToNextAgent] Checking termination conditions...')

  // Check termination conditions
  if (state.roundCount >= MAX_ROUNDS) {
    console.log('[LoopGraph routeToNextAgent] Max rounds reached, ending')
    return 'END'
  }

  if (state.currentPhase === 'complete') {
    console.log('[LoopGraph routeToNextAgent] Phase is complete, ending')
    return 'END'
  }

  // If supervisor explicitly wants to delegate to a specialist, do that first
  // Only pause for questions if nextAgent is END (supervisor wants to wait for user)
  const nextAgent = state.nextAgent
  if (nextAgent && nextAgent !== 'END' && nextAgent !== 'supervisor') {
    console.log(`[LoopGraph routeToNextAgent] Delegating to specialist: ${nextAgent}`)
    return nextAgent
  }

  // Check for questions that need user input (only when not delegating)
  if (state.pendingQuestions && state.pendingQuestions.length > 0) {
    console.log('[LoopGraph routeToNextAgent] Has pending questions, ending')
    return 'END' // Pause for user input
  }

  console.log(`[LoopGraph routeToNextAgent] Returning state.nextAgent: ${nextAgent}`)
  // Route based on nextAgent set by supervisor
  return nextAgent
}

/**
 * Conditional edges function
 */
function getNextNode(state: LoopCreatorState): string {
  console.log(
    `[LoopGraph Router] state.nextAgent=${state.nextAgent}, roundCount=${state.roundCount}, phase=${state.currentPhase}`
  )
  const next = routeToNextAgent(state)
  console.log(`[LoopGraph Router] routeToNextAgent returned: ${next}`)

  // Handle END conditions
  if (next === 'END' || next === END) {
    console.log('[LoopGraph Router] Routing to END')
    return END
  }

  // Route to specific agents
  let result: string
  switch (next) {
    case 'supervisor':
      result = 'supervisor'
      break
    case 'loop_planner':
      result = 'loop_planner'
      break
    case 'mechanics_designer':
      result = 'mechanics_designer'
      break
    case 'balance_analyst':
      result = 'balance_analyst'
      break
    case 'progression_architect':
      result = 'progression_architect'
      break
    case 'market_analyst':
      result = 'market_analyst'
      break
    default:
      // Unknown agent - end to prevent loops
      console.log(`[LoopGraph Router] Unknown nextAgent: ${next}, ending`)
      return END
  }
  console.log(`[LoopGraph Router] ✅ Routing to: ${result}`)
  return result
}

/**
 * Wrap agent with error handling and round counting
 */
function wrapAgent(
  agentFn: (state: LoopCreatorState) => Promise<Partial<LoopCreatorState>>,
  agentName: string
) {
  return RunnableLambda.from(async (state: LoopCreatorState) => {
    try {
      console.log(`[LoopGraph] Invoking ${agentName}...`)
      const startTime = Date.now()

      const result = await agentFn(state)

      const duration = Date.now() - startTime
      console.log(`[LoopGraph] ${agentName} completed in ${duration}ms`)

      // Track which agent just executed
      const baseResult = {
        ...result,
        lastAgent: agentName as any,
      }

      // Increment round count if this is the supervisor
      if (agentName === 'supervisor') {
        return {
          ...baseResult,
          roundCount: state.roundCount + 1,
        }
      }

      return baseResult
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[LoopGraph] ❌ Agent ${agentName} FAILED:`, errorMsg)
      console.error('[LoopGraph] Stack:', error instanceof Error ? error.stack : 'No stack')

      // Return error message that will be visible to user
      return {
        errors: [errorMsg],
        nextAgent: 'END' as NextAgent,
        lastAgent: agentName as any,
        messages: [
          new AIMessage({
            content: `⚠️ Error in ${agentName}: ${errorMsg}. Please try again.`,
            name: agentName,
          }),
        ],
      }
    }
  })
}

/**
 * Build the Loop Creator graph
 */
export async function getLoopCreatorGraph() {
  const saver = await getCheckpointer()

  const workflow = new StateGraph<LoopCreatorState>({
    channels: loopCreatorChannels as any,
  })

  // Add nodes
  workflow.addNode('supervisor', wrapAgent(supervisorAgent, 'supervisor'))
  workflow.addNode('loop_planner', wrapAgent(loopPlannerAgent, 'loop_planner'))
  workflow.addNode('mechanics_designer', wrapAgent(mechanicsDesignerAgent, 'mechanics_designer'))
  workflow.addNode('balance_analyst', wrapAgent(balanceAnalystAgent, 'balance_analyst'))
  workflow.addNode(
    'progression_architect',
    wrapAgent(progressionArchitectAgent, 'progression_architect')
  )
  workflow.addNode('market_analyst', wrapAgent(marketAnalystAgent, 'market_analyst'))

  // Set entry point
  workflow.addEdge(START, 'supervisor')

  // Add conditional edges from supervisor
  workflow.addConditionalEdges('supervisor', getNextNode, {
    supervisor: 'supervisor',
    loop_planner: 'loop_planner',
    mechanics_designer: 'mechanics_designer',
    balance_analyst: 'balance_analyst',
    progression_architect: 'progression_architect',
    market_analyst: 'market_analyst',
    [END]: END,
  })

  // All specialists route back to supervisor
  workflow.addEdge('loop_planner', 'supervisor')
  workflow.addEdge('mechanics_designer', 'supervisor')
  workflow.addEdge('balance_analyst', 'supervisor')
  workflow.addEdge('progression_architect', 'supervisor')
  workflow.addEdge('market_analyst', 'supervisor')

  // Compile with optional checkpointer (sync in LangGraph 1.x)
  const compiled = saver ? workflow.compile({ checkpointer: saver }) : workflow.compile()

  return compiled
}

/**
 * Stream events from the graph
 */
export async function streamLoopCreator(
  initialState: LoopCreatorState,
  config: { configurable: { thread_id: string } },
  onEvent: (event: StreamEvent) => void
): Promise<LoopCreatorState> {
  const graph = await getLoopCreatorGraph()

  let finalState = initialState

  console.log('[LoopGraph] Starting stream...')

  // LangGraph 1.x requires streamMode to be specified
  for await (const event of await graph.stream(initialState, {
    ...config,
    streamMode: 'updates',
  })) {
    console.log('[LoopGraph] Received event keys:', Object.keys(event))

    for (const [nodeName, nodeOutput] of Object.entries(event)) {
      const output = nodeOutput as Partial<LoopCreatorState>
      console.log(`[LoopGraph] Processing node: ${nodeName}, nextAgent: ${output.nextAgent}`)

      // Emit node start event with friendly name
      const friendlyNames: Record<string, string> = {
        supervisor: 'Showrunner',
        loop_planner: 'Loop Planner',
        mechanics_designer: 'Mechanics Designer',
        balance_analyst: 'Balance Analyst',
        progression_architect: 'Progression Architect',
        market_analyst: 'Market Analyst',
      }

      const nodeEvent = {
        type: 'node' as const,
        node: nodeName,
        agent: friendlyNames[nodeName] || nodeName,
        timestamp: Date.now(),
      }
      onEvent(nodeEvent)

      // Also emit as token for raw JSON visibility (Activity panel)
      onEvent({
        type: 'token',
        token: JSON.stringify(nodeEvent, null, 2) + '\n',
        timestamp: Date.now(),
      })

      // Emit message events - format to match frontend expectations
      if (output.messages) {
        console.log(`[LoopGraph] Node ${nodeName} has ${output.messages.length} messages`)
        for (const msg of output.messages) {
          // Check both instanceof and _getType for AIMessage detection
          const isAI = msg instanceof AIMessage || (msg as any)?._getType?.() === 'ai'
          console.log(
            `[LoopGraph] Message type check: instanceof=${msg instanceof AIMessage}, _getType=${(msg as any)?._getType?.()}`
          )
          if (isAI) {
            const content =
              typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
            console.log(
              `[LoopGraph] Emitting AI message from ${nodeName}: ${content.slice(0, 100)}...`
            )
            const msgEvent = {
              type: 'message' as const,
              node: nodeName,
              agent: nodeName,
              message: {
                type: 'ai',
                content,
                sender: nodeName,
                name: nodeName,
              },
              timestamp: Date.now(),
            }
            onEvent(msgEvent)

            // Also emit as token for raw JSON visibility
            onEvent({
              type: 'token',
              token: JSON.stringify(msgEvent, null, 2) + '\n',
              timestamp: Date.now(),
            })
          }
        }
      }

      // Emit action events - pass full action object so handler can use action.type and action.payload
      if (output.pendingActions) {
        console.log(`[LoopGraph] Emitting ${output.pendingActions.length} actions from ${nodeName}`)
        for (const action of output.pendingActions) {
          console.log(
            `[LoopGraph] Action: ${action.type} - ${action.payload?.label || action.payload?.id || 'no label'}`
          )
          const actionEvent = {
            type: 'action' as const,
            action: {
              type: action.type,
              payload: action.payload,
              confidence: action.confidence,
              reasoning: action.reasoning,
            },
            agent: nodeName,
            timestamp: Date.now(),
          }
          onEvent(actionEvent)

          // Also emit as token for raw JSON visibility
          onEvent({
            type: 'token',
            token: JSON.stringify(actionEvent, null, 2) + '\n',
            timestamp: Date.now(),
          })
        }
      }

      // Emit question events
      if (output.pendingQuestions && output.pendingQuestions.length > 0) {
        onEvent({
          type: 'questions',
          questions: output.pendingQuestions,
          timestamp: Date.now(),
        })
      }

      // Merge output into final state
      finalState = { ...finalState, ...output }
    }
  }

  return finalState
}

export interface StreamEvent {
  type: 'node' | 'message' | 'action' | 'questions' | 'token' | 'error'
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
}
