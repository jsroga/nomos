/**
 * Agent-Specific Guardrail Configurations
 *
 * Defines role-specific validation rules, allowed actions,
 * and consistency checks for each agent in the Writer's Room.
 */

import { AgentRole, AgentGuardrailConfig, ConsistencyCheckType } from './types'
import { AgentAction } from '../actions/types'
import { Phase } from '../graph/state'

// ============================================
// AGENT GUARDRAIL CONFIGURATIONS
// ============================================

export const AGENT_GUARDRAILS: Record<AgentRole, AgentGuardrailConfig> = {
  supervisor: {
    maxOutputTokens: 2000,
    requiredFields: [],
    forbiddenActions: [
      // Supervisor delegates, doesn't execute actions directly
      'CREATE_BEAT',
      'UPDATE_BEAT',
      'DELETE_BEAT',
      'UPDATE_SCRIPT',
      'CREATE_CHARACTER',
    ],
    consistencyChecks: [],
    minConfidenceForActions: 0.5,
    allowedPhases: ['premise', 'breaking', 'cardlock', 'writing', 'complete'],
    highConfidenceActions: [],
  },

  premiseArchitect: {
    maxOutputTokens: 8000,
    requiredFields: ['message'],
    forbiddenActions: [
      // Premise Architect works on bible, not beats or scripts
      'CREATE_BEAT',
      'UPDATE_BEAT',
      'DELETE_BEAT',
      'REORDER_BEATS',
      'LOCK_BEAT_BOARD',
      'UPDATE_SCRIPT',
      'INSERT_SCRIPT_SECTION',
      'REVISE_SCRIPT_SECTION',
    ],
    consistencyChecks: ['factionsHaveConflict', 'worldRulesHaveConsequences'],
    minConfidenceForActions: 0.6,
    allowedPhases: ['premise', 'breaking'],
    highConfidenceActions: ['UPDATE_SERIES_BIBLE'],
  },

  episodePremiseArchitect: {
    maxOutputTokens: 4000,
    requiredFields: ['message'],
    forbiddenActions: ['CREATE_BEAT', 'UPDATE_BEAT', 'DELETE_BEAT', 'UPDATE_SCRIPT'],
    consistencyChecks: ['charactersExist'],
    minConfidenceForActions: 0.6,
    allowedPhases: ['premise'],
    highConfidenceActions: ['UPDATE_EPISODE_PREMISE'],
  },

  plotArchitect: {
    maxOutputTokens: 4000,
    requiredFields: ['message'],
    forbiddenActions: [
      // Plot Architect creates beats, not bible entries
      'UPDATE_SERIES_BIBLE',
      'UPDATE_WORLD_RULES',
      'UPDATE_FACTIONS',
      'UPDATE_SCRIPT',
    ],
    consistencyChecks: ['charactersExist', 'beatFitsPhase', 'characterMotivationsAlign'],
    minConfidenceForActions: 0.6,
    allowedPhases: ['breaking', 'cardlock'],
    highConfidenceActions: ['DELETE_BEAT', 'REORDER_BEATS'],
  },

  characterPsychology: {
    maxOutputTokens: 3000,
    requiredFields: ['message'],
    forbiddenActions: ['CREATE_BEAT', 'DELETE_BEAT', 'UPDATE_SCRIPT', 'UPDATE_SERIES_BIBLE'],
    consistencyChecks: ['charactersExist', 'characterMotivationsAlign'],
    minConfidenceForActions: 0.6,
    allowedPhases: ['breaking', 'cardlock'],
    highConfidenceActions: [],
  },

  consequenceTracker: {
    maxOutputTokens: 3000,
    requiredFields: ['message'],
    forbiddenActions: ['CREATE_BEAT', 'DELETE_BEAT', 'UPDATE_SCRIPT', 'UPDATE_SERIES_BIBLE'],
    consistencyChecks: ['setupsHavePayoffs', 'timelineConsistent'],
    minConfidenceForActions: 0.5,
    allowedPhases: ['breaking', 'cardlock'],
    highConfidenceActions: [],
  },

  devilsAdvocate: {
    maxOutputTokens: 2500,
    requiredFields: ['message'],
    forbiddenActions: [
      // Devil's Advocate critiques but doesn't create
      'CREATE_BEAT',
      'CREATE_CHARACTER',
      'UPDATE_SCRIPT',
      'UPDATE_SERIES_BIBLE',
    ],
    consistencyChecks: [],
    minConfidenceForActions: 0.5,
    allowedPhases: ['breaking', 'cardlock'],
    highConfidenceActions: ['DELETE_BEAT'],
  },

  writer: {
    maxOutputTokens: 6000,
    requiredFields: ['message'],
    forbiddenActions: [
      // Writer writes scripts, doesn't modify structure
      'UPDATE_SERIES_BIBLE',
      'CREATE_BEAT',
      'DELETE_BEAT',
      'REORDER_BEATS',
    ],
    consistencyChecks: ['charactersExist'],
    minConfidenceForActions: 0.6,
    allowedPhases: ['cardlock', 'writing'],
    highConfidenceActions: [],
  },

  scriptEditor: {
    maxOutputTokens: 4000,
    requiredFields: ['message'],
    forbiddenActions: ['UPDATE_SERIES_BIBLE', 'CREATE_BEAT', 'DELETE_BEAT', 'CREATE_CHARACTER'],
    consistencyChecks: [],
    minConfidenceForActions: 0.6,
    allowedPhases: ['cardlock', 'writing'],
    highConfidenceActions: [],
  },

  magicAgent: {
    maxOutputTokens: 2000,
    requiredFields: ['message'],
    forbiddenActions: [
      // Magic Agent suggests but shouldn't delete
      'DELETE_BEAT',
      'DELETE_CHARACTER' as any, // Type assertion for safety
      'LOCK_BEAT_BOARD',
    ],
    consistencyChecks: [],
    minConfidenceForActions: 0.4, // Lower threshold for chaos agent
    allowedPhases: ['premise', 'breaking'],
    highConfidenceActions: [],
  },
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get guardrail config for an agent role
 */
export function getAgentGuardrails(role: AgentRole): AgentGuardrailConfig {
  return AGENT_GUARDRAILS[role] || AGENT_GUARDRAILS.supervisor
}

/**
 * Check if an action is allowed for an agent
 */
export function isActionAllowedForAgent(action: AgentAction, role: AgentRole): boolean {
  const config = getAgentGuardrails(role)
  return !config.forbiddenActions.includes(action.type)
}

/**
 * Check if an agent is allowed in a phase
 */
export function isAgentAllowedInPhase(role: AgentRole, phase: Phase): boolean {
  const config = getAgentGuardrails(role)
  return config.allowedPhases.includes(phase)
}

/**
 * Get the consistency checks that should run for an agent
 */
export function getConsistencyChecksForAgent(role: AgentRole): ConsistencyCheckType[] {
  const config = getAgentGuardrails(role)
  return config.consistencyChecks
}

/**
 * Check if an action requires high confidence for an agent
 */
export function requiresHighConfidence(action: AgentAction, role: AgentRole): boolean {
  const config = getAgentGuardrails(role)
  return config.highConfidenceActions.includes(action.type)
}

/**
 * Get minimum confidence required for an action
 */
export function getMinConfidenceForAction(action: AgentAction, role: AgentRole): number {
  const config = getAgentGuardrails(role)
  if (requiresHighConfidence(action, role)) {
    return 0.8 // High confidence actions need 80%
  }
  return config.minConfidenceForActions
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate an agent's actions against its guardrails
 */
export function validateAgentActions(
  actions: AgentAction[],
  role: AgentRole,
  confidence: number
): { valid: boolean; violations: string[] } {
  const violations: string[] = []
  const config = getAgentGuardrails(role)

  for (const action of actions) {
    // Check forbidden actions
    if (config.forbiddenActions.includes(action.type)) {
      violations.push(`Action "${action.type}" is forbidden for ${role}`)
    }

    // Check confidence requirements
    const minConfidence = getMinConfidenceForAction(action, role)
    if (confidence < minConfidence) {
      violations.push(
        `Action "${action.type}" requires confidence ${minConfidence}, but agent has ${confidence.toFixed(2)}`
      )
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  }
}

/**
 * Get a summary of what an agent can and cannot do
 */
export function getAgentCapabilitySummary(role: AgentRole): {
  allowedActions: string[]
  forbiddenActions: string[]
  phases: Phase[]
  consistencyChecks: ConsistencyCheckType[]
} {
  const config = getAgentGuardrails(role)

  // All possible action types
  const allActions: AgentAction['type'][] = [
    'CREATE_BEAT',
    'UPDATE_BEAT',
    'DELETE_BEAT',
    'REORDER_BEATS',
    'LOCK_BEAT_BOARD',
    'CREATE_CHARACTER',
    'UPDATE_CHARACTER',
    'UPDATE_CHARACTER_METRICS',
    'ADD_KNOWLEDGE',
    'UPDATE_SCRIPT',
    'UPDATE_SERIES_BIBLE',
    'UPDATE_WORLD_RULES',
    'UPDATE_FACTIONS',
    'UPDATE_KEY_CHARACTERS',
    'UPDATE_EPISODE_PREMISE',
  ]

  const allowedActions = allActions.filter(a => !config.forbiddenActions.includes(a))

  return {
    allowedActions,
    forbiddenActions: config.forbiddenActions as string[],
    phases: config.allowedPhases,
    consistencyChecks: config.consistencyChecks,
  }
}
