/**
 * Guardrails Module
 *
 * Exports all guardrail functions and types for the Writer's Room.
 */

// Types
export * from './types'

// Input Guardrails
export {
  validateUserInput,
  validateInputForAgent,
  isInputSafe,
  getTokenEstimate,
} from './input-guardrails'

// Output Guardrails
export {
  validateAgentOutput,
  validateActionPayload,
  validateActions,
  sanitizeAgentOutput,
  isOutputSafe,
  getValidationSummary,
} from './output-guardrails'

// Consistency Guardrails
export {
  checkConsistency,
  checkCharactersExist,
  checkFactionsExist,
  checkFactionsHaveConflict,
  checkWorldRulesHaveConsequences,
  checkBeatFitsPhase,
  checkCharacterMotivationsAlign,
  checkActionConsistency,
  extractBibleRef,
  characterExists,
  factionExists,
  getKnownCharacterNames,
  getKnownFactionNames,
} from './consistency-guardrails'

// Agent Guardrails
export {
  AGENT_GUARDRAILS,
  getAgentGuardrails,
  isActionAllowedForAgent,
  isAgentAllowedInPhase,
  getConsistencyChecksForAgent,
  requiresHighConfidence,
  getMinConfidenceForAction,
  validateAgentActions,
  getAgentCapabilitySummary,
} from './agent-guardrails'
