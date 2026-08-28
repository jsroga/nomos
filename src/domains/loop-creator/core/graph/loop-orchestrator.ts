/**
 * Loop Creator orchestrator — Mastra-native imperative supervisor loop.
 * Replaces LangGraph StateGraph while preserving streamLoopCreator API.
 */

import { AIMessage, ChatMessageRole } from '@/shared/chat/core/message'
import { LoopCreatorState, NextAgent } from './state'
import { supervisorAgent } from '../../ai/agents/supervisor'
import { loopPlannerAgent } from '../../ai/agents/loop-planner'
import { mechanicsDesignerAgent } from '../../ai/agents/mechanics-designer'
import { balanceAnalystAgent } from '../../ai/agents/balance-analyst'
import { progressionArchitectAgent } from '../../ai/agents/progression-architect'
import { marketAnalystAgent } from '../../ai/agents/market-analyst-wrapper'
import { nextAgentFromAgentNode, type AgentNode, isRegisteredAgent } from './agent-nodes'
import { LoopAgentNode } from '@/domains/loop-creator/constants/agent-nodes'
import {
  LOOP_CREATOR_PHASE_COMPLETE,
  NEXT_AGENT_END,
  NEXT_AGENT_SUPERVISOR,
} from '@/domains/loop-creator/constants/graph-state-defaults'
import {
  LOOP_AGENT_DISPLAY_NAMES,
  LOOP_ORCHESTRATOR_UNKNOWN_ERROR,
  LangChainMessageWire,
  LoopOrchestratorEventType,
  LoopOrchestratorLog,
  LoopOrchestratorMessageType,
} from '@/domains/loop-creator/constants/loop-orchestrator'

export interface StreamEvent {
  type: LoopOrchestratorEventType
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

const AGENT_FNS: Record<
  AgentNode,
  (state: LoopCreatorState) => Promise<Partial<LoopCreatorState>>
> = {
  [LoopAgentNode.Supervisor]: supervisorAgent,
  [LoopAgentNode.LoopPlanner]: loopPlannerAgent,
  [LoopAgentNode.MechanicsDesigner]: mechanicsDesignerAgent,
  [LoopAgentNode.BalanceAnalyst]: balanceAnalystAgent,
  [LoopAgentNode.ProgressionArchitect]: progressionArchitectAgent,
  [LoopAgentNode.MarketAnalyst]: marketAnalystAgent,
}

function routeToNextAgent(state: LoopCreatorState): NextAgent | typeof NEXT_AGENT_END {
  if (state.roundCount >= MAX_ROUNDS) return NEXT_AGENT_END
  if (state.currentPhase === LOOP_CREATOR_PHASE_COMPLETE) return NEXT_AGENT_END

  const nextAgent = state.nextAgent
  if (nextAgent && nextAgent !== NEXT_AGENT_END && nextAgent !== NEXT_AGENT_SUPERVISOR) {
    return nextAgent
  }

  if (state.pendingQuestions && state.pendingQuestions.length > 0) {
    return NEXT_AGENT_END
  }

  return nextAgent
}

async function invokeAgent(
  agentName: AgentNode,
  state: LoopCreatorState,
): Promise<Partial<LoopCreatorState>> {
  try {
    console.log(`${LoopOrchestratorLog.Invoking}${agentName}...`)
    const startTime = Date.now()
    const result = await AGENT_FNS[agentName](state)
    console.log(
      `${LoopOrchestratorLog.Completed}${agentName}${LoopOrchestratorLog.CompletedSuffix}${Date.now() - startTime}${LoopOrchestratorLog.CompletedMsSuffix}`
    )

    const lastAgent = nextAgentFromAgentNode(agentName)
    const baseResult = { ...result, lastAgent }

    if (agentName === LoopAgentNode.Supervisor) {
      return { ...baseResult, roundCount: state.roundCount + 1 }
    }

    return baseResult
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : LOOP_ORCHESTRATOR_UNKNOWN_ERROR
    console.error(`${LoopOrchestratorLog.AgentFailed}${agentName}${LoopOrchestratorLog.AgentFailedSuffix}`, errorMsg)

    const lastAgent = nextAgentFromAgentNode(agentName)
    return {
      errors: [errorMsg],
      nextAgent: NEXT_AGENT_END,
      lastAgent,
      messages: [
        new AIMessage({
          content: `${LoopOrchestratorLog.ErrorInAgent}${agentName}${LoopOrchestratorLog.ErrorRetrySuffix}${errorMsg}${LoopOrchestratorLog.ErrorRetryPrompt}`,
          name: agentName,
        }),
      ],
    }
  }
}

function resolveNode(next: NextAgent | typeof NEXT_AGENT_END): AgentNode | null {
  if (next === NEXT_AGENT_END || !next) return null
  if (isRegisteredAgent(next)) return next
  console.warn(`${LoopOrchestratorLog.UnknownNextAgent}${next}`)
  return null
}

function isLangChainAIMessage(msg: unknown): boolean {
  if (msg instanceof AIMessage) return true
  if (typeof msg === 'object' && msg !== null && LangChainMessageWire.GetType in msg) {
    const getType = Reflect.get(msg, LangChainMessageWire.GetType)
    return typeof getType === 'function' && getType() === ChatMessageRole.Ai
  }
  return false
}

function displayNameForNode(nodeName: string): string {
  for (const agent of Object.values(LoopAgentNode)) {
    if (agent === nodeName) {
      return LOOP_AGENT_DISPLAY_NAMES[agent]
    }
  }
  return nodeName
}

function emitNodeOutput(
  nodeName: string,
  output: Partial<LoopCreatorState>,
  onEvent: (event: StreamEvent) => void,
) {
  const nodeEvent = {
    type: LoopOrchestratorEventType.Node,
    node: nodeName,
    agent: displayNameForNode(nodeName),
    timestamp: Date.now(),
  }
  onEvent(nodeEvent)
  onEvent({
    type: LoopOrchestratorEventType.Token,
    token: `${JSON.stringify(nodeEvent, null, 2)}\n`,
    timestamp: Date.now(),
  })

  if (output.messages) {
    for (const msg of output.messages) {
      if (!isLangChainAIMessage(msg)) continue

      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      const msgEvent = {
        type: LoopOrchestratorEventType.Message,
        node: nodeName,
        agent: nodeName,
        message: {
          type: LoopOrchestratorMessageType.Ai,
          content,
          sender: nodeName,
          name: nodeName,
        },
        timestamp: Date.now(),
      }
      onEvent(msgEvent)
      onEvent({
        type: LoopOrchestratorEventType.Token,
        token: `${JSON.stringify(msgEvent, null, 2)}\n`,
        timestamp: Date.now(),
      })
    }
  }

  if (output.pendingActions) {
    for (const action of output.pendingActions) {
      const actionEvent = {
        type: LoopOrchestratorEventType.Action,
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
        type: LoopOrchestratorEventType.Token,
        token: `${JSON.stringify(actionEvent, null, 2)}\n`,
        timestamp: Date.now(),
      })
    }
  }

  if (output.pendingQuestions && output.pendingQuestions.length > 0) {
    onEvent({
      type: LoopOrchestratorEventType.Questions,
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
  let currentNode: AgentNode = LoopAgentNode.Supervisor

  console.log(LoopOrchestratorLog.StartingRun)

  while (true) {
    const output = await invokeAgent(currentNode, state)
    state = { ...state, ...output }
    emitNodeOutput(currentNode, output, onEvent)

    const next = routeToNextAgent(state)
    if (next === NEXT_AGENT_END) break

    const resolved = resolveNode(next)
    if (!resolved) break

    currentNode = resolved
  }

  return state
}
