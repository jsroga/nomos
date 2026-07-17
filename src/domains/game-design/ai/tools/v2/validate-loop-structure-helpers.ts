import type { GameLoop, GameMechanic } from '../../../core/schemas'
import {
  LogicToolCopy,
  ValidateLoopIssueType,
  ValidateLoopSeverity,
} from '../../constants/logic-tool-wire'
import type { ValidateLoopStructureIssue } from '../../constants/logic-tool-schemas'

export function buildAdjacencyList(loop: GameLoop): Map<string, string[]> {
  const adjacencyList = new Map<string, string[]>()
  for (const node of loop.nodes) {
    adjacencyList.set(node.id, [])
  }
  for (const edge of loop.edges) {
    const existing = adjacencyList.get(edge.sourceNodeId) ?? []
    existing.push(edge.targetNodeId)
    adjacencyList.set(edge.sourceNodeId, existing)
  }
  return adjacencyList
}

export function detectAnyCycle(
  nodes: GameLoop['nodes'],
  adjacencyList: Map<string, string[]>
): boolean {
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId)
    recursionStack.add(nodeId)

    const neighbors = adjacencyList.get(nodeId) ?? []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) return true
      } else if (recursionStack.has(neighbor)) {
        return true
      }
    }

    recursionStack.delete(nodeId)
    return false
  }

  for (const node of nodes) {
    if (!visited.has(node.id) && hasCycle(node.id)) {
      return true
    }
  }
  return false
}

export function collectOrphanNodeIssues(loop: GameLoop): ValidateLoopStructureIssue[] {
  const issues: ValidateLoopStructureIssue[] = []
  const connectedNodes = new Set<string>()
  for (const edge of loop.edges) {
    connectedNodes.add(edge.sourceNodeId)
    connectedNodes.add(edge.targetNodeId)
  }

  for (const node of loop.nodes) {
    if (!connectedNodes.has(node.id) && loop.nodes.length > 1) {
      issues.push({
        type: ValidateLoopIssueType.OrphanNode,
        severity: ValidateLoopSeverity.Warning,
        description: `Node "${node.label ?? node.id}" has no connections`,
        affectedNodeIds: [node.id],
      })
    }
  }

  return issues
}

export function collectMissingMechanicIssues(
  loop: GameLoop,
  mechanicIds: Set<string>
): ValidateLoopStructureIssue[] {
  const issues: ValidateLoopStructureIssue[] = []
  for (const node of loop.nodes) {
    if (!mechanicIds.has(node.mechanicId)) {
      issues.push({
        type: ValidateLoopIssueType.MissingMechanic,
        severity: ValidateLoopSeverity.Error,
        description: `Node "${node.label ?? node.id}" references non-existent mechanic ${node.mechanicId}`,
        affectedNodeIds: [node.id],
      })
    }
  }
  return issues
}

export function collectInvalidEdgeIssues(
  loop: GameLoop,
  nodeIds: Set<string>
): ValidateLoopStructureIssue[] {
  const issues: ValidateLoopStructureIssue[] = []
  for (const edge of loop.edges) {
    if (!nodeIds.has(edge.sourceNodeId)) {
      issues.push({
        type: ValidateLoopIssueType.InvalidEdge,
        severity: ValidateLoopSeverity.Error,
        description: `Edge ${edge.id} references non-existent source node ${edge.sourceNodeId}`,
      })
    }
    if (!nodeIds.has(edge.targetNodeId)) {
      issues.push({
        type: ValidateLoopIssueType.InvalidEdge,
        severity: ValidateLoopSeverity.Error,
        description: `Edge ${edge.id} references non-existent target node ${edge.targetNodeId}`,
      })
    }
  }
  return issues
}

export function collectCycleBreakIssue(
  loop: GameLoop,
  cycleDetected: boolean
): ValidateLoopStructureIssue | undefined {
  if (!cycleDetected && loop.nodes.length > 1) {
    return {
      type: ValidateLoopIssueType.CycleBreak,
      severity: ValidateLoopSeverity.Warning,
      description: LogicToolCopy.NoCycleDetected,
    }
  }
  return undefined
}

export function validateLoopStructure(
  loop: GameLoop,
  mechanics: GameMechanic[]
): { issues: ValidateLoopStructureIssue[]; cycleDetected: boolean } {
  const nodeIds = new Set(loop.nodes.map((node: GameLoop['nodes'][number]) => node.id))
  const mechanicIds = new Set(mechanics.map(mechanic => mechanic.id))
  const adjacencyList = buildAdjacencyList(loop)
  const cycleDetected = detectAnyCycle(loop.nodes, adjacencyList)

  const issues = [
    ...collectOrphanNodeIssues(loop),
    ...collectMissingMechanicIssues(loop, mechanicIds),
    ...collectInvalidEdgeIssues(loop, nodeIds),
  ]

  const cycleIssue = collectCycleBreakIssue(loop, cycleDetected)
  if (cycleIssue) issues.push(cycleIssue)

  return { issues, cycleDetected }
}
