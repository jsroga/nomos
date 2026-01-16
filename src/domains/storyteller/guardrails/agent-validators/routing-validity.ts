/**
 * Routing Validity Validator
 *
 * Validates that the supervisor routes requests to phase-appropriate agents
 * and follows proper delegation patterns.
 */

import { ValidationResult, Validator } from '../runnable-guard'
import { WritersRoomState } from '../../graph/state'
import { GuardrailIssue } from '../types'

// ============================================
// TYPES
// ============================================

type ProjectPhase = 'premise' | 'outline' | 'script' | 'unknown'

interface RoutingDecision {
  targetAgent: string
  reason?: string
}

interface AgentCapability {
  name: string
  phases: ProjectPhase[]
  capabilities: string[]
  exclusions?: string[] // Things this agent should NOT handle
}

// ============================================
// AGENT CAPABILITIES
// ============================================

const AGENT_CAPABILITIES: AgentCapability[] = [
  {
    name: 'PremiseArchitect',
    phases: ['premise', 'outline'],
    capabilities: [
      'world-building',
      'character creation',
      'series rules',
      'setting',
      'tone',
      'genre',
      'themes',
      'premise',
    ],
    exclusions: ['dialogue', 'scene writing', 'beat writing'],
  },
  {
    name: 'PlotArchitect',
    phases: ['outline', 'script'],
    capabilities: [
      'story structure',
      'episode arc',
      'beat sequence',
      'plot points',
      'act breaks',
      'conflict',
      'stakes',
    ],
    exclusions: ['character backstory', 'world rules'],
  },
  {
    name: 'Writer',
    phases: ['script'],
    capabilities: [
      'dialogue',
      'scene writing',
      'script',
      'screenplay',
      'action lines',
      'descriptions',
    ],
    exclusions: ['plot restructuring', 'character creation'],
  },
  {
    name: 'CharacterPsychology',
    phases: ['premise', 'outline', 'script'],
    capabilities: [
      'character motivation',
      'psychology',
      'voice',
      'backstory',
      'character arc',
      'relationships',
      'personality',
    ],
    exclusions: ['plot structure', 'world-building'],
  },
  {
    name: 'DevilsAdvocate',
    phases: ['premise', 'outline', 'script'],
    capabilities: [
      'review',
      'critique',
      'feedback',
      'plot holes',
      'consistency check',
      'quality review',
    ],
    exclusions: ['content creation', 'writing'],
  },
  {
    name: 'ConsequenceTracker',
    phases: ['outline', 'script'],
    capabilities: ['continuity', 'consequences', 'ripple effects', 'timeline', 'consistency'],
    exclusions: ['creation', 'writing'],
  },
  {
    name: 'ScriptEditor',
    phases: ['script'],
    capabilities: ['script polish', 'editing', 'formatting', 'dialogue polish', 'tightening'],
    exclusions: ['plot changes', 'character changes'],
  },
]

// Keywords that indicate different request types
const REQUEST_TYPE_KEYWORDS: Record<string, string[]> = {
  'world-building': ['world', 'setting', 'universe', 'rules', 'magic system', 'technology'],
  'character creation': ['create character', 'new character', 'character named', 'introduce'],
  'story structure': ['plot', 'structure', 'arc', 'episode', 'season', 'beats', 'outline'],
  dialogue: ['dialogue', 'conversation', 'say', 'speak', 'talk'],
  'scene writing': ['write scene', 'scene where', 'scene with', 'script'],
  review: ['review', 'critique', 'feedback', 'check', 'evaluate', 'assess'],
  'character motivation': ['motivation', 'why would', 'character arc', 'psychology'],
  continuity: ['continuity', 'timeline', 'consequence', 'effect', 'remember'],
}

// ============================================
// ROUTING DETECTION
// ============================================

function detectRoutingDecision(content: string): RoutingDecision | null {
  // Pattern: "Delegating to X" or "Routing to X"
  const delegatePattern = /(?:delegating|routing|forwarding|sending)\s+to\s+(\w+)/i
  const match = content.match(delegatePattern)

  if (match) {
    return {
      targetAgent: match[1],
    }
  }

  // Pattern: Agent name mentioned as action
  const agentMentionPattern =
    /(?:ask|consult|use|invoke)\s+(\w+Architect|\w+Psychology|Writer|DevilsAdvocate|ConsequenceTracker|ScriptEditor)/i
  const agentMatch = content.match(agentMentionPattern)

  if (agentMatch) {
    return {
      targetAgent: agentMatch[1],
    }
  }

  return null
}

function detectRequestType(content: string): string[] {
  const types: string[] = []
  const contentLower = content.toLowerCase()

  for (const [type, keywords] of Object.entries(REQUEST_TYPE_KEYWORDS)) {
    if (keywords.some(kw => contentLower.includes(kw))) {
      types.push(type)
    }
  }

  return types
}

function detectPhase(state: Partial<WritersRoomState>): ProjectPhase {
  // Check state for phase indicators
  // This would need to be connected to actual state
  // For now, return unknown
  return 'unknown'
}

// ============================================
// VALIDATION LOGIC
// ============================================

function validateRouting(
  decision: RoutingDecision,
  requestTypes: string[],
  phase: ProjectPhase
): { isValid: boolean; issues: string[] } {
  const issues: string[] = []

  // Find the target agent's capabilities
  const agentConfig = AGENT_CAPABILITIES.find(
    a => a.name.toLowerCase() === decision.targetAgent.toLowerCase()
  )

  if (!agentConfig) {
    issues.push(`Unknown agent: ${decision.targetAgent}`)
    return { isValid: false, issues }
  }

  // Check phase compatibility
  if (phase !== 'unknown' && !agentConfig.phases.includes(phase)) {
    issues.push(
      `${decision.targetAgent} is not appropriate for ${phase} phase. ` +
        `Use during: ${agentConfig.phases.join(', ')}`
    )
  }

  // Check capability match
  const hasCapability = requestTypes.some(type => agentConfig.capabilities.includes(type))

  if (requestTypes.length > 0 && !hasCapability) {
    issues.push(
      `${decision.targetAgent} may not be best for ${requestTypes.join(', ')}. ` +
        `Agent handles: ${agentConfig.capabilities.slice(0, 3).join(', ')}`
    )
  }

  // Check exclusions
  if (agentConfig.exclusions) {
    const hasExclusion = requestTypes.some(type => agentConfig.exclusions!.includes(type))

    if (hasExclusion) {
      issues.push(
        `${decision.targetAgent} should not handle ${requestTypes.join(', ')}. ` +
          'These are excluded from this agent\'s scope.'
      )
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  }
}

// ============================================
// MAIN VALIDATOR
// ============================================

export class RoutingValidityValidator implements Validator<Partial<WritersRoomState>> {
  name = 'RoutingValidity'

  async validate(output: Partial<WritersRoomState>): Promise<ValidationResult> {
    const guardIssues: GuardrailIssue[] = []

    // Extract content from last message
    const messages = output.messages || []
    const lastMessage = messages[messages.length - 1]
    const content = lastMessage
      ? typeof lastMessage.content === 'string'
        ? lastMessage.content
        : ''
      : ''

    // Detect routing decision
    const routingDecision = detectRoutingDecision(content)

    if (!routingDecision) {
      // No routing detected, skip validation
      return { isValid: true, issues: [] }
    }

    // Detect request types from user input
    const userMessages = messages.filter(
      m => (m as any)._getType?.() === 'human' || (m as any).constructor?.name === 'HumanMessage'
    )
    const lastUserMessage = userMessages[userMessages.length - 1]
    const userContent = lastUserMessage
      ? typeof lastUserMessage.content === 'string'
        ? lastUserMessage.content
        : ''
      : ''

    const requestTypes = detectRequestType(userContent)

    // Detect current phase
    const phase = detectPhase(output)

    // Validate routing
    const validation = validateRouting(routingDecision, requestTypes, phase)

    // Convert to GuardrailIssue format
    for (const issue of validation.issues) {
      guardIssues.push({
        code: 'ROUTING_VALIDITY',
        message: issue,
        severity: 'warning',
        context: {
          targetAgent: routingDecision.targetAgent,
          requestTypes,
          phase,
        },
      })
    }

    // Routing issues are warnings, don't block
    return {
      isValid: true,
      issues: guardIssues,
    }
  }
}

/**
 * Factory function
 */
export function createRoutingValidityValidator(): RoutingValidityValidator {
  return new RoutingValidityValidator()
}

/**
 * Get recommended agent for a request type
 */
export function getRecommendedAgent(
  requestType: string,
  phase: ProjectPhase = 'unknown'
): string | null {
  for (const agent of AGENT_CAPABILITIES) {
    const inPhase = phase === 'unknown' || agent.phases.includes(phase)
    const hasCapability = agent.capabilities.includes(requestType)
    const notExcluded = !agent.exclusions?.includes(requestType)

    if (inPhase && hasCapability && notExcluded) {
      return agent.name
    }
  }

  return null
}
