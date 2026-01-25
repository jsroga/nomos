/**
 * Anti-Slop Validator
 *
 * Guardrail that detects AI slop in agent outputs.
 * Uses the magic-score LLM evaluator for detection (requires ANTHROPIC_API_KEY).
 */

import { ValidationResult, Validator } from '../runnable-guard'
import { WritersRoomState } from '../../graph/state'
import { magicScoreEvaluator } from '@/evaluation/evaluators/magic-score'
import { STORYTELLER_CONFIG } from '../../config/storyteller-config'

/**
 * Anti-Slop Validator for use in RunnableGuard
 *
 * Detects AI-generated "slop" - generic, predictable, clichéd content.
 * REQUIRES ANTHROPIC_API_KEY for LLM-based evaluation.
 * Can be configured to warn or block based on severity.
 */
export class AntiSlopValidator implements Validator<Partial<WritersRoomState>> {
  name = 'AntiSlop'
  private threshold: number
  private blockOnCritical: boolean

  constructor(options?: { threshold?: number; blockOnCritical?: boolean }) {
    this.threshold = options?.threshold ?? STORYTELLER_CONFIG.guardrails.antiSlop.threshold
    this.blockOnCritical =
      options?.blockOnCritical ?? STORYTELLER_CONFIG.guardrails.antiSlop.blockOnCritical
  }

  async validate(output: Partial<WritersRoomState>): Promise<ValidationResult> {
    // Extract content to check
    const messages = output.messages || []
    const lastMessage = messages[messages.length - 1]
    const content = lastMessage
      ? typeof lastMessage.content === 'string'
        ? lastMessage.content
        : ''
      : ''

    // Skip validation for short content
    if (content.length < STORYTELLER_CONFIG.guardrails.antiSlop.minContentLength) {
      return { isValid: true, issues: [] }
    }

    // Run LLM-based evaluation (requires ANTHROPIC_API_KEY)
    const result = await magicScoreEvaluator.evaluate({
      input: {},
      output: { response: content },
    })

    // If evaluation failed (no API key), skip validation
    if ((result.metadata as any)?.error) {
      console.warn('AntiSlopValidator: Skipping - ANTHROPIC_API_KEY not configured')
      return { isValid: true, issues: [] }
    }

    const magicScore = (result.metadata as any)?.overallMagic || 0
    const dimensions = (result.metadata as any)?.dimensions || {}
    const slopAlerts = (result.metadata as any)?.slopAlerts || []

    // Determine severity based on score
    const isCritical = magicScore < 30
    const isWarning = magicScore < this.threshold

    if (isCritical && this.blockOnCritical) {
      return {
        isValid: false,
        issues: [
          {
            code: 'AI_SLOP_CRITICAL',
            message: `Critical AI slop detected (score: ${magicScore.toFixed(0)}/100). Content is too generic/predictable.`,
            severity: 'error',
            context: {
              magicScore,
              dimensions,
              slopAlerts,
              reasoning: result.reasoning,
            },
          },
        ],
      }
    }

    if (isWarning) {
      return {
        isValid: true, // Don't block, just warn
        issues: [
          {
            code: 'AI_SLOP_DETECTED',
            message: `Low creativity score (${magicScore.toFixed(0)}/100). Consider making output more specific and original.`,
            severity: 'warning',
            context: {
              magicScore,
              dimensions,
              slopAlerts,
              reasoning: result.reasoning,
              suggestion: (result.metadata as any)?.suggestion,
            },
          },
        ],
      }
    }

    return { isValid: true, issues: [] }
  }
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
