/**
 * Output Guardrails
 * 
 * Validates agent outputs before they are sent to the user or committed to state.
 * Includes schema validation, semantic validation, and action safety checks.
 */

import { AIMessage } from '@langchain/core/messages'
import { AgentAction, AgentResponse } from '../actions/types'
import { WritersRoomState, Phase } from '../graph/state'
import {
  AgentRole,
  OutputValidationResult,
  GuardrailIssue,
  ActionSafetyLevel,
  ActionSafetyConfig,
} from './types'
import { checkConsistency, extractBibleRef } from './consistency-guardrails'
import { AGENT_GUARDRAILS } from './agent-guardrails'

// ============================================
// ACTION SAFETY CONFIGURATION
// ============================================

const ACTION_SAFETY: ActionSafetyConfig[] = [
  // Safe actions - low risk
  { type: 'CREATE_BEAT', safetyLevel: 'safe', requiresConfirmation: false, minConfidence: 0.5 },
  { type: 'UPDATE_BEAT', safetyLevel: 'safe', requiresConfirmation: false, minConfidence: 0.5 },
  { type: 'CREATE_CHARACTER', safetyLevel: 'safe', requiresConfirmation: false, minConfidence: 0.5 },
  { type: 'UPDATE_CHARACTER', safetyLevel: 'safe', requiresConfirmation: false, minConfidence: 0.5 },
  { type: 'UPDATE_CHARACTER_METRICS', safetyLevel: 'safe', requiresConfirmation: false, minConfidence: 0.5 },
  { type: 'ADD_KNOWLEDGE', safetyLevel: 'safe', requiresConfirmation: false, minConfidence: 0.5 },
  { type: 'UPDATE_SCRIPT', safetyLevel: 'safe', requiresConfirmation: false, minConfidence: 0.5 },
  { type: 'ADD_WORLD_RULE', safetyLevel: 'safe', requiresConfirmation: false, minConfidence: 0.5 },
  { type: 'ADD_SETUP', safetyLevel: 'safe', requiresConfirmation: false, minConfidence: 0.5 },
  { type: 'RESOLVE_SETUP', safetyLevel: 'safe', requiresConfirmation: false, minConfidence: 0.5 },
  
  // Partial bible updates - moderate risk
  { type: 'UPDATE_WORLD_RULES', safetyLevel: 'moderate', requiresConfirmation: false, minConfidence: 0.6 },
  { type: 'UPDATE_FACTIONS', safetyLevel: 'moderate', requiresConfirmation: false, minConfidence: 0.6 },
  { type: 'UPDATE_KEY_CHARACTERS', safetyLevel: 'moderate', requiresConfirmation: false, minConfidence: 0.6 },
  { type: 'UPDATE_INSPIRATIONS', safetyLevel: 'safe', requiresConfirmation: false, minConfidence: 0.5 },
  { type: 'UPDATE_WORLD_DESCRIPTION', safetyLevel: 'safe', requiresConfirmation: false, minConfidence: 0.5 },
  { type: 'UPDATE_MOOD_SOUNDTRACK', safetyLevel: 'safe', requiresConfirmation: false, minConfidence: 0.5 },
  { type: 'UPDATE_PLOT_TWISTS', safetyLevel: 'moderate', requiresConfirmation: false, minConfidence: 0.6 },
  { type: 'UPDATE_EPISODE_ROADMAP', safetyLevel: 'moderate', requiresConfirmation: false, minConfidence: 0.6 },
  { type: 'UPDATE_EPISODE_PREMISE', safetyLevel: 'moderate', requiresConfirmation: false, minConfidence: 0.6 },
  
  // Full bible update - moderate risk (can overwrite a lot)
  { type: 'UPDATE_SERIES_BIBLE', safetyLevel: 'moderate', requiresConfirmation: false, minConfidence: 0.7 },
  
  // Dangerous actions - require higher confidence
  { type: 'DELETE_BEAT', safetyLevel: 'dangerous', requiresConfirmation: true, minConfidence: 0.8 },
  { type: 'REORDER_BEATS', safetyLevel: 'moderate', requiresConfirmation: false, minConfidence: 0.6 },
  { type: 'LOCK_BEAT_BOARD', safetyLevel: 'dangerous', requiresConfirmation: true, minConfidence: 0.8 },
]

/**
 * Get safety config for an action type
 */
function getActionSafety(actionType: AgentAction['type']): ActionSafetyConfig {
  const config = ACTION_SAFETY.find(a => a.type === actionType)
  return config || {
    type: actionType,
    safetyLevel: 'moderate',
    requiresConfirmation: false,
    minConfidence: 0.6,
  }
}

// ============================================
// MAIN OUTPUT VALIDATION
// ============================================

/**
 * Validate agent output before sending to user
 */
export async function validateAgentOutput(
  agentResult: Partial<WritersRoomState>,
  agentRole: AgentRole,
  state: WritersRoomState
): Promise<OutputValidationResult> {
  const issues: GuardrailIssue[] = []
  let shouldBlock = false

  // Extract message and actions from result
  const messages = agentResult.messages || []
  const lastMessage = messages[messages.length - 1] as AIMessage | undefined
  const actions: AgentAction[] = (lastMessage as any)?.actions || []
  const confidence: number = (lastMessage as any)?.confidence ?? 0.7

  // Get agent-specific guardrails
  const guardrailConfig = AGENT_GUARDRAILS[agentRole]

  // 1. Check forbidden actions
  if (guardrailConfig) {
    for (const action of actions) {
      if (guardrailConfig.forbiddenActions.includes(action.type)) {
        issues.push({
          code: 'FORBIDDEN_ACTION',
          message: `Agent "${agentRole}" is not allowed to perform action "${action.type}"`,
          severity: 'error',
          field: 'actions',
          context: { action: action.type, agent: agentRole },
        })
        shouldBlock = true
      }
    }
  }

  // 2. Check action safety vs confidence
  for (const action of actions) {
    const safety = getActionSafety(action.type)
    
    if (confidence < safety.minConfidence) {
      issues.push({
        code: 'LOW_CONFIDENCE_ACTION',
        message: `Action "${action.type}" requires confidence ${safety.minConfidence} but agent has ${confidence.toFixed(2)}`,
        severity: safety.safetyLevel === 'dangerous' ? 'error' : 'warning',
        context: {
          action: action.type,
          requiredConfidence: safety.minConfidence,
          actualConfidence: confidence,
          safetyLevel: safety.safetyLevel,
        },
      })
      
      if (safety.safetyLevel === 'dangerous') {
        shouldBlock = true
      }
    }
  }

  // 3. Check phase restrictions
  if (guardrailConfig && !guardrailConfig.allowedPhases.includes(state.currentPhase)) {
    issues.push({
      code: 'PHASE_RESTRICTION',
      message: `Agent "${agentRole}" should not operate in "${state.currentPhase}" phase`,
      severity: 'warning',
      context: {
        agent: agentRole,
        currentPhase: state.currentPhase,
        allowedPhases: guardrailConfig.allowedPhases,
      },
    })
  }

  // 4. Run consistency checks
  if (actions.length > 0) {
    const consistencyResult = await checkConsistency(
      actions,
      state,
      guardrailConfig?.consistencyChecks || []
    )
    issues.push(...consistencyResult.issues)
    
    // Only block on consistency errors, not warnings
    if (!consistencyResult.isConsistent) {
      const hasBlockingIssue = consistencyResult.issues.some(i => i.severity === 'error')
      if (hasBlockingIssue) {
        shouldBlock = true
      }
    }
  }

  // 5. Check message content quality
  if (lastMessage) {
    const content = typeof lastMessage.content === 'string' 
      ? lastMessage.content 
      : JSON.stringify(lastMessage.content)
    
    const contentIssues = validateMessageContent(content, agentRole)
    issues.push(...contentIssues)
  }

  // 6. Check for empty responses
  if (!lastMessage && actions.length === 0) {
    issues.push({
      code: 'EMPTY_RESPONSE',
      message: `Agent "${agentRole}" produced no message and no actions`,
      severity: 'warning',
    })
  }

  return {
    isValid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    shouldBlock,
  }
}

// ============================================
// MESSAGE CONTENT VALIDATION
// ============================================

/**
 * Validate the content of an agent's message
 */
function validateMessageContent(content: string, agentRole: AgentRole): GuardrailIssue[] {
  const issues: GuardrailIssue[] = []

  // Check for very short messages (might be an error)
  if (content.length < 10) {
    issues.push({
      code: 'MESSAGE_TOO_SHORT',
      message: 'Agent message is suspiciously short',
      severity: 'info',
      context: { length: content.length },
    })
  }

  // Check for very long messages (might need truncation)
  if (content.length > 10000) {
    issues.push({
      code: 'MESSAGE_TOO_LONG',
      message: 'Agent message is very long and may overwhelm the user',
      severity: 'info',
      context: { length: content.length },
    })
  }

  // Check for role-specific content issues
  if (agentRole === 'premiseArchitect') {
    // Premise Architect should not produce beat-related content
    if (content.toLowerCase().includes('beat:') || content.toLowerCase().includes('scene:')) {
      issues.push({
        code: 'ROLE_CONTENT_MISMATCH',
        message: 'Premise Architect is producing beat/scene content instead of world-building',
        severity: 'warning',
      })
    }
  }

  if (agentRole === 'writer') {
    // Writer should produce screenplay-style content
    if (!content.includes('INT.') && !content.includes('EXT.') && content.length > 500) {
      issues.push({
        code: 'MISSING_SCREENPLAY_FORMAT',
        message: 'Writer output lacks standard screenplay formatting (INT./EXT.)',
        severity: 'info',
      })
    }
  }

  // Check for common LLM failure patterns
  const failurePatterns = [
    { pattern: /i cannot|i'm unable|as an ai/i, code: 'REFUSAL_DETECTED' },
    { pattern: /\[insert|<placeholder>|lorem ipsum/i, code: 'PLACEHOLDER_DETECTED' },
    { pattern: /undefined|null|NaN/gi, code: 'INVALID_VALUE_DETECTED' },
  ]

  for (const { pattern, code } of failurePatterns) {
    if (pattern.test(content)) {
      issues.push({
        code,
        message: `Potential LLM failure pattern detected: ${code}`,
        severity: 'warning',
      })
    }
  }

  return issues
}

// ============================================
// ACTION VALIDATION
// ============================================

/**
 * Validate a single action's payload
 */
export function validateActionPayload(action: AgentAction): GuardrailIssue[] {
  const issues: GuardrailIssue[] = []

  switch (action.type) {
    case 'CREATE_BEAT': {
      const payload = action.payload as any
      if (!payload.logline || payload.logline.trim().length < 10) {
        issues.push({
          code: 'BEAT_LOGLINE_TOO_SHORT',
          message: 'Beat logline must be at least 10 characters',
          severity: 'error',
          field: 'logline',
        })
      }
      if (!payload.charactersInvolved || payload.charactersInvolved.length === 0) {
        issues.push({
          code: 'BEAT_NO_CHARACTERS',
          message: 'Beat should involve at least one character',
          severity: 'warning',
          field: 'charactersInvolved',
        })
      }
      break
    }

    case 'CREATE_CHARACTER': {
      const payload = action.payload as any
      if (!payload.name || payload.name.trim().length < 2) {
        issues.push({
          code: 'CHARACTER_NAME_INVALID',
          message: 'Character must have a valid name',
          severity: 'error',
          field: 'name',
        })
      }
      break
    }

    case 'UPDATE_SERIES_BIBLE': {
      const payload = action.payload as any
      if (!payload.storyPlan && !payload.genre && !payload.tone) {
        issues.push({
          code: 'EMPTY_BIBLE_UPDATE',
          message: 'Bible update contains no meaningful changes',
          severity: 'warning',
        })
      }
      break
    }

    case 'UPDATE_FACTIONS': {
      const payload = action.payload as any
      if (!payload.factions || payload.factions.length === 0) {
        issues.push({
          code: 'EMPTY_FACTIONS_UPDATE',
          message: 'Factions update contains no factions',
          severity: 'warning',
        })
      }
      for (const faction of payload.factions || []) {
        if (!faction.id) {
          issues.push({
            code: 'FACTION_MISSING_ID',
            message: `Faction "${faction.name}" is missing an ID`,
            severity: 'error',
          })
        }
      }
      break
    }
  }

  return issues
}

// ============================================
// BULK ACTION VALIDATION
// ============================================

/**
 * Validate multiple actions together (can catch inter-action conflicts)
 */
export function validateActions(actions: AgentAction[]): GuardrailIssue[] {
  const issues: GuardrailIssue[] = []

  // Validate each action individually
  for (const action of actions) {
    issues.push(...validateActionPayload(action))
  }

  // Check for conflicting actions
  const createBeatActions = actions.filter(a => a.type === 'CREATE_BEAT')
  const deleteBeatActions = actions.filter(a => a.type === 'DELETE_BEAT')
  
  // Creating and deleting beats in same response is suspicious
  if (createBeatActions.length > 0 && deleteBeatActions.length > 0) {
    issues.push({
      code: 'CONFLICTING_BEAT_ACTIONS',
      message: 'Agent is creating and deleting beats in the same response',
      severity: 'warning',
    })
  }

  // Too many actions might indicate confused agent
  if (actions.length > 10) {
    issues.push({
      code: 'TOO_MANY_ACTIONS',
      message: `Agent is attempting ${actions.length} actions in a single response`,
      severity: 'warning',
      context: { actionCount: actions.length },
    })
  }

  return issues
}

// ============================================
// RESPONSE SANITIZATION
// ============================================

/**
 * Sanitize an agent response by removing blocked actions
 */
export function sanitizeAgentOutput(
  agentResult: Partial<WritersRoomState>,
  validation: OutputValidationResult
): Partial<WritersRoomState> {
  if (!validation.shouldBlock || validation.isValid) {
    return agentResult
  }

  // Get blocked action types from errors
  const blockedActionTypes = new Set(
    validation.issues
      .filter(i => i.severity === 'error' && i.code === 'FORBIDDEN_ACTION')
      .map(i => i.context?.action as string)
      .filter(Boolean)
  )

  // If we have messages with actions, filter them
  const messages = agentResult.messages || []
  const sanitizedMessages = messages.map(msg => {
    if ('actions' in (msg as any)) {
      const actions = (msg as any).actions as AgentAction[]
      const filteredActions = actions.filter(a => !blockedActionTypes.has(a.type))
      return {
        ...msg,
        actions: filteredActions,
      }
    }
    return msg
  })

  return {
    ...agentResult,
    messages: sanitizedMessages as any,
  }
}

// ============================================
// HELPER: CHECK IF OUTPUT IS SAFE
// ============================================

/**
 * Quick check if an output is safe to commit
 */
export function isOutputSafe(validation: OutputValidationResult): boolean {
  return validation.isValid && !validation.shouldBlock
}

/**
 * Get a human-readable summary of validation issues
 */
export function getValidationSummary(validation: OutputValidationResult): string {
  if (validation.isValid && validation.issues.length === 0) {
    return 'Output is valid'
  }

  const errors = validation.issues.filter(i => i.severity === 'error')
  const warnings = validation.issues.filter(i => i.severity === 'warning')
  const infos = validation.issues.filter(i => i.severity === 'info')

  const parts: string[] = []
  if (errors.length > 0) {
    parts.push(`${errors.length} error(s)`)
  }
  if (warnings.length > 0) {
    parts.push(`${warnings.length} warning(s)`)
  }
  if (infos.length > 0) {
    parts.push(`${infos.length} info`)
  }

  return `Output validation: ${parts.join(', ')}`
}





