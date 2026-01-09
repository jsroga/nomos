/**
 * Anti-Slop Validator
 * 
 * Guardrail that detects AI slop in agent outputs.
 * Uses the magic-score evaluator for detection.
 */

import { ValidationResult, Validator } from '../runnable-guard'
import { WritersRoomState } from '../../graph/state'
import { magicScoreHeuristic } from '@/evaluation/evaluators/magic-score'
import { STORYTELLER_CONFIG } from '../../config/storyteller-config'

/**
 * Anti-Slop Validator for use in RunnableGuard
 * 
 * Detects AI-generated "slop" - generic, predictable, clichéd content.
 * Can be configured to warn or block based on severity.
 */
export class AntiSlopValidator implements Validator<Partial<WritersRoomState>> {
  name = 'AntiSlop'
  private threshold: number
  private blockOnCritical: boolean
  
  constructor(options?: { threshold?: number; blockOnCritical?: boolean }) {
    this.threshold = options?.threshold ?? STORYTELLER_CONFIG.guardrails.antiSlop.threshold
    this.blockOnCritical = options?.blockOnCritical ?? STORYTELLER_CONFIG.guardrails.antiSlop.blockOnCritical
  }
  
  async validate(output: Partial<WritersRoomState>): Promise<ValidationResult> {
    // Extract content to check
    const messages = output.messages || []
    const lastMessage = messages[messages.length - 1]
    const content = lastMessage 
      ? (typeof lastMessage.content === 'string' ? lastMessage.content : '')
      : ''
    
    // Skip validation for short content
    if (content.length < STORYTELLER_CONFIG.guardrails.antiSlop.minContentLength) {
      return { isValid: true, issues: [] }
    }
    
    // Run fast heuristic check
    const result = await magicScoreHeuristic.evaluate({
      input: {},
      output: { response: content },
    })
    
    const magicScore = (result.metadata as any)?.overallMagic || 50
    const dimensions = (result.metadata as any)?.dimensions || {}
    
    // Determine severity based on score
    const isCritical = magicScore < 30
    const isWarning = magicScore < this.threshold
    
    if (isCritical && this.blockOnCritical) {
      return {
        isValid: false,
        issues: [{
          code: 'AI_SLOP_CRITICAL',
          message: `Critical AI slop detected (score: ${magicScore.toFixed(0)}/100). Content is too generic/predictable.`,
          severity: 'error',
          context: {
            magicScore,
            dimensions,
            reasoning: result.reasoning,
          },
        }],
      }
    }
    
    if (isWarning) {
      return {
        isValid: true,  // Don't block, just warn
        issues: [{
          code: 'AI_SLOP_DETECTED',
          message: `Low creativity score (${magicScore.toFixed(0)}/100). Consider making output more specific and original.`,
          severity: 'warning',
          context: {
            magicScore,
            dimensions,
            reasoning: result.reasoning,
            suggestions: getSlopSuggestions(dimensions),
          },
        }],
      }
    }
    
    return { isValid: true, issues: [] }
  }
}

/**
 * Generate specific suggestions based on dimension scores
 */
function getSlopSuggestions(dimensions: Record<string, number>): string[] {
  const suggestions: string[] = []
  
  if (dimensions.lexicalDiversity < 50) {
    suggestions.push('Use more varied vocabulary - avoid repeating the same words')
  }
  
  if (dimensions.structuralUnpredictability < 50) {
    suggestions.push('Subvert expectations - avoid formulaic story structures')
  }
  
  if (dimensions.dialogueAuthenticity < 50) {
    suggestions.push('Make dialogue more natural - use fragments, interruptions, subtext')
  }
  
  if (dimensions.emotionalSpecificity < 50) {
    suggestions.push('Show specific emotions through actions, not generic descriptions')
  }
  
  if (dimensions.phraseOriginality < 50) {
    suggestions.push('Replace clichéd phrases with fresh, specific alternatives')
  }
  
  return suggestions
}

/**
 * Factory function to create validator with config
 */
export function createAntiSlopValidator(options?: {
  threshold?: number
  blockOnCritical?: boolean
}): AntiSlopValidator {
  return new AntiSlopValidator(options)
}

