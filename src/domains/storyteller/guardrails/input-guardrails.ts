/**
 * Input Guardrails
 *
 * Validates user messages before they reach the agent graph.
 * Includes content moderation, prompt injection detection, and length limits.
 */

import { WritersRoomState, Phase } from '../types'
import {
  InputValidationResult,
  GuardrailIssue,
  InjectionPattern,
  ContentModerationResult,
} from './types'

// ============================================
// TOKEN ESTIMATION
// ============================================

/**
 * Rough token count estimation (4 chars per token on average)
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}

// ============================================
// INJECTION DETECTION PATTERNS
// ============================================

const INJECTION_PATTERNS: InjectionPattern[] = [
  {
    pattern: /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/i,
    description: 'Attempt to override system instructions',
    severity: 'error',
  },
  {
    pattern: /you\s+are\s+now\s+(a|an)\s+(?!writer|author|storyteller)/i,
    description: 'Attempt to change agent identity',
    severity: 'warning',
  },
  {
    pattern: /system\s*:\s*|<\/?system>|<\/?prompt>/i,
    description: 'Attempt to inject system message',
    severity: 'error',
  },
  {
    pattern: /forget\s+(everything|all|your)\s+(you|know|training)/i,
    description: 'Attempt to reset agent memory',
    severity: 'error',
  },
  {
    pattern: /act\s+as\s+if\s+you\s+(don't|do\s+not)\s+have\s+(any\s+)?rules/i,
    description: 'Attempt to bypass safety rules',
    severity: 'error',
  },
  {
    pattern: /\bDAN\b|do\s+anything\s+now/i,
    description: 'Known jailbreak attempt (DAN)',
    severity: 'error',
  },
  {
    pattern: /pretend\s+(you|that)\s+(are|can|have)\s+(no|unlimited)/i,
    description: 'Attempt to remove limitations',
    severity: 'warning',
  },
  {
    pattern: /reveal\s+(your|the)\s+(system\s+)?prompt/i,
    description: 'Attempt to extract system prompt',
    severity: 'warning',
  },
  {
    pattern: /print\s+(your|the)\s+(initial|system|full)\s+(prompt|instructions)/i,
    description: 'Attempt to extract instructions',
    severity: 'warning',
  },
  {
    pattern: /\[\s*INST\s*\]|\[\s*\/\s*INST\s*\]|<\|im_start\|>|<\|im_end\|>/i,
    description: 'Raw model token injection attempt',
    severity: 'error',
  },
]

/**
 * Check for prompt injection attempts
 */
function detectInjection(message: string): GuardrailIssue[] {
  const issues: GuardrailIssue[] = []

  for (const { pattern, description, severity } of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      issues.push({
        code: 'INJECTION_DETECTED',
        message: description,
        severity,
        context: {
          pattern: pattern.toString(),
          matched: message.match(pattern)?.[0],
        },
      })
    }
  }

  return issues
}

// ============================================
// CONTENT MODERATION
// ============================================

/**
 * Patterns for content that should trigger warnings or blocks
 * Note: For production, consider using a dedicated moderation API
 */
const CONTENT_PATTERNS = {
  // These are soft flags - creative writing often needs to explore dark themes
  violence: {
    severe: /\b(torture|mutilate|dismember)\s+(a\s+)?(child|baby|infant)/i,
    moderate: /\b(graphic|detailed)\s+(torture|mutilation)/i,
  },
  hate: {
    severe: /\b(kill|eliminate|genocide)\s+(all\s+)?(jews?|blacks?|muslims?|whites?)/i,
    moderate: /\b(racial\s+supremacy|ethnic\s+cleansing)/i,
  },
  selfHarm: {
    severe: /\b(how\s+to|instructions?\s+for)\s+(commit\s+)?suicide/i,
    moderate: /\b(romanticize|glorify)\s+(self[- ]?harm|suicide)/i,
  },
  illegal: {
    severe: /\b(how\s+to|instructions?\s+for)\s+(make|create|build)\s+(a\s+)?bomb/i,
    moderate: /\b(synthesize|manufacture)\s+(drugs?|methamphetamine|heroin)/i,
  },
}

/**
 * Check content for moderation flags
 */
function moderateContent(message: string): ContentModerationResult {
  const result: ContentModerationResult = {
    isSafe: true,
    categories: {
      violence: false,
      hate: false,
      selfHarm: false,
      sexual: false,
      illegal: false,
    },
    flaggedPhrases: [],
  }

  // Check violence
  if (CONTENT_PATTERNS.violence.severe.test(message)) {
    result.isSafe = false
    result.categories.violence = true
    result.flaggedPhrases.push(message.match(CONTENT_PATTERNS.violence.severe)?.[0] || 'violence')
  }

  // Check hate speech
  if (CONTENT_PATTERNS.hate.severe.test(message)) {
    result.isSafe = false
    result.categories.hate = true
    result.flaggedPhrases.push(message.match(CONTENT_PATTERNS.hate.severe)?.[0] || 'hate')
  }

  // Check self-harm
  if (CONTENT_PATTERNS.selfHarm.severe.test(message)) {
    result.isSafe = false
    result.categories.selfHarm = true
    result.flaggedPhrases.push(message.match(CONTENT_PATTERNS.selfHarm.severe)?.[0] || 'self-harm')
  }

  // Check illegal content
  if (CONTENT_PATTERNS.illegal.severe.test(message)) {
    result.isSafe = false
    result.categories.illegal = true
    result.flaggedPhrases.push(message.match(CONTENT_PATTERNS.illegal.severe)?.[0] || 'illegal')
  }

  return result
}

// ============================================
// PHASE-AWARE VALIDATION
// ============================================

/**
 * Check if the user's request matches the current phase
 */
function validatePhaseRelevance(message: string, phase: Phase): GuardrailIssue[] {
  const issues: GuardrailIssue[] = []
  const lowerMessage = message.toLowerCase()

  // Define phase-specific keywords
  const phaseKeywords: Record<Phase, string[]> = {
    premise: ['world', 'setting', 'character', 'faction', 'rule', 'magic', 'premise', 'bible'],
    breaking: ['beat', 'scene', 'plot', 'story', 'arc', 'conflict', 'twist'],
    cardlock: ['lock', 'approve', 'finalize', 'review', 'card'],
    writing: ['write', 'script', 'dialogue', 'screenplay', 'scene'],
    complete: ['export', 'done', 'finish', 'next'],
  }

  // Check if message matches another phase better
  if (!phaseKeywords[phase]) {
    return []
  }

  const currentPhaseScore = phaseKeywords[phase].filter(k => lowerMessage.includes(k)).length

  for (const [otherPhase, keywords] of Object.entries(phaseKeywords)) {
    if (otherPhase === phase) continue

    const otherPhaseScore = keywords.filter(k => lowerMessage.includes(k)).length
    if (otherPhaseScore > currentPhaseScore && otherPhaseScore >= 2) {
      issues.push({
        code: 'PHASE_MISMATCH',
        message: `Your request seems more suited to the "${otherPhase}" phase. Current phase: "${phase}"`,
        severity: 'info',
        context: {
          currentPhase: phase,
          suggestedPhase: otherPhase,
          matchedKeywords: keywords.filter(k => lowerMessage.includes(k)),
        },
      })
      break
    }
  }

  return issues
}

// ============================================
// MAIN INPUT VALIDATION
// ============================================

/**
 * Maximum allowed message length (in characters)
 */
const MAX_MESSAGE_LENGTH = 16000 // ~4000 tokens

/**
 * Maximum allowed token count
 */
const MAX_TOKEN_COUNT = 4000

/**
 * Validate user input before processing
 */
export async function validateUserInput(
  message: string,
  state: WritersRoomState
): Promise<InputValidationResult> {
  const warnings: GuardrailIssue[] = []
  let blocked: GuardrailIssue | undefined
  let sanitized = message.trim()

  // 1. Check for empty message
  if (!sanitized || sanitized.length === 0) {
    return {
      isValid: false,
      sanitized: '',
      warnings: [],
      blocked: {
        code: 'EMPTY_MESSAGE',
        message: 'Message cannot be empty',
        severity: 'error',
      },
    }
  }

  // 2. Check message length
  const tokenCount = estimateTokenCount(sanitized)

  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    blocked = {
      code: 'MESSAGE_TOO_LONG',
      message: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
      severity: 'error',
      context: { length: sanitized.length, maxLength: MAX_MESSAGE_LENGTH },
    }
    return {
      isValid: false,
      sanitized: sanitized.substring(0, MAX_MESSAGE_LENGTH),
      warnings: [],
      blocked,
      tokenCount,
    }
  }

  if (tokenCount > MAX_TOKEN_COUNT) {
    warnings.push({
      code: 'HIGH_TOKEN_COUNT',
      message: `Message has approximately ${tokenCount} tokens, which is high. Consider being more concise.`,
      severity: 'warning',
      context: { tokenCount, maxRecommended: MAX_TOKEN_COUNT },
    })
  }

  // 3. Check for injection attempts
  const injectionIssues = detectInjection(sanitized)
  const severeInjection = injectionIssues.find(i => i.severity === 'error')

  if (severeInjection) {
    blocked = severeInjection
    return {
      isValid: false,
      sanitized,
      warnings: injectionIssues.filter(i => i.severity !== 'error'),
      blocked,
      tokenCount,
    }
  }

  warnings.push(...injectionIssues)

  // 4. Check content moderation
  const moderationResult = moderateContent(sanitized)

  if (!moderationResult.isSafe) {
    blocked = {
      code: 'CONTENT_BLOCKED',
      message: 'Message contains content that violates our guidelines',
      severity: 'error',
      context: {
        categories: moderationResult.categories,
        flaggedPhrases: moderationResult.flaggedPhrases,
      },
    }
    return {
      isValid: false,
      sanitized,
      warnings,
      blocked,
      tokenCount,
    }
  }

  // 5. Check phase relevance (soft warning only)
  if (state.currentPhase) {
    const phaseIssues = validatePhaseRelevance(sanitized, state.currentPhase)
    warnings.push(...phaseIssues)
  }

  // 6. Sanitize message (remove potential HTML/script tags)
  sanitized = sanitizeMessage(sanitized)

  return {
    isValid: true,
    sanitized,
    warnings,
    tokenCount,
  }
}

// ============================================
// MESSAGE SANITIZATION
// ============================================

/**
 * Sanitize message by removing potentially harmful content
 */
function sanitizeMessage(message: string): string {
  let sanitized = message

  // Remove potential HTML tags (but keep markdown)
  sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  sanitized = sanitized.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  sanitized = sanitized.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')

  // Remove null bytes and other control characters (except newlines/tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Normalize whitespace (but preserve intentional line breaks)
  sanitized = sanitized.replace(/[ \t]+/g, ' ')
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n')

  return sanitized.trim()
}

// ============================================
// QUICK VALIDATION HELPERS
// ============================================

/**
 * Quick check if input is safe (without full validation)
 */
export function isInputSafe(message: string): boolean {
  // Quick checks only
  if (message.length > MAX_MESSAGE_LENGTH) return false

  const hasInjection = INJECTION_PATTERNS.some(
    ({ pattern, severity }) => severity === 'error' && pattern.test(message)
  )
  if (hasInjection) return false

  const moderation = moderateContent(message)
  return moderation.isSafe
}

/**
 * Get a quick token estimate for a message
 */
export function getTokenEstimate(message: string): number {
  return estimateTokenCount(message)
}

// ============================================
// AGENT-SPECIFIC INPUT VALIDATION
// ============================================

/**
 * Validate input for a specific agent context
 */
export async function validateInputForAgent(
  state: WritersRoomState,
  agentRole: string
): Promise<InputValidationResult> {
  // Get the last user message from state
  const messages = state.messages || []
  const lastHumanMessage = messages
    .slice()
    .reverse()
    .find(m => m._getType() === 'human')

  if (!lastHumanMessage) {
    return {
      isValid: true,
      sanitized: '',
      warnings: [],
    }
  }

  const content =
    typeof lastHumanMessage.content === 'string'
      ? lastHumanMessage.content
      : JSON.stringify(lastHumanMessage.content)

  return validateUserInput(content, state)
}
