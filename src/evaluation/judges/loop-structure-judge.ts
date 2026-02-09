/**
 * Loop Structure Judge
 *
 * Evaluates the structural integrity of game loops.
 * Checks for:
 * - Valid loop types
 * - Node/edge connectivity
 * - Cycle presence (game loops should cycle)
 * - No orphan nodes
 * - No dead ends
 * - Psychological hook clarity
 */

import { BaseLLMJudge, JudgeResult } from './base-judge'
import { ScoreName } from '../engine/scores'

interface LoopNode {
  id: string
  mechanicId?: string
  label?: string
}

interface LoopEdge {
  id: string
  sourceNodeId: string
  targetNodeId: string
}

interface GameLoop {
  id?: string
  name?: string
  type?: string
  nodes?: LoopNode[]
  edges?: LoopEdge[]
  mechanics?: string[]
  duration?: {
    min?: number
    max?: number
    typical?: number
    unit?: string
  }
  psychologicalHook?: string
  playerExperience?: string
}

interface LoopEvalInput {
  loops?: GameLoop[]
  genre?: string
  targetAudience?: string
}

interface LoopEvalExpected {
  shouldCreateLoop?: boolean
  minLoopCount?: number
  expectedLoopType?: string
}

const VALID_LOOP_TYPES = [
  'compulsion',
  'core',
  'meta',
  'session',
  'social',
  'monetization',
  'progression',
]

export class LoopStructureJudge extends BaseLLMJudge {
  name = 'LoopStructureJudge'
  scoreName = ScoreName.LOOP_STRUCTURE

  async evaluate(
    input: LoopEvalInput,
    output: any,
    expected?: LoopEvalExpected
  ): Promise<JudgeResult> {
    const loops = this.extractLoops(output)
    const issues: string[] = []
    let totalScore = 0
    let maxScore = 0

    // If we expected loops but got none
    if (expected?.shouldCreateLoop && loops.length === 0) {
      return {
        score: 0,
        scoreName: this.scoreName,
        reason: 'Expected loops to be created, but none were found',
        metadata: { loopCount: 0 },
      }
    }

    // Check minimum count
    if (expected?.minLoopCount && loops.length < expected.minLoopCount) {
      issues.push(`Expected at least ${expected.minLoopCount} loops, got ${loops.length}`)
    }

    // Evaluate each loop
    for (const loop of loops) {
      const { score, issueList } = this.evaluateLoop(loop)
      totalScore += score
      maxScore += 1
      issues.push(...issueList.map(i => `[${loop.name || 'Unknown Loop'}] ${i}`))
    }

    // Check expected loop type
    if (expected?.expectedLoopType) {
      const foundTypes = loops.map(l => l.type?.toLowerCase()).filter(Boolean)
      if (!foundTypes.some(t => t?.includes(expected.expectedLoopType!.toLowerCase()))) {
        issues.push(`Missing expected loop type: ${expected.expectedLoopType}`)
        totalScore -= 0.2
      }
    }

    const finalScore = maxScore > 0 ? this.normalizeScore(totalScore / maxScore) : 1

    return {
      score: finalScore,
      scoreName: this.scoreName,
      reason:
        issues.length > 0
          ? `Found ${issues.length} issues: ${issues.slice(0, 3).join('; ')}${issues.length > 3 ? '...' : ''}`
          : `All ${loops.length} loops have valid structure`,
      metadata: {
        loopCount: loops.length,
        issueCount: issues.length,
        issues: issues.slice(0, 10),
      },
    }
  }

  private extractLoops(output: any): GameLoop[] {
    if (!output) return []

    // Direct array of loops
    if (Array.isArray(output)) {
      return output.filter(l => l && typeof l === 'object' && (l.name || l.type || l.nodes))
    }

    // Object with loops property
    if (output.loops && Array.isArray(output.loops)) {
      return output.loops
    }

    // Payload with loops
    if (output.payload?.loops && Array.isArray(output.payload.loops)) {
      return output.payload.loops
    }

    // coreLoop object (from identify_core_loop tool)
    if (output.coreLoop) {
      return [output.coreLoop]
    }

    // Single loop object
    if (output.name && output.type) {
      return [output]
    }

    return []
  }

  private evaluateLoop(loop: GameLoop): { score: number; issueList: string[] } {
    const issues: string[] = []
    let score = 1

    // Required fields
    if (!loop.name || loop.name.trim() === '') {
      issues.push('Missing loop name')
      score -= 0.2
    }

    // Valid type
    if (loop.type) {
      const typeLC = loop.type.toLowerCase()
      if (!VALID_LOOP_TYPES.some(t => typeLC.includes(t))) {
        issues.push(`Unknown loop type: ${loop.type}`)
        score -= 0.1
      }
    } else {
      issues.push('Missing loop type')
      score -= 0.2
    }

    // Node/edge structure (if provided)
    if (loop.nodes && loop.edges) {
      const structureResult = this.evaluateStructure(loop.nodes, loop.edges)
      score -= structureResult.penalty
      issues.push(...structureResult.issues)
    }

    // Duration makes sense
    if (loop.duration) {
      if (loop.duration.min !== undefined && loop.duration.max !== undefined) {
        if (loop.duration.min > loop.duration.max) {
          issues.push('Duration min > max')
          score -= 0.1
        }
      }
      if (loop.duration.typical !== undefined) {
        if (loop.duration.min !== undefined && loop.duration.typical < loop.duration.min) {
          issues.push('Typical duration < min')
          score -= 0.05
        }
        if (loop.duration.max !== undefined && loop.duration.typical > loop.duration.max) {
          issues.push('Typical duration > max')
          score -= 0.05
        }
      }
    }

    // Psychological hook (important for engagement)
    if (!loop.psychologicalHook && !loop.playerExperience) {
      issues.push('No psychological hook or player experience defined')
      score -= 0.1
    } else if (loop.psychologicalHook && loop.psychologicalHook.length < 10) {
      issues.push('Psychological hook too vague')
      score -= 0.05
    }

    // Mechanics connection
    if (loop.mechanics && loop.mechanics.length === 0) {
      issues.push('Loop has no mechanics')
      score -= 0.2
    }

    return { score: Math.max(0, score), issueList: issues }
  }

  private evaluateStructure(
    nodes: LoopNode[],
    edges: LoopEdge[]
  ): { penalty: number; issues: string[] } {
    const issues: string[] = []
    let penalty = 0

    if (nodes.length === 0) {
      issues.push('No nodes in loop')
      return { penalty: 0.3, issues }
    }

    // Build adjacency list
    const nodeIds = new Set(nodes.map(n => n.id))
    const outgoing = new Map<string, Set<string>>()
    const incoming = new Map<string, Set<string>>()

    for (const node of nodes) {
      outgoing.set(node.id, new Set())
      incoming.set(node.id, new Set())
    }

    for (const edge of edges) {
      // Validate edge references
      if (!nodeIds.has(edge.sourceNodeId)) {
        issues.push(`Edge references unknown source: ${edge.sourceNodeId}`)
        penalty += 0.1
        continue
      }
      if (!nodeIds.has(edge.targetNodeId)) {
        issues.push(`Edge references unknown target: ${edge.targetNodeId}`)
        penalty += 0.1
        continue
      }

      outgoing.get(edge.sourceNodeId)!.add(edge.targetNodeId)
      incoming.get(edge.targetNodeId)!.add(edge.sourceNodeId)
    }

    // Check for orphan nodes (no connections at all)
    if (nodes.length > 1) {
      for (const node of nodes) {
        const hasOutgoing = (outgoing.get(node.id)?.size || 0) > 0
        const hasIncoming = (incoming.get(node.id)?.size || 0) > 0
        if (!hasOutgoing && !hasIncoming) {
          issues.push(`Orphan node: ${node.label || node.id}`)
          penalty += 0.15
        }
      }
    }

    // Check for dead ends (no outgoing edges)
    for (const node of nodes) {
      if ((outgoing.get(node.id)?.size || 0) === 0 && (incoming.get(node.id)?.size || 0) > 0) {
        issues.push(`Dead end node: ${node.label || node.id}`)
        penalty += 0.1
      }
    }

    // Check for cycle (game loops should cycle back)
    if (nodes.length > 1 && !this.hasCycle(nodes, outgoing)) {
      issues.push('No cycle detected - game loops should cycle')
      penalty += 0.2
    }

    return { penalty: Math.min(penalty, 0.5), issues }
  }

  private hasCycle(nodes: LoopNode[], outgoing: Map<string, Set<string>>): boolean {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId)
      recursionStack.add(nodeId)

      const neighbors = Array.from(outgoing.get(nodeId) || [])
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true
        } else if (recursionStack.has(neighbor)) {
          return true // Found back edge = cycle
        }
      }

      recursionStack.delete(nodeId)
      return false
    }

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true
      }
    }

    return false
  }
}
