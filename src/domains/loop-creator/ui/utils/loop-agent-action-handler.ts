import { Edge, Node } from '@xyflow/react'
import type { WireAgentAction } from '@/shared/agent-kernel/action-wire'
import { readRowString, recordFromJson } from '@/shared/data/json-guards'
import {
  parseAddNodePayload,
  parseConnectionPayload,
  parseIdPayload,
  parseMechanicPayload,
  parseModifyNodePayload,
} from '@/domains/loop-creator/core/loop-agent-action-wire'
import { LoopNodeType } from '@/domains/loop-creator/constants/custom-nodes'
import { Suggestion } from '../components/SuggestionPanel'
import {
  LoopLayoutAgentAction,
  LoopFlowNodeDataField,
  LoopMechanicKind,
  LoopSuggestionKind,
  LOOP_MECHANIC_LABEL_SUFFIX,
  LOOP_MODIFY_NODE_JOIN,
} from '../constants/loop-creator-layout'

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

function nodeLabelFromId(nodes: Node[], nodeId: string): string {
  const node = nodes.find(entry => entry.id === nodeId)
  const data = recordFromJson(node?.data)
  const label = readRowString(data, LoopFlowNodeDataField.Label)
  if (label) return label
  return nodeId
}

function mechanicSuggestion(
  mechanic: NonNullable<ReturnType<typeof parseMechanicPayload>>,
  createSuggestionId: () => string,
): Suggestion {
  return {
    id: createSuggestionId(),
    type: LoopSuggestionKind.AddNode,
    description: `Add "${mechanic.name}" ${mechanic.type || LOOP_MECHANIC_LABEL_SUFFIX} node`,
    payload: {
      id: mechanic.id || `mechanic-${Date.now()}`,
      label: mechanic.name,
      description: mechanic.description || '',
      nodeType:
        mechanic.type === LoopMechanicKind.Core ? LoopNodeType.Challenge : LoopNodeType.Action,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
    },
  }
}

function connectionSuggestion(
  conn: NonNullable<ReturnType<typeof parseConnectionPayload>>,
  createSuggestionId: () => string,
): Suggestion {
  return {
    id: createSuggestionId(),
    type: LoopSuggestionKind.AddEdge,
    description: `Connect "${conn.sourceLabel || conn.source}" → "${conn.targetLabel || conn.target}"${conn.label ? ` (${conn.label})` : ''}`,
    payload: {
      id: conn.id || `edge-${Date.now()}`,
      source: conn.source,
      target: conn.target,
      label: conn.label,
    },
  }
}

function addNodeSuggestion(
  node: NonNullable<ReturnType<typeof parseAddNodePayload>>,
  createSuggestionId: () => string,
): Suggestion {
  return {
    id: createSuggestionId(),
    type: LoopSuggestionKind.AddNode,
    description: `Add "${node.label}" node`,
    payload: {
      id: node.id || `node-${Date.now()}`,
      label: node.label,
      description: node.description || '',
      nodeType: node.nodeType || LoopNodeType.Action,
      position: node.position || { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
    },
  }
}

export function mapLoopAgentActionToEffects(
  action: WireAgentAction,
  context: LoopAgentActionContext,
): LoopAgentActionEffects {
  const suggestions: Suggestion[] = []

  switch (action.type) {
    case LoopLayoutAgentAction.AddMechanic: {
      const mechanic = parseMechanicPayload(action.payload)
      if (mechanic) suggestions.push(mechanicSuggestion(mechanic, context.createSuggestionId))
      break
    }
    case LoopLayoutAgentAction.AddConnection:
    case LoopLayoutAgentAction.AddEdge: {
      const conn = parseConnectionPayload(action.payload)
      if (conn) suggestions.push(connectionSuggestion(conn, context.createSuggestionId))
      break
    }
    case LoopLayoutAgentAction.AddNode: {
      const node = parseAddNodePayload(action.payload)
      if (node) suggestions.push(addNodeSuggestion(node, context.createSuggestionId))
      break
    }
    case LoopLayoutAgentAction.RemoveNode: {
      const payload = parseIdPayload(action.payload)
      if (!payload) break
      suggestions.push({
        id: context.createSuggestionId(),
        type: LoopSuggestionKind.RemoveNode,
        description: `Remove "${nodeLabelFromId(context.nodes, payload.id)}" node`,
        payload: { id: payload.id },
      })
      break
    }
    case LoopLayoutAgentAction.RemoveAllNodes: {
      suggestions.push({
        id: context.createSuggestionId(),
        type: LoopSuggestionKind.RemoveAllNodes,
        description: `Clear all nodes and edges from canvas (${context.nodes.length} nodes, ${context.edges.length} edges)`,
        payload: {},
      })
      break
    }
    case LoopLayoutAgentAction.ModifyNode: {
      const modify = parseModifyNodePayload(action.payload)
      if (!modify) break
      suggestions.push({
        id: context.createSuggestionId(),
        type: LoopSuggestionKind.ModifyNode,
        description: `Update "${nodeLabelFromId(context.nodes, modify.id)}": ${Object.keys(modify.updates).join(LOOP_MODIFY_NODE_JOIN)}`,
        payload: { id: modify.id, updates: modify.updates },
      })
      break
    }
    case LoopLayoutAgentAction.RemoveEdge: {
      const payload = parseIdPayload(action.payload)
      if (!payload) break
      suggestions.push({
        id: context.createSuggestionId(),
        type: LoopSuggestionKind.RemoveEdge,
        description: `Remove connection "${payload.id}"`,
        payload: { id: payload.id },
      })
      break
    }
    case LoopLayoutAgentAction.MarketAnalysisComplete:
      return { suggestions, openMarketAnalysis: true }
    default:
      return { suggestions, unknownActionType: action.type }
  }

  return { suggestions }
}
