/**
 * Balance Judge
 *
 * Evaluates the economic balance of game mechanics.
 * Checks for:
 * - Effort vs reward ratios
 * - Resource flow balance
 * - Grind detection
 * - Pay-to-win indicators
 * - Session length appropriateness
 */

import { BaseLLMJudge, JudgeResult } from './base-judge'
import { ScoreName } from '../engine/scores'

interface BalanceAnalysis {
  overallScore?: number
  economyHealth?: string
  issues?: Array<{
    severity?: string
    type?: string
    description?: string
    affectedMechanics?: string[]
    suggestedFix?: string
  }>
  recommendations?: string[]
  simulationResults?: {
    timeToFirstReward?: number
    resourcesAtSessionEnd?: Record<string, number>
    playerSatisfactionEstimate?: number
  }
}

interface Mechanic {
  name?: string
  type?: string
  balanceFactors?: {
    effort?: number
    reward?: number
    frequency?: number
  }
}

interface BalanceEvalInput {
  mechanics?: Mechanic[]
  targetAudience?: string
  sessionDurationMinutes?: number
}

interface BalanceEvalExpected {
  minBalanceScore?: number
  maxGrindRatio?: number
  shouldBeBalanced?: boolean
}

export class BalanceJudge extends BaseLLMJudge {
  name = 'BalanceJudge'
  scoreName = ScoreName.BALANCE_SCORE

  async evaluate(
    input: BalanceEvalInput,
    output: any,
    expected?: BalanceEvalExpected
  ): Promise<JudgeResult> {
    const analysis = this.extractBalanceAnalysis(output)
    const mechanics = input.mechanics || this.extractMechanics(output)
    const issues: string[] = []
    let score = 1

    // Check overall balance score if provided
    if (analysis?.overallScore !== undefined) {
      const normalizedScore = analysis.overallScore / 10
      if (expected?.minBalanceScore !== undefined) {
        const minNormalized = expected.minBalanceScore / 10
        if (normalizedScore < minNormalized) {
          issues.push(
            `Balance score ${analysis.overallScore}/10 below minimum ${expected.minBalanceScore}/10`
          )
          score -= 0.3
        }
      }
    }

    // Check economy health
    if (analysis?.economyHealth) {
      const health = analysis.economyHealth.toLowerCase()
      if (health === 'broken') {
        issues.push('Economy marked as broken')
        score -= 0.4
      } else if (health === 'inflationary' || health === 'deflationary') {
        issues.push(`Economy is ${health}`)
        score -= 0.2
      }
    }

    // Analyze effort/reward ratios in mechanics
    if (mechanics.length > 0) {
      const balanceIssues = this.analyzeMechanicBalance(mechanics, input.targetAudience)
      issues.push(...balanceIssues.issues)
      score -= balanceIssues.penalty
    }

    // Check for critical issues
    if (analysis?.issues) {
      const criticalIssues = analysis.issues.filter(i => i.severity === 'critical')
      if (criticalIssues.length > 0) {
        issues.push(`${criticalIssues.length} critical balance issues found`)
        score -= 0.2 * criticalIssues.length
      }

      // Check for grind detection
      const grindIssues = analysis.issues.filter(i => i.type === 'grind_detected')
      if (grindIssues.length > 0 && input.targetAudience === 'casual') {
        issues.push('Grind detected for casual audience')
        score -= 0.3
      }
    }

    // Check simulation results
    if (analysis?.simulationResults) {
      const sim = analysis.simulationResults

      // Time to first reward check
      if (sim.timeToFirstReward !== undefined) {
        const maxTimeByAudience = {
          casual: 30, // 30 seconds
          'mid-core': 60, // 1 minute
          hardcore: 300, // 5 minutes
        }
        const maxTime =
          maxTimeByAudience[input.targetAudience as keyof typeof maxTimeByAudience] || 60
        if (sim.timeToFirstReward > maxTime) {
          issues.push(
            `Time to first reward (${sim.timeToFirstReward}s) too long for ${input.targetAudience}`
          )
          score -= 0.15
        }
      }

      // Player satisfaction
      if (sim.playerSatisfactionEstimate !== undefined && sim.playerSatisfactionEstimate < 5) {
        issues.push(`Low player satisfaction estimate: ${sim.playerSatisfactionEstimate}/10`)
        score -= 0.2
      }
    }

    return {
      score: this.normalizeScore(score),
      scoreName: this.scoreName,
      reason:
        issues.length > 0
          ? `Balance issues: ${issues.slice(0, 3).join('; ')}${issues.length > 3 ? '...' : ''}`
          : 'Game balance appears healthy',
      metadata: {
        overallScore: analysis?.overallScore,
        economyHealth: analysis?.economyHealth,
        issueCount: issues.length,
        issues: issues.slice(0, 10),
        mechanicCount: mechanics.length,
      },
    }
  }

  private extractBalanceAnalysis(output: any): BalanceAnalysis | null {
    if (!output) return null

    // Direct balance analysis
    if (output.overallScore !== undefined || output.economyHealth) {
      return output
    }

    // Nested in payload
    if (output.payload?.balanceAnalysis) {
      return output.payload.balanceAnalysis
    }

    // Nested in result
    if (output.result?.balanceAnalysis) {
      return output.result.balanceAnalysis
    }

    return null
  }

  private extractMechanics(output: any): Mechanic[] {
    if (!output) return []
    if (output.mechanics) return output.mechanics
    if (output.payload?.mechanics) return output.payload.mechanics
    return []
  }

  private analyzeMechanicBalance(
    mechanics: Mechanic[],
    targetAudience?: string
  ): { issues: string[]; penalty: number } {
    const issues: string[] = []
    let penalty = 0

    for (const mech of mechanics) {
      if (!mech.balanceFactors) continue

      const { effort, reward, frequency } = mech.balanceFactors

      if (effort !== undefined && reward !== undefined) {
        const ratio = reward / (effort || 1)

        // Check for imbalance based on audience
        if (targetAudience === 'casual') {
          if (ratio < 1) {
            issues.push(
              `${mech.name}: Low reward/effort ratio (${ratio.toFixed(2)}) for casual players`
            )
            penalty += 0.1
          }
        } else if (targetAudience === 'hardcore') {
          if (ratio > 3) {
            issues.push(`${mech.name}: Reward too easy for hardcore players`)
            penalty += 0.05
          }
        }

        // General imbalance detection
        if (effort > 8 && reward < 3) {
          issues.push(`${mech.name}: Severe effort/reward imbalance`)
          penalty += 0.15
        }
      }
    }

    return { issues, penalty: Math.min(penalty, 0.4) }
  }
}
