/**
 * Haute Game Judge
 *
 * Evaluates game designs against the unified framework combining:
 * - Klei's systemic elegance
 * - CDPR's narrative depth
 * - Kojima's meaningful connection
 *
 * The ultimate question: "Would players tell stories about what happened to them?"
 */

import { BaseLLMJudge, JudgeResult } from './base-judge'
import { ScoreName } from '../engine/scores'

/** A trace type element with interactability */
interface TraceType {
  interactable?: boolean
  [key: string]: unknown
}

/** A learning scenario with optional explicit instruction flag */
interface LearningScenario {
  explicitInstruction?: boolean
  [key: string]: unknown
}

/** A ritual with optional emotional payoff */
interface Ritual {
  emotionalPayoff?: string
  [key: string]: unknown
}

/** Aggregate layer output with nested arrays and scores */
interface LayerOutput {
  verbs?: unknown[]
  nouns?: unknown[]
  rules?: unknown[]
  emergentCombos?: unknown[]
  systemEleganceScore?: number
  events?: unknown[]
  rumors?: unknown[]
  questTriggers?: unknown[]
  worldMemoryDepth?: number
  choices?: unknown[]
  traceTypes?: TraceType[]
  legacyElements?: unknown[]
  sharedChallenges?: unknown[]
  connectionMeaningScore?: number
  scenarios?: LearningScenario[]
  breadcrumbs?: unknown[]
  safeFailureZones?: unknown[]
  discoveryRespectScore?: number
  rituals?: Ritual[]
  frictionPoints?: unknown[]
  quietMoments?: unknown[]
  mundaneBeautyScore?: number
}

interface HauteGameOutput {
  // Atomic Loom outputs
  verbs?: unknown[]
  nouns?: unknown[]
  rules?: unknown[]
  emergentCombos?: unknown[]
  systemEleganceScore?: number

  // Memory Keeper outputs
  events?: unknown[]
  rumors?: unknown[]
  questTriggers?: unknown[]
  worldMemoryDepth?: number

  // Grey Palette outputs
  choices?: unknown[]
  consequences?: unknown[]
  factionTensions?: unknown[]
  moralComplexityScore?: number

  // Strand Weaver outputs
  traceTypes?: TraceType[]
  legacyElements?: unknown[]
  sharedChallenges?: unknown[]
  connectionMeaningScore?: number

  // Silent Teacher outputs
  scenarios?: LearningScenario[]
  breadcrumbs?: unknown[]
  safeFailureZones?: unknown[]
  discoveryRespectScore?: number

  // Mundane Poet outputs
  rituals?: Ritual[]
  frictionPoints?: unknown[]
  quietMoments?: unknown[]
  mundaneBeautyScore?: number

  // Combined outputs
  atomicSystems?: LayerOutput
  worldMemory?: LayerOutput
  moralChoices?: LayerOutput
  strandConnections?: LayerOutput
  implicitLearning?: LayerOutput
  meaningfulMundane?: LayerOutput

  // Direct scores
  overallScores?: {
    systemElegance?: number
    narrativeIntegration?: number
    connectionMeaning?: number
    discoveryRespect?: number
    mundaneBeauty?: number
    cohesion?: number
  }

  // The ultimate test
  wouldPlayersTellStories?: boolean
  storyPotentialExamples?: string[]
}

interface HauteGameExpected {
  minSystemElegance?: number
  minNarrativeIntegration?: number
  minConnectionMeaning?: number
  minDiscoveryRespect?: number
  minMundaneBeauty?: number
  minCohesion?: number
  shouldHaveEmergentCombos?: boolean
  shouldHaveMoralChoices?: boolean
  shouldHaveStrandConnections?: boolean
}

export class HauteGameJudge extends BaseLLMJudge {
  name = 'HauteGameJudge'
  scoreName = ScoreName.HAUTE_GAME

  async evaluate(
    _input: unknown,
    output: HauteGameOutput,
    expected?: HauteGameExpected
  ): Promise<JudgeResult> {
    const scores = this.calculateScores(output)
    const issues: string[] = []

    // Check against expectations
    if (expected?.minSystemElegance && scores.systemElegance < expected.minSystemElegance) {
      issues.push(
        `System elegance ${scores.systemElegance.toFixed(1)} below minimum ${expected.minSystemElegance}`
      )
    }
    if (
      expected?.minNarrativeIntegration &&
      scores.narrativeIntegration < expected.minNarrativeIntegration
    ) {
      issues.push(
        `Narrative integration ${scores.narrativeIntegration.toFixed(1)} below minimum ${expected.minNarrativeIntegration}`
      )
    }
    if (
      expected?.minConnectionMeaning &&
      scores.connectionMeaning < expected.minConnectionMeaning
    ) {
      issues.push(
        `Connection meaning ${scores.connectionMeaning.toFixed(1)} below minimum ${expected.minConnectionMeaning}`
      )
    }
    if (expected?.minDiscoveryRespect && scores.discoveryRespect < expected.minDiscoveryRespect) {
      issues.push(
        `Discovery respect ${scores.discoveryRespect.toFixed(1)} below minimum ${expected.minDiscoveryRespect}`
      )
    }
    if (expected?.minMundaneBeauty && scores.mundaneBeauty < expected.minMundaneBeauty) {
      issues.push(
        `Mundane beauty ${scores.mundaneBeauty.toFixed(1)} below minimum ${expected.minMundaneBeauty}`
      )
    }
    if (expected?.minCohesion && scores.cohesion < expected.minCohesion) {
      issues.push(`Cohesion ${scores.cohesion.toFixed(1)} below minimum ${expected.minCohesion}`)
    }

    // Check for required elements
    if (expected?.shouldHaveEmergentCombos) {
      const hasEmergent =
        (output.emergentCombos?.length || 0) > 0 ||
        (output.atomicSystems?.emergentCombos?.length || 0) > 0
      if (!hasEmergent) {
        issues.push(
          'Missing emergent combinations - players should discover unplanned interactions'
        )
      }
    }

    if (expected?.shouldHaveMoralChoices) {
      const hasMoral =
        (output.choices?.length || 0) > 0 || (output.moralChoices?.choices?.length || 0) > 0
      if (!hasMoral) {
        issues.push('Missing moral choices - players should face impossible dilemmas')
      }
    }

    if (expected?.shouldHaveStrandConnections) {
      const hasStrands =
        (output.traceTypes?.length || 0) > 0 ||
        (output.strandConnections?.traceTypes?.length || 0) > 0
      if (!hasStrands) {
        issues.push('Missing strand connections - players should leave traces for others')
      }
    }

    // Calculate final score
    const finalScore = this.calculateFinalScore(scores, issues.length)

    // Determine if players would tell stories
    const wouldTellStories = this.assessStoryPotential(output, scores)

    return {
      score: finalScore,
      scoreName: this.scoreName,
      reason: this.generateReason(scores, issues, wouldTellStories),
      metadata: {
        scores,
        issues,
        wouldPlayersTellStories: wouldTellStories,
        layersPresent: this.countLayersPresent(output),
      },
    }
  }

  private calculateScores(output: HauteGameOutput) {
    // Use provided scores or calculate from output
    const systemElegance =
      output.systemEleganceScore ??
      output.atomicSystems?.systemEleganceScore ??
      output.overallScores?.systemElegance ??
      this.calculateSystemElegance(output)

    const narrativeIntegration =
      output.worldMemoryDepth ??
      output.worldMemory?.worldMemoryDepth ??
      output.overallScores?.narrativeIntegration ??
      this.calculateNarrativeIntegration(output)

    const connectionMeaning =
      output.connectionMeaningScore ??
      output.strandConnections?.connectionMeaningScore ??
      output.overallScores?.connectionMeaning ??
      this.calculateConnectionMeaning(output)

    const discoveryRespect =
      output.discoveryRespectScore ??
      output.implicitLearning?.discoveryRespectScore ??
      output.overallScores?.discoveryRespect ??
      this.calculateDiscoveryRespect(output)

    const mundaneBeauty =
      output.mundaneBeautyScore ??
      output.meaningfulMundane?.mundaneBeautyScore ??
      output.overallScores?.mundaneBeauty ??
      this.calculateMundaneBeauty(output)

    const cohesion = output.overallScores?.cohesion ?? this.calculateCohesion(output)

    return {
      systemElegance: this.clamp(systemElegance, 0, 10),
      narrativeIntegration: this.clamp(narrativeIntegration, 0, 10),
      connectionMeaning: this.clamp(connectionMeaning, 0, 10),
      discoveryRespect: this.clamp(discoveryRespect, 0, 10),
      mundaneBeauty: this.clamp(mundaneBeauty, 0, 10),
      cohesion: this.clamp(cohesion, 0, 10),
    }
  }

  private calculateSystemElegance(output: HauteGameOutput): number {
    let score = 5 // Baseline

    const verbCount = output.verbs?.length || output.atomicSystems?.verbs?.length || 0
    const nounCount = output.nouns?.length || output.atomicSystems?.nouns?.length || 0
    const ruleCount = output.rules?.length || output.atomicSystems?.rules?.length || 0
    const emergentCount =
      output.emergentCombos?.length || output.atomicSystems?.emergentCombos?.length || 0

    // Elegance = few rules, many outcomes
    if (verbCount > 0 && nounCount > 0) {
      const interactionPotential = verbCount * nounCount
      const actualRules = ruleCount
      const emergentRatio = emergentCount / (actualRules || 1)

      // High emergence from few rules = elegant
      if (emergentRatio > 1) score += 2
      else if (emergentRatio > 0.5) score += 1

      // Sweet spot: 3-8 verbs/nouns
      if (verbCount >= 3 && verbCount <= 8) score += 1
      if (nounCount >= 3 && nounCount <= 8) score += 1
    }

    return score
  }

  private calculateNarrativeIntegration(output: HauteGameOutput): number {
    let score = 5

    const eventCount = output.events?.length || output.worldMemory?.events?.length || 0
    const rumorCount = output.rumors?.length || output.worldMemory?.rumors?.length || 0
    const questCount =
      output.questTriggers?.length || output.worldMemory?.questTriggers?.length || 0

    if (eventCount > 0) score += 1
    if (rumorCount > 0) score += 1.5 // Rumors spreading is deep narrative
    if (questCount > 0) score += 1.5 // Events becoming quests is integration

    // Moral complexity adds to narrative
    const choiceCount = output.choices?.length || output.moralChoices?.choices?.length || 0
    if (choiceCount > 0) score += 1

    return score
  }

  private calculateConnectionMeaning(output: HauteGameOutput): number {
    let score = 5

    const traceCount =
      output.traceTypes?.length || output.strandConnections?.traceTypes?.length || 0
    const legacyCount =
      output.legacyElements?.length || output.strandConnections?.legacyElements?.length || 0
    const sharedCount =
      output.sharedChallenges?.length || output.strandConnections?.sharedChallenges?.length || 0

    if (traceCount > 0) score += 1
    if (legacyCount > 0) score += 2 // Legacies are meaningful
    if (sharedCount > 0) score += 1.5 // Shared challenges connect

    // Check if traces are interactable (more meaningful)
    const traces = output.traceTypes || output.strandConnections?.traceTypes || []
    const interactableTraces = traces.filter(t => t.interactable).length
    if (interactableTraces > 0) score += 0.5

    return score
  }

  private calculateDiscoveryRespect(output: HauteGameOutput): number {
    let score = 5

    const scenarioCount =
      output.scenarios?.length || output.implicitLearning?.scenarios?.length || 0
    const breadcrumbCount =
      output.breadcrumbs?.length || output.implicitLearning?.breadcrumbs?.length || 0
    const safeZoneCount =
      output.safeFailureZones?.length || output.implicitLearning?.safeFailureZones?.length || 0

    if (scenarioCount > 0) score += 1
    if (breadcrumbCount > 0) score += 1.5 // Breadcrumbs show respect
    if (safeZoneCount > 0) score += 1.5 // Safe failure zones show care

    // Check that no explicit instruction exists
    const scenarios = output.scenarios || output.implicitLearning?.scenarios || []
    const hasExplicit = scenarios.some(s => s.explicitInstruction === true)
    if (hasExplicit) score -= 2 // Penalty for hand-holding

    return score
  }

  private calculateMundaneBeauty(output: HauteGameOutput): number {
    let score = 5

    const ritualCount = output.rituals?.length || output.meaningfulMundane?.rituals?.length || 0
    const frictionCount =
      output.frictionPoints?.length || output.meaningfulMundane?.frictionPoints?.length || 0
    const quietCount =
      output.quietMoments?.length || output.meaningfulMundane?.quietMoments?.length || 0

    if (ritualCount > 0) score += 1.5
    if (frictionCount > 0) score += 1 // Intentional friction shows design
    if (quietCount > 0) score += 1.5 // Quiet moments are brave design

    // Check ritual quality
    const rituals = output.rituals || output.meaningfulMundane?.rituals || []
    const hasEmotionalPayoff = rituals.some(
      r => r.emotionalPayoff && r.emotionalPayoff.length > 10
    )
    if (hasEmotionalPayoff) score += 1

    return score
  }

  private calculateCohesion(output: HauteGameOutput): number {
    const layersPresent = this.countLayersPresent(output)

    // More layers = more potential for cohesion
    if (layersPresent === 0) return 0
    if (layersPresent === 1) return 5
    if (layersPresent === 2) return 6
    if (layersPresent === 3) return 7
    if (layersPresent === 4) return 8
    if (layersPresent === 5) return 9
    return 10 // All 6 layers present
  }

  private countLayersPresent(output: HauteGameOutput): number {
    let count = 0

    // Atomic Loom
    if ((output.verbs?.length || 0) > 0 || output.atomicSystems) count++

    // Memory Keeper
    if ((output.events?.length || 0) > 0 || output.worldMemory) count++

    // Grey Palette
    if ((output.choices?.length || 0) > 0 || output.moralChoices) count++

    // Strand Weaver
    if ((output.traceTypes?.length || 0) > 0 || output.strandConnections) count++

    // Silent Teacher
    if ((output.scenarios?.length || 0) > 0 || output.implicitLearning) count++

    // Mundane Poet
    if ((output.rituals?.length || 0) > 0 || output.meaningfulMundane) count++

    return count
  }

  private assessStoryPotential(output: HauteGameOutput, scores: Record<string, number>): boolean {
    // If explicitly set, use that
    if (output.wouldPlayersTellStories !== undefined) {
      return output.wouldPlayersTellStories
    }

    // Calculate based on scores
    const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length

    // High system elegance + narrative = emergent stories
    // High moral complexity + connection = shared stories
    // High mundane beauty = memorable moments

    const storyScore =
      scores.systemElegance * 0.2 +
      scores.narrativeIntegration * 0.25 +
      scores.connectionMeaning * 0.2 +
      scores.discoveryRespect * 0.1 +
      scores.mundaneBeauty * 0.1 +
      scores.cohesion * 0.15

    return storyScore >= 6
  }

  private calculateFinalScore(scores: Record<string, number>, issueCount: number): number {
    const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length
    const normalized = avgScore / 10

    // Penalize for issues
    const penalty = Math.min(issueCount * 0.05, 0.3)

    return this.normalizeScore(Math.max(0, normalized - penalty))
  }

  private generateReason(
    scores: Record<string, number>,
    issues: string[],
    wouldTellStories: boolean
  ): string {
    const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length

    let reason = ''

    if (avgScore >= 8) {
      reason = 'Excellent Haute Game design - '
    } else if (avgScore >= 6) {
      reason = 'Good Haute Game design - '
    } else if (avgScore >= 4) {
      reason = 'Developing Haute Game design - '
    } else {
      reason = 'Early stage design - '
    }

    // Highlight strengths
    const strengths: string[] = []
    if (scores.systemElegance >= 7) strengths.push('elegant systems')
    if (scores.narrativeIntegration >= 7) strengths.push('deep narrative')
    if (scores.connectionMeaning >= 7) strengths.push('meaningful connections')
    if (scores.discoveryRespect >= 7) strengths.push('player discovery')
    if (scores.mundaneBeauty >= 7) strengths.push('meaningful routine')

    if (strengths.length > 0) {
      reason += `strengths in ${strengths.join(', ')}`
    }

    // Add story potential
    reason += wouldTellStories ? '. Players WOULD tell stories.' : '. Story potential needs work.'

    // Add issues if any
    if (issues.length > 0) {
      reason += ` Issues: ${issues.slice(0, 2).join('; ')}`
    }

    return reason
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }
}
