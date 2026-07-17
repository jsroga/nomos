import { Edge, Node } from '@xyflow/react'
import type { WireAgentAction } from '@/shared/agent-kernel/action-wire'
import { LoopLayoutAgentAction } from '../constants/loop-creator-layout'
import { Suggestion } from '../components/SuggestionPanel'
import { suggestionFromAction } from './loop-agent-action-suggestions'

export interface LoopAgentActionContext {
  nodes: Node[]
  edges: Edge[]
  createSuggestionId: () => string
}

export interface LoopAgentActionEffects {
  suggestions: Suggestion[]
  openMarketAnalysis?: boolean
  unknownActionType?: string
}

const SUGGESTION_ACTIONS = new Set<string>([
  LoopLayoutAgentAction.AddMechanic,
  LoopLayoutAgentAction.AddConnection,
  LoopLayoutAgentAction.AddEdge,
  LoopLayoutAgentAction.AddNode,
  LoopLayoutAgentAction.RemoveNode,
  LoopLayoutAgentAction.RemoveAllNodes,
  LoopLayoutAgentAction.ModifyNode,
  LoopLayoutAgentAction.RemoveEdge,
])

export function mapLoopAgentActionToEffects(
  action: WireAgentAction,
  context: LoopAgentActionContext,
): LoopAgentActionEffects {
  if (action.type === LoopLayoutAgentAction.MarketAnalysisComplete) {
    return { suggestions: [], openMarketAnalysis: true }
  }

  const suggestion = suggestionFromAction(action, context)
  if (suggestion) {
    return { suggestions: [suggestion] }
  }

  if (SUGGESTION_ACTIONS.has(action.type)) {
    return { suggestions: [] }
  }

  return { suggestions: [], unknownActionType: action.type }
}
