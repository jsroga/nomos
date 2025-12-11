/**
 * Guardrails Type Definitions
 * 
 * Types for input/output validation, agent-specific rules,
 * and consistency checking in the Writer's Room.
 */

import { AgentAction, AgentResponse } from '../actions/types'
import { WritersRoomState, Phase, CharacterState } from '../graph/state'

// ============================================
// AGENT ROLES
// ============================================

export type AgentRole =
  | 'supervisor'
  | 'plotArchitect'
  | 'characterPsychology'
  | 'consequenceTracker'
  | 'devilsAdvocate'
  | 'writer'
  | 'scriptEditor'
  | 'premiseArchitect'
  | 'episodePremiseArchitect'
  | 'magicAgent'

// ============================================
// GUARDRAIL SEVERITY LEVELS
// ============================================

export type GuardrailSeverity = 'error' | 'warning' | 'info'

// ============================================
// GUARDRAIL ISSUE
// ============================================

export interface GuardrailIssue {
  code: string
  message: string
  severity: GuardrailSeverity
  field?: string
  context?: Record<string, unknown>
}

// ============================================
// INPUT VALIDATION RESULT
// ============================================

export interface InputValidationResult {
  isValid: boolean
  sanitized: string
  warnings: GuardrailIssue[]
  blocked?: GuardrailIssue
  tokenCount?: number
}

// ============================================
// OUTPUT VALIDATION RESULT
// ============================================

export interface OutputValidationResult {
  isValid: boolean
  sanitized?: Partial<WritersRoomState>
  issues: GuardrailIssue[]
  shouldBlock: boolean
}

// ============================================
// CONSISTENCY CHECK RESULT
// ============================================

export interface ConsistencyCheckResult {
  isConsistent: boolean
  issues: GuardrailIssue[]
  unreferencedEntities: {
    characters: string[]
    factions: string[]
    locations: string[]
  }
  suggestions?: string[]
}

// ============================================
// AGENT GUARDRAIL CONFIG
// ============================================

export interface AgentGuardrailConfig {
  /** Maximum output tokens allowed */
  maxOutputTokens: number
  
  /** Fields that must be present in output */
  requiredFields: string[]
  
  /** Actions this agent is not allowed to perform */
  forbiddenActions: AgentAction['type'][]
  
  /** Consistency checks to run for this agent */
  consistencyChecks: ConsistencyCheckType[]
  
  /** Minimum confidence required for actions */
  minConfidenceForActions: number
  
  /** Phases where this agent can operate */
  allowedPhases: Phase[]
  
  /** Actions that require high confidence (0.8+) */
  highConfidenceActions: AgentAction['type'][]
}

// ============================================
// CONSISTENCY CHECK TYPES
// ============================================

export type ConsistencyCheckType =
  | 'charactersExist'
  | 'factionsExist'
  | 'factionsHaveConflict'
  | 'worldRulesHaveConsequences'
  | 'beatFitsPhase'
  | 'characterMotivationsAlign'
  | 'timelineConsistent'
  | 'setupsHavePayoffs'

// ============================================
// SERIES BIBLE REFERENCE (for consistency checks)
// ============================================

export interface SeriesBibleRef {
  characters: Array<{ name: string; id?: string; factionId?: string | null }>
  factions: Array<{ id: string; name: string; ideology?: string }>
  worldRules: Array<{ category?: string; rule: string; consequence?: string }>
  locations?: Array<{ name: string; description?: string }>
  keyCharacters?: Array<{ name: string; role: string; factionId?: string | null }>
}

// ============================================
// STREAMING CALLBACK TYPES
// ============================================

export interface StreamProgress {
  type: 'token' | 'section_start' | 'section_complete' | 'thinking' | 'action'
  agent: string
  token?: string
  section?: string
  content?: unknown
  progress?: number
}

export type StreamCallback = (progress: StreamProgress) => void

// ============================================
// EXTENDED STATE WITH STREAM SUPPORT
// ============================================

export interface WritersRoomStateWithStream extends WritersRoomState {
  _streamCallback?: StreamCallback
}

// ============================================
// INJECTION DETECTION PATTERNS
// ============================================

export interface InjectionPattern {
  pattern: RegExp
  description: string
  severity: GuardrailSeverity
}

// ============================================
// CONTENT MODERATION RESULT
// ============================================

export interface ContentModerationResult {
  isSafe: boolean
  categories: {
    violence: boolean
    hate: boolean
    selfHarm: boolean
    sexual: boolean
    illegal: boolean
  }
  flaggedPhrases: string[]
}

// ============================================
// GUARDRAIL MIDDLEWARE CONTEXT
// ============================================

export interface GuardrailContext {
  agentRole: AgentRole
  phase: Phase
  state: WritersRoomState
  bible: SeriesBibleRef
}

// ============================================
// ACTION SAFETY LEVELS
// ============================================

export type ActionSafetyLevel = 'safe' | 'moderate' | 'dangerous'

export interface ActionSafetyConfig {
  type: AgentAction['type']
  safetyLevel: ActionSafetyLevel
  requiresConfirmation: boolean
  minConfidence: number
}

// ============================================
// GUARDRAIL HOOKS
// ============================================

export interface GuardrailHooks {
  beforeAgent?: (context: GuardrailContext) => Promise<InputValidationResult>
  afterAgent?: (
    context: GuardrailContext,
    result: Partial<WritersRoomState>
  ) => Promise<OutputValidationResult>
  onIssue?: (issue: GuardrailIssue, context: GuardrailContext) => void
  onBlock?: (issue: GuardrailIssue, context: GuardrailContext) => void
}


