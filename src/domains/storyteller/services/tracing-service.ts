/**
 * Tracing Service for Storyteller Module
 *
 * Provides observability through LangSmith integration.
 * Wraps agent functions with tracing and logs decisions for audit.
 */

import { WritersRoomState } from '../graph/state'
import { ragService } from './rag-service'

// Trace metadata for each agent invocation
export interface TraceMetadata {
  agentName: string
  phase: string
  iteration: number
  projectId: string
  beatId?: string
  confidence?: number
  decision?: string
  duration?: number
}

// Decision audit entry
export interface DecisionAudit {
  timestamp: Date
  agentName: string
  decision: string
  reasoning: string
  confidence: number
  beatLogline?: string
  wasAccepted: boolean
}

// In-memory audit log (would be persisted in production)
const auditLog: DecisionAudit[] = []

/**
 * Create a traceable wrapper for an agent function
 */
export function createTraceableAgent<
  T extends (state: WritersRoomState) => Promise<Partial<WritersRoomState>>,
>(agentFn: T, agentName: string): T {
  const wrappedFn = async (state: WritersRoomState): Promise<Partial<WritersRoomState>> => {
    const startTime = Date.now()
    const traceId = `${agentName}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    // Log trace start
    console.log(`[TRACE:${traceId}] ${agentName} started`, {
      phase: state.currentPhase,
      iteration: state.phaseIterations,
      projectId: state.projectId,
      currentBeat: state.currentBeat?.logline?.slice(0, 50),
    })

    try {
      // Execute the agent
      const result = await agentFn(state)

      const duration = Date.now() - startTime

      // Extract metrics from result
      const lastMessage = result.messages?.[0]
      const confidence = (lastMessage as any)?.confidence
      const decision =
        result.lastAction || (lastMessage as any)?.decision || (lastMessage as any)?.verdict

      // Log trace completion
      console.log(`[TRACE:${traceId}] ${agentName} completed`, {
        duration: `${duration}ms`,
        confidence,
        decision,
        messageLength: typeof lastMessage?.content === 'string' ? lastMessage.content.length : 0,
      })

      // Track decision in audit log
      if (decision && state.currentBeat) {
        trackDecision({
          timestamp: new Date(),
          agentName,
          decision,
          reasoning:
            typeof lastMessage?.content === 'string' ? lastMessage.content.slice(0, 500) : '',
          confidence: confidence || 0.5,
          beatLogline: state.currentBeat.logline,
          wasAccepted: decision === 'APPROVED' || decision === 'PASS',
        })
      }

      // Store in RAG for future reference (async, don't await)
      if (state.projectId && decision && state.currentBeat) {
        storeDecisionAsync(
          state.projectId,
          agentName,
          decision,
          state.currentBeat.logline,
          lastMessage?.content
        )
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime

      console.error(`[TRACE:${traceId}] ${agentName} failed`, {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      throw error
    }
  }

  return wrappedFn as T
}

/**
 * Track a decision in the audit log
 */
function trackDecision(entry: DecisionAudit): void {
  auditLog.push(entry)

  // Keep only last 1000 entries in memory
  if (auditLog.length > 1000) {
    auditLog.shift()
  }
}

/**
 * Store decision in RAG (fire and forget)
 */
async function storeDecisionAsync(
  projectId: string,
  agentName: string,
  decision: string,
  beatLogline: string,
  reasoning: any
): Promise<void> {
  try {
    const reasoningStr = typeof reasoning === 'string' ? reasoning : JSON.stringify(reasoning)

    if (decision === 'APPROVED' || decision === 'PASS') {
      await ragService.storeBeatDecision(
        projectId,
        beatLogline,
        'approved',
        reasoningStr.slice(0, 1000),
        agentName
      )
    } else if (decision === 'REJECTED' || decision === 'CHALLENGE') {
      await ragService.storeBeatDecision(
        projectId,
        beatLogline,
        'rejected',
        reasoningStr.slice(0, 1000),
        agentName
      )
    }
  } catch (error) {
    console.warn('Failed to store decision in RAG:', error)
  }
}

/**
 * Get the audit log
 */
export function getAuditLog(): DecisionAudit[] {
  return [...auditLog]
}

/**
 * Get audit entries for a specific agent
 */
export function getAgentAudit(agentName: string): DecisionAudit[] {
  return auditLog.filter(entry => entry.agentName === agentName)
}

/**
 * Get acceptance rate for an agent
 */
export function getAgentAcceptanceRate(agentName: string): number {
  const agentEntries = getAgentAudit(agentName)
  if (agentEntries.length === 0) return 0

  const accepted = agentEntries.filter(e => e.wasAccepted).length
  return accepted / agentEntries.length
}

/**
 * Get average confidence for an agent
 */
export function getAgentAverageConfidence(agentName: string): number {
  const agentEntries = getAgentAudit(agentName)
  if (agentEntries.length === 0) return 0

  const totalConfidence = agentEntries.reduce((sum, e) => sum + e.confidence, 0)
  return totalConfidence / agentEntries.length
}

/**
 * Get observability metrics
 */
export function getObservabilityMetrics(): {
  totalDecisions: number
  acceptanceRate: number
  averageConfidence: number
  agentStats: Record<string, { decisions: number; acceptanceRate: number; avgConfidence: number }>
} {
  const agentNames = [...new Set(auditLog.map(e => e.agentName))]

  const agentStats: Record<
    string,
    { decisions: number; acceptanceRate: number; avgConfidence: number }
  > = {}

  for (const agentName of agentNames) {
    const entries = getAgentAudit(agentName)
    agentStats[agentName] = {
      decisions: entries.length,
      acceptanceRate: getAgentAcceptanceRate(agentName),
      avgConfidence: getAgentAverageConfidence(agentName),
    }
  }

  const totalAccepted = auditLog.filter(e => e.wasAccepted).length
  const totalConfidence = auditLog.reduce((sum, e) => sum + e.confidence, 0)

  return {
    totalDecisions: auditLog.length,
    acceptanceRate: auditLog.length > 0 ? totalAccepted / auditLog.length : 0,
    averageConfidence: auditLog.length > 0 ? totalConfidence / auditLog.length : 0,
    agentStats,
  }
}

/**
 * Clear the audit log
 */
export function clearAuditLog(): void {
  auditLog.length = 0
}

/**
 * Export audit log to JSON
 */
export function exportAuditLog(): string {
  return JSON.stringify(auditLog, null, 2)
}
