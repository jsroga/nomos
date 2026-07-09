/**
 * Loop Creator orchestrator — Mastra-native imperative supervisor loop.
 * Replaces LangGraph StateGraph while preserving streamLoopCreator API.
 */

import { AIMessage } from '@langchain/core/messages'
import { LoopCreatorState, NextAgent } from './state'
import { supervisorAgent } from '../../agents/supervisor'
import { loopPlannerAgent } from '../../agents/loop-planner'
import { mechanicsDesignerAgent } from '../../agents/mechanics-designer'
import { balanceAnalystAgent } from '../../agents/balance-analyst'
import { progressionArchitectAgent } from '../../agents/progression-architect'
import { nextAgentFromAgentNode } from './agent-nodes'

export interface StreamEvent {
  type: 'node' | 'message' | 'action' | 'questions' | 'token' | 'error'
  node?: string
  agent?: string
  content?: string
  token?: string
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
}

const MAX_ROUNDS = 15

import { AGENT_NODES, type AgentNode, isRegisteredAgent } from './agent-nodes'

const AGENT_FNS: Record<
  AgentNode,
  (state: LoopCreatorState) => Promise<Partial<LoopCreatorState>>
> = {
  supervisor: supervisorAgent,
  loop_planner: loopPlannerAgent,
  mechanics_designer: mechanicsDesignerAgent,
  balance_analyst: balanceAnalystAgent,
  progression_architect: progressionArchitectAgent,
  market_analyst: marketAnalystAgent,
}

function routeToNextAgent(state: LoopCreatorState): NextAgent | 'END' {
  if (state.roundCount >= MAX_ROUNDS) return 'END'
  if (state.currentPhase === 'complete') return 'END'

  const nextAgent = state.nextAgent
  if (nextAgent && nextAgent !== 'END' && nextAgent !== 'supervisor') {
    return nextAgent
  }

  if (state.pendingQuestions && state.pendingQuestions.length > 0) {
    return 'END'
  }

  return nextAgent
}

async function invokeAgent(
  agentName: AgentNode,
  state: LoopCreatorState,
): Promise<Partial<LoopCreatorState>> {
  try {
    console.log(`[LoopOrchestrator] Invoking ${agentName}...`)
    const startTime = Date.now()
    const result = await AGENT_FNS[agentName](state)
    console.log(`[LoopOrchestrator] ${agentName} completed in ${Date.now() - startTime}ms`)

    const lastAgent = nextAgentFromAgentNode(agentName)
    const baseResult = { ...result, lastAgent }

    if (agentName === 'supervisor') {
      return { ...baseResult, roundCount: state.roundCount + 1 }
    }

    return baseResult
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[LoopOrchestrator] Agent ${agentName} failed:`, errorMsg)

    const lastAgent = nextAgentFromAgentNode(agentName)
    return {
      errors: [errorMsg],
      nextAgent: 'END',
      lastAgent,
      messages: [
        new AIMessage({
          content: `Error in ${agentName}: ${errorMsg}. Please try again.`,
          name: agentName,
        }),
      ],
    }
  }
}

function resolveNode(next: NextAgent | 'END'): AgentNode | null {
  if (next === 'END' || !next) return null
  if (isRegisteredAgent(next)) return next
  console.warn(`[LoopOrchestrator] Unknown nextAgent: ${next}`)
  return null
}

const FRIENDLY_NAMES: Record<string, string> = {
  supervisor: 'Showrunner',
  loop_planner: 'Loop Planner',
  mechanics_designer: 'Mechanics Designer',
  balance_analyst: 'Balance Analyst',
  progression_architect: 'Progression Architect',
  market_analyst: 'Market Analyst',
}

function isLangChainAIMessage(msg: unknown): boolean {
  if (msg instanceof AIMessage) return true
  if (typeof msg === 'object' && msg !== null && '_getType' in msg) {
    const getType = Reflect.get(msg, '_getType')
    return typeof getType === 'function' && getType() === 'ai'
  }
  return false
}

function emitNodeOutput(
  nodeName: string,
  output: Partial<LoopCreatorState>,
  onEvent: (event: StreamEvent) => void,
) {
  const nodeEvent = {
    type: 'node' as const,
    node: nodeName,
    agent: FRIENDLY_NAMES[nodeName] || nodeName,
    timestamp: Date.now(),
  }
  onEvent(nodeEvent)
  onEvent({
    type: 'token',
    token: `${JSON.stringify(nodeEvent, null, 2)}\n`,
    timestamp: Date.now(),
  })

  if (output.messages) {
    for (const msg of output.messages) {
      if (!isLangChainAIMessage(msg)) continue

      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      const msgEvent = {
        type: 'message' as const,
        node: nodeName,
        agent: nodeName,
        message: { type: 'ai', content, sender: nodeName, name: nodeName },
        timestamp: Date.now(),
      }
      onEvent(msgEvent)
      onEvent({
        type: 'token',
        token: `${JSON.stringify(msgEvent, null, 2)}\n`,
        timestamp: Date.now(),
      })
    }
  }

  if (output.pendingActions) {
    for (const action of output.pendingActions) {
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
      onEvent({
        type: 'token',
        token: `${JSON.stringify(actionEvent, null, 2)}\n`,
        timestamp: Date.now(),
      })
    }
  }

  if (output.pendingQuestions && output.pendingQuestions.length > 0) {
    onEvent({
      type: 'questions',
      questions: output.pendingQuestions,
      timestamp: Date.now(),
    })
  }
}

export async function streamLoopCreator(
  initialState: LoopCreatorState,
  _config: { configurable: { thread_id: string } },
  onEvent: (event: StreamEvent) => void,
): Promise<LoopCreatorState> {
  let state = initialState
  let currentNode: AgentNode = 'supervisor'

  console.log('[LoopOrchestrator] Starting run...')

  while (true) {
    const output = await invokeAgent(currentNode, state)
    state = { ...state, ...output }
    emitNodeOutput(currentNode, output, onEvent)

    const next = routeToNextAgent(state)
    if (next === 'END') break

    const resolved = resolveNode(next)
    if (!resolved) break

    currentNode = resolved
  }

  return state
}
