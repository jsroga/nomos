import { CharacterWebEdge, CharacterWebNode } from './types'
import { CharacterWebEdgeStyle } from './constants/character-web'

export function decorateCharacterWebNodes(
  nodes: CharacterWebNode[],
  selectedNodeId: string | null,
  adjacencyByNodeId: Map<string, Set<string>>
): CharacterWebNode[] {
  if (!selectedNodeId) return nodes

  const connectedNodeIds = adjacencyByNodeId.get(selectedNodeId) ?? new Set<string>()

  return nodes.map(node => {
    const isSelected = node.id === selectedNodeId
    const isConnected = isSelected || connectedNodeIds.has(node.id)
    return {
      ...node,
      data: {
        ...node.data,
        isHighlighted: !isSelected && connectedNodeIds.has(node.id),
        isSelected,
      },
      style: {
        ...node.style,
        opacity: isConnected ? 1 : 0.15,
        transition: CharacterWebEdgeStyle.OpacityTransition,
      },
    }
  })
}

export function decorateCharacterWebEdges(
  edges: CharacterWebEdge[],
  selectedNodeId: string | null
): CharacterWebEdge[] {
  if (!selectedNodeId) {
    return edges.map(edge => ({
      ...edge,
      style: {
        ...edge.style,
        opacity: Math.max(0.3, edge.data?.strength || 0.5),
        transition: CharacterWebEdgeStyle.OpacityTransition,
      },
      labelStyle: { ...(edge.labelStyle ?? {}), opacity: 1 },
    }))
  }

  return edges.map(edge => {
    const isConnected = edge.source === selectedNodeId || edge.target === selectedNodeId
    return {
      ...edge,
      style: {
        ...edge.style,
        opacity: isConnected ? 1 : 0.08,
        transition: CharacterWebEdgeStyle.OpacityTransition,
      },
      labelStyle: {
        ...(edge.labelStyle ?? {}),
        opacity: isConnected ? 1 : 0,
      },
    }
  })
}
