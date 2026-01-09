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
import { 
  LoopCreatorState, 
  loopCreatorChannels,
  NextAgent,
  LoopCreatorPhase 
} from './state'
import { 
  supervisorAgent 
} from '../agents/supervisor'
import {
  loopPlannerAgent
} from '../agents/loop-planner'
import {
  mechanicsDesignerAgent
} from '../agents/mechanics-designer'
import {
  balanceAnalystAgent
} from '../agents/balance-analyst'
import {
  progressionArchitectAgent
} from '../agents/progression-architect'

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
  // Check termination conditions
  if (state.roundCount >= MAX_ROUNDS) {
    console.log('[LoopGraph] Max rounds reached, ending')
    return 'END'
  }
  
  if (state.currentPhase === 'complete') {
    return 'END'
  }
  
  // Check for questions that need user input
  if (state.pendingQuestions.length > 0) {
    return 'END' // Pause for user input
  }
  
  // Route based on nextAgent set by supervisor
  return state.nextAgent
}

/**
 * Conditional edges function
 */
function getNextNode(state: LoopCreatorState): string {
  const next = routeToNextAgent(state)
  
  if (next === 'END') return END
  if (next === 'supervisor') return 'supervisor'
  if (next === 'loop_planner') return 'loop_planner'
  if (next === 'mechanics_designer') return 'mechanics_designer'
  if (next === 'balance_analyst') return 'balance_analyst'
  if (next === 'progression_architect') return 'progression_architect'
  
  return 'supervisor' // Default
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
      console.log(`[LoopGraph] Invoking ${agentName}`)
      const result = await agentFn(state)
      
      // Increment round count if this is the supervisor
      if (agentName === 'supervisor') {
        return {
          ...result,
          roundCount: state.roundCount + 1,
        }
      }
      
      return result
    } catch (error) {
      console.error(`[LoopGraph] Agent ${agentName} error:`, error)
      return {
        errors: [error instanceof Error ? error.message : 'Unknown error in ' + agentName],
        nextAgent: 'supervisor' as NextAgent,
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
  workflow.addNode('progression_architect', wrapAgent(progressionArchitectAgent, 'progression_architect'))
  
  // Set entry point
  workflow.addEdge(START, 'supervisor')
  
  // Add conditional edges from supervisor
  workflow.addConditionalEdges('supervisor', getNextNode, {
    supervisor: 'supervisor',
    loop_planner: 'loop_planner',
    mechanics_designer: 'mechanics_designer',
    balance_analyst: 'balance_analyst',
    progression_architect: 'progression_architect',
    [END]: END,
  })
  
  // All specialists route back to supervisor
  workflow.addEdge('loop_planner', 'supervisor')
  workflow.addEdge('mechanics_designer', 'supervisor')
  workflow.addEdge('balance_analyst', 'supervisor')
  workflow.addEdge('progression_architect', 'supervisor')
  
  // Compile with optional checkpointer (sync in LangGraph 1.x)
  const compiled = saver
    ? workflow.compile({ checkpointer: saver })
    : workflow.compile()
  
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
  
  // LangGraph 1.x requires streamMode to be specified
  for await (const event of await graph.stream(initialState, { ...config, streamMode: 'updates' })) {
    for (const [nodeName, nodeOutput] of Object.entries(event)) {
      const output = nodeOutput as Partial<LoopCreatorState>
      
      // Emit node event
      onEvent({
        type: 'node',
        node: nodeName,
        timestamp: Date.now(),
      })
      
      // Emit message events - format to match frontend expectations
      if (output.messages) {
        console.log(`[LoopGraph] Node ${nodeName} has ${output.messages.length} messages`)
        for (const msg of output.messages) {
          // Check both instanceof and _getType for AIMessage detection
          const isAI = msg instanceof AIMessage || (msg as any)?._getType?.() === 'ai'
          console.log(`[LoopGraph] Message type check: instanceof=${msg instanceof AIMessage}, _getType=${(msg as any)?._getType?.()}`)
          if (isAI) {
            const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
            console.log(`[LoopGraph] Emitting AI message from ${nodeName}: ${content.slice(0, 100)}...`)
            onEvent({
              type: 'message',
              node: nodeName,
              agent: nodeName,
              message: {
                type: 'ai',
                content,
                sender: nodeName,
                name: nodeName,
              },
              timestamp: Date.now(),
            })
          }
        }
      }
      
      // Emit action events
      if (output.pendingActions) {
        for (const action of output.pendingActions) {
          onEvent({
            type: 'action',
            action: action.type,
            payload: action.payload,
            agent: nodeName,
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
  action?: string
  payload?: any
  questions?: any[]
  error?: string
  timestamp: number
}

