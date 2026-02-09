/**
 * Psychological Hook Judge
 *
 * Evaluates the presence and quality of engagement drivers in game loops.
 * Checks for:
 * - Clear psychological hooks (variable rewards, loss aversion, etc.)
 * - Player experience articulation
 * - Satisfaction peak identification
 * - Compulsion loop appropriateness
 * - Ethical engagement (not exploitative)
 */

import { BaseLLMJudge, JudgeResult } from './base-judge'
import { ScoreName } from '../engine/scores'

interface GameLoop {
  name?: string
  type?: string
  psychologicalHook?: string
  playerExperience?: string
  satisfactionPeak?: string
  cycleDuration?: {
    min?: number
    max?: number
    unit?: string
  }
}

interface HookEvalInput {
  loops?: GameLoop[]
  targetAudience?: string
  genre?: string
}

interface HookEvalExpected {
  shouldHaveClearHook?: boolean
  expectedHookTypes?: string[]
}

// Common psychological hook patterns
const HOOK_PATTERNS = {
  variable_reward: ['variable', 'random', 'chance', 'loot', 'gacha', 'surprise'],
  progression: ['progress', 'level', 'upgrade', 'unlock', 'grow', 'improve'],
  loss_aversion: ['loss', 'protect', 'save', 'preserve', 'defend', 'keep'],
  social: ['friend', 'guild', 'compete', 'leaderboard', 'share', 'community'],
  mastery: ['skill', 'master', 'perfect', 'challenge', 'learn', 'improve'],
  collection: ['collect', 'complete', 'gather', 'achieve', 'trophy', 'badge'],
  curiosity: ['discover', 'explore', 'reveal', 'mystery', 'secret', 'find'],
  fomo: ['limited', 'exclusive', 'daily', 'expire', 'miss', 'streak'],
}

// Potentially exploitative patterns to flag
const EXPLOITATIVE_PATTERNS = [
  'gambling',
  'addiction',
  'whale',
  'manipulate',
  'exploit',
  'predatory',
  'dark pattern',
  'pressure',
  'shame',
  'guilt',
]

export class PsychologicalHookJudge extends BaseLLMJudge {
  name = 'PsychologicalHookJudge'
  scoreName = ScoreName.PSYCHOLOGICAL_HOOK

  async evaluate(
    input: HookEvalInput,
    output: any,
    expected?: HookEvalExpected
  ): Promise<JudgeResult> {
    const loops = this.extractLoops(output)
    const issues: string[] = []
    const findings: string[] = []
    let score = 1

    if (loops.length === 0) {
      if (expected?.shouldHaveClearHook) {
        return {
          score: 0,
          scoreName: this.scoreName,
          reason: 'No loops found to evaluate psychological hooks',
          metadata: { loopCount: 0 },
        }
      }
      return {
        score: 1,
        scoreName: this.scoreName,
        reason: 'No loops to evaluate',
        metadata: { loopCount: 0 },
      }
    }

    const detectedHooks: Set<string> = new Set()
    let totalHookScore = 0

    for (const loop of loops) {
      const { hookScore, hookTypes, loopIssues, loopFindings } = this.evaluateLoop(loop, input)
      totalHookScore += hookScore
      hookTypes.forEach(h => detectedHooks.add(h))
      issues.push(...loopIssues.map(i => `[${loop.name || 'Unknown'}] ${i}`))
      findings.push(...loopFindings.map(f => `[${loop.name || 'Unknown'}] ${f}`))
    }

    // Average hook score across loops
    score = totalHookScore / loops.length

    // Check expected hook types
    if (expected?.expectedHookTypes) {
      const missingHooks = expected.expectedHookTypes.filter(
        h => !detectedHooks.has(h.toLowerCase())
      )
      if (missingHooks.length > 0) {
        issues.push(`Missing expected hooks: ${missingHooks.join(', ')}`)
        score -= 0.1 * missingHooks.length
      }
    }

    // Check for ethical concerns
    const ethicalIssues = this.checkEthicalConcerns(loops)
    if (ethicalIssues.length > 0) {
      issues.push(...ethicalIssues)
      score -= 0.2 * ethicalIssues.length
    }

    return {
      score: this.normalizeScore(score),
      scoreName: this.scoreName,
      reason:
        issues.length > 0
          ? `Hook issues: ${issues.slice(0, 3).join('; ')}${issues.length > 3 ? '...' : ''}`
          : `Detected hooks: ${Array.from(detectedHooks).join(', ') || 'None explicitly stated'}`,
      metadata: {
        loopCount: loops.length,
        detectedHooks: Array.from(detectedHooks),
        issueCount: issues.length,
        issues: issues.slice(0, 10),
        findings: findings.slice(0, 10),
      },
    }
  }

  private extractLoops(output: any): GameLoop[] {
    if (!output) return []
    if (Array.isArray(output)) return output
    if (output.loops) return output.loops
    if (output.payload?.loops) return output.payload.loops
    if (output.coreLoop) return [output.coreLoop]
    if (output.name && output.type) return [output]
    return []
  }

  private evaluateLoop(
    loop: GameLoop,
    input: HookEvalInput
  ): {
    hookScore: number
    hookTypes: string[]
    loopIssues: string[]
    loopFindings: string[]
  } {
    const hookTypes: string[] = []
    const loopIssues: string[] = []
    const loopFindings: string[] = []
    let hookScore = 0.5 // Base score

    // Check for psychological hook definition
    if (loop.psychologicalHook) {
      hookScore += 0.3
      const hookText = loop.psychologicalHook.toLowerCase()

      // Identify hook patterns
      for (const [hookType, keywords] of Object.entries(HOOK_PATTERNS)) {
        if (keywords.some(kw => hookText.includes(kw))) {
          hookTypes.push(hookType)
          loopFindings.push(`Detected ${hookType} hook`)
        }
      }

      // Validate hook quality
      if (loop.psychologicalHook.length < 20) {
        loopIssues.push('Hook description too brief')
        hookScore -= 0.1
      }
    } else {
      loopIssues.push('No psychological hook defined')
      hookScore -= 0.2
    }

    // Check for player experience
    if (loop.playerExperience) {
      hookScore += 0.1
      loopFindings.push('Player experience articulated')
    }

    // Check for satisfaction peak
    if (loop.satisfactionPeak) {
      hookScore += 0.1
      loopFindings.push('Satisfaction peak identified')
    }

    // Loop type specific checks
    if (loop.type) {
      const loopType = loop.type.toLowerCase()

      if (loopType.includes('compulsion')) {
        // Compulsion loops should have short cycles
        if (loop.cycleDuration?.min !== undefined && loop.cycleDuration.min > 60) {
          loopIssues.push('Compulsion loop cycle too long (>60s)')
          hookScore -= 0.1
        }
      }

      if (loopType.includes('social') && !hookTypes.includes('social')) {
        loopIssues.push('Social loop without social hooks')
        hookScore -= 0.15
      }

      if (loopType.includes('meta')) {
        // Meta loops should have progression hooks
        if (!hookTypes.includes('progression') && !hookTypes.includes('collection')) {
          loopIssues.push('Meta loop without long-term progression hook')
          hookScore -= 0.1
        }
      }
    }

    // Audience appropriateness
    if (input.targetAudience === 'casual') {
      if (hookTypes.includes('mastery') && !hookTypes.includes('progression')) {
        loopIssues.push('Mastery-focused hook may frustrate casual players without progression')
        hookScore -= 0.1
      }
    }

    return {
      hookScore: Math.max(0, Math.min(1, hookScore)),
      hookTypes,
      loopIssues,
      loopFindings,
    }
  }

  private checkEthicalConcerns(loops: GameLoop[]): string[] {
    const concerns: string[] = []

    for (const loop of loops) {
      const textToCheck = [
        loop.psychologicalHook || '',
        loop.playerExperience || '',
        loop.satisfactionPeak || '',
      ]
        .join(' ')
        .toLowerCase()

      for (const pattern of EXPLOITATIVE_PATTERNS) {
        if (textToCheck.includes(pattern)) {
          concerns.push(`Potentially exploitative pattern detected: "${pattern}"`)
          break // Only flag once per loop
        }
      }
    }

    return concerns
  }
}
