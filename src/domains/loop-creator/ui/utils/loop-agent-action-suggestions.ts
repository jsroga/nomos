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

export interface SuggestionContext {
  nodes: Node[]
  edges: Edge[]
  createSuggestionId: () => string
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

export function suggestionFromAction(
  action: WireAgentAction,
  context: SuggestionContext,
): Suggestion | null {
  switch (action.type) {
    case LoopLayoutAgentAction.AddMechanic: {
      const mechanic = parseMechanicPayload(action.payload)
      return mechanic ? mechanicSuggestion(mechanic, context.createSuggestionId) : null
    }
    case LoopLayoutAgentAction.AddConnection:
    case LoopLayoutAgentAction.AddEdge: {
      const conn = parseConnectionPayload(action.payload)
      return conn ? connectionSuggestion(conn, context.createSuggestionId) : null
    }
    case LoopLayoutAgentAction.AddNode: {
      const node = parseAddNodePayload(action.payload)
      return node ? addNodeSuggestion(node, context.createSuggestionId) : null
    }
    case LoopLayoutAgentAction.RemoveNode: {
      const payload = parseIdPayload(action.payload)
      if (!payload) return null
      return {
        id: context.createSuggestionId(),
        type: LoopSuggestionKind.RemoveNode,
        description: `Remove "${nodeLabelFromId(context.nodes, payload.id)}" node`,
        payload: { id: payload.id },
      }
    }
    case LoopLayoutAgentAction.RemoveAllNodes:
      return {
        id: context.createSuggestionId(),
        type: LoopSuggestionKind.RemoveAllNodes,
        description: `Clear all nodes and edges from canvas (${context.nodes.length} nodes, ${context.edges.length} edges)`,
        payload: {},
      }
    case LoopLayoutAgentAction.ModifyNode: {
      const modify = parseModifyNodePayload(action.payload)
      if (!modify) return null
      return {
        id: context.createSuggestionId(),
        type: LoopSuggestionKind.ModifyNode,
        description: `Update "${nodeLabelFromId(context.nodes, modify.id)}": ${Object.keys(modify.updates).join(LOOP_MODIFY_NODE_JOIN)}`,
        payload: { id: modify.id, updates: modify.updates },
      }
    }
    case LoopLayoutAgentAction.RemoveEdge: {
      const payload = parseIdPayload(action.payload)
      if (!payload) return null
      return {
        id: context.createSuggestionId(),
        type: LoopSuggestionKind.RemoveEdge,
        description: `Remove connection "${payload.id}"`,
        payload: { id: payload.id },
      }
    }
    default:
      return null
  }
}
