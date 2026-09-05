/**
 * Mastra createScorer wrappers around the pure structural metrics.
 * Headline scores are 0–1 for Studio; full metrics and flags live in reason.
 */

import { createScorer } from '@mastra/core/evals'
import { recordFromJson, readString, stringArrayFromJson } from '../../src/shared/data/json-guards'
import { dumpedBeatFromUnknown } from './beat-text'
import { ScorerId } from './constants'
import {
  castPeopleFromUnknown,
  lexiconEntriesFromUnknown,
  matchingRulesFromUnknown,
} from './phrase-match'
import { scoreCausalGraph } from './s1-causal-graph'
import { scorePlanCoverage } from './s2-plan-coverage'
import { scoreSetupPayoff } from './s3-setup-payoff'
import { scoreCanonViolation } from './s5-canon-violation'
import { scoreCharacterFieldAdherence } from './s6-character-field'
import { scoreSchemaValidity } from './s7-schema-validity'
import { scoreSlopRate } from './s8-slop-rate'
import { scoreSelfRepetition } from './s9-self-repetition'
import { scoreVoiceDistinctiveness } from './s10-voice-distinctiveness'
import type { CastPerson, DumpedBeat, MatchingRules, StructuralScore } from './types'

const CANON_PER_THOUSAND_CAP = 100
const SLOP_PER_THOUSAND_CAP = 10
const S6_FIELDS = ['wants', 'fears', 'wontBreak', 'desires', 'actualMotivation', 'willNotBreak'] as const
const S6_NOT_APPLICABLE = 'NOT_APPLICABLE: cast psychology has no wants, fears, or wontBreak'
const S9_CROSS_RUN = 'NOT_APPLICABLE: single run; cross-run similarity cannot be computed'

interface RunContext {
  planPoints: string[]
  lexicon: ReturnType<typeof lexiconEntriesFromUnknown>
  cast: CastPerson[]
  corpus: string[]
  rules: MatchingRules
  rawBeats: unknown[]
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function metricNumber(score: StructuralScore, key: string): number {
  const value = score.metrics[key]
  return typeof value === 'number' ? value : 0
}

function outputUnknown(output: unknown): unknown {
  if (typeof output === 'string') {
    try {
      return JSON.parse(output)
    } catch {
      return output
    }
  }
  return output
}

function rawBeatRows(output: unknown): unknown[] {
  const parsed = outputUnknown(output)
  if (Array.isArray(parsed)) return parsed
  const beats = recordFromJson(parsed).beats
  return Array.isArray(beats) ? beats : []
}

function dumpedBeats(output: unknown): DumpedBeat[] {
  const beats: DumpedBeat[] = []
  for (const row of rawBeatRows(output)) {
    const beat = dumpedBeatFromUnknown(row)
    if (beat) beats.push(beat)
  }
  return beats
}

function runContext(input: unknown, output: unknown): RunContext {
  const row = recordFromJson(input)
  const lexiconSource = row.lexicon === undefined ? row : row.lexicon
  const castSource = row.cast === undefined ? row : row.cast
  const matchingSource = row.matchingRules ?? row.matching ?? {}
  return {
    planPoints: stringArrayFromJson(row.planPoints),
    lexicon: lexiconEntriesFromUnknown(lexiconSource),
    cast: castPeopleFromUnknown(castSource),
    corpus: stringArrayFromJson(row.corpus),
    rules: matchingRulesFromUnknown(matchingSource),
    rawBeats: rawBeatRows(output),
  }
}

function reasonJson(score: StructuralScore, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    metrics: score.metrics,
    flags: score.flags,
    ...extra,
  })
}

function castHasBehaviouralFields(cast: readonly CastPerson[]): boolean {
  for (const person of cast) {
    for (const field of S6_FIELDS) {
      const value = readString(person.psychology[field])
      if (value && value.length > 0) return true
    }
  }
  return false
}

export const causalGraphScorer = createScorer({
  id: ScorerId.CausalGraph,
  name: 'Causal Graph Integrity',
  description: 'Share of beats after beat 1 with non-empty causalDependencies',
})
  .generateScore(({ run }) => clamp01(metricNumber(scoreCausalGraph(dumpedBeats(run.output)), 'shareNonEmptyCausal')))
  .generateReason(({ run }) => reasonJson(scoreCausalGraph(dumpedBeats(run.output))))

export const planCoverageScorer = createScorer({
  id: ScorerId.PlanCoverage,
  name: 'Plan Coverage Evenness',
  description: 'How evenly beats map onto the frozen 10-point plan',
})
  .generateScore(({ run }) => {
    const ctx = runContext(run.input, run.output)
    const scored = scorePlanCoverage(dumpedBeats(run.output), ctx.planPoints)
    return clamp01(1 / (1 + metricNumber(scored, 'coverageVariance')))
  })
  .generateReason(({ run }) => {
    const ctx = runContext(run.input, run.output)
    return reasonJson(scorePlanCoverage(dumpedBeats(run.output), ctx.planPoints))
  })

export const setupPayoffScorer = createScorer({
  id: ScorerId.SetupPayoff,
  name: 'Setup Payoff Distance',
  description: 'Entities first mentioned in the final third that appear in climax or resolution',
})
  .generateScore(({ run }) => {
    const ctx = runContext(run.input, run.output)
    const scored = scoreSetupPayoff(dumpedBeats(run.output), ctx.lexicon, ctx.rules)
    const tracked = Math.max(metricNumber(scored, 'trackedEntityCount'), 1)
    return clamp01(1 - metricNumber(scored, 'lateClimaxIntroductionCount') / tracked)
  })
  .generateReason(({ run }) => {
    const ctx = runContext(run.input, run.output)
    return reasonJson(scoreSetupPayoff(dumpedBeats(run.output), ctx.lexicon, ctx.rules))
  })

export const canonViolationScorer = createScorer({
  id: ScorerId.CanonViolation,
  name: 'Canon Violation',
  description: 'Unknown lexicon entities per thousand tokens; new characters listed separately',
})
  .generateScore(({ run }) => {
    const ctx = runContext(run.input, run.output)
    const scored = scoreCanonViolation(dumpedBeats(run.output), ctx.lexicon, ctx.cast, ctx.rules)
    return clamp01(1 - metricNumber(scored, 'unknownEntityPerThousandTokens') / CANON_PER_THOUSAND_CAP)
  })
  .generateReason(({ run }) => {
    const ctx = runContext(run.input, run.output)
    return reasonJson(scoreCanonViolation(dumpedBeats(run.output), ctx.lexicon, ctx.cast, ctx.rules))
  })

export const characterFieldScorer = createScorer({
  id: ScorerId.CharacterField,
  name: 'Character Field Adherence',
  description: 'Contradictions of wants, fears, and wontBreak on the frozen cast',
})
  .generateScore(({ run }) => {
    const ctx = runContext(run.input, run.output)
    if (!castHasBehaviouralFields(ctx.cast)) return 0
    const scored = scoreCharacterFieldAdherence(dumpedBeats(run.output), ctx.cast, ctx.rules)
    return metricNumber(scored, 'wontBreakHardFailCount') > 0 ? 0 : 1
  })
  .generateReason(({ run }) => {
    const ctx = runContext(run.input, run.output)
    if (!castHasBehaviouralFields(ctx.cast)) return S6_NOT_APPLICABLE
    return reasonJson(scoreCharacterFieldAdherence(dumpedBeats(run.output), ctx.cast, ctx.rules))
  })

export const schemaValidityScorer = createScorer({
  id: ScorerId.SchemaValidity,
  name: 'Schema Validity',
  description: 'Parse rate of dumped beat rows against the fixture schema',
})
  .generateScore(({ run }) => clamp01(metricNumber(scoreSchemaValidity(runContext(run.input, run.output).rawBeats), 'parseRate')))
  .generateReason(({ run }) => reasonJson(scoreSchemaValidity(runContext(run.input, run.output).rawBeats)))

export const slopRateScorer = createScorer({
  id: ScorerId.SlopRate,
  name: 'Slop Rate',
  description: 'Negative-corpus phrase hits per thousand tokens',
})
  .generateScore(({ run }) => {
    const ctx = runContext(run.input, run.output)
    const scored = scoreSlopRate(dumpedBeats(run.output), ctx.corpus)
    return clamp01(1 - metricNumber(scored, 'hitsPerThousandTokens') / SLOP_PER_THOUSAND_CAP)
  })
  .generateReason(({ run }) => {
    const ctx = runContext(run.input, run.output)
    return reasonJson(scoreSlopRate(dumpedBeats(run.output), ctx.corpus))
  })

export const selfRepetitionScorer = createScorer({
  id: ScorerId.SelfRepetition,
  name: 'Self Repetition',
  description: 'Intra-set distinct-3; cross-run similarity is NOT_APPLICABLE on a single run',
})
  .generateScore(({ run }) => clamp01(metricNumber(scoreSelfRepetition(dumpedBeats(run.output)), 'distinct3')))
  .generateReason(({ run }) =>
    reasonJson(scoreSelfRepetition(dumpedBeats(run.output)), {
      pairwiseSimilarityMean: S9_CROSS_RUN,
    }),
  )

export const voiceDistinctivenessScorer = createScorer({
  id: ScorerId.VoiceDistinctiveness,
  name: 'Voice Distinctiveness',
  description: 'Minimum pairwise function-word and 3-gram divergence across speakers',
})
  .generateScore(({ run }) =>
    clamp01(metricNumber(scoreVoiceDistinctiveness(dumpedBeats(run.output)), 'minPairwiseDivergence'))
  )
  .generateReason(({ run }) => reasonJson(scoreVoiceDistinctiveness(dumpedBeats(run.output))))

export const STRUCTURAL_MASTRA_SCORERS = {
  [ScorerId.CausalGraph]: causalGraphScorer,
  [ScorerId.PlanCoverage]: planCoverageScorer,
  [ScorerId.SetupPayoff]: setupPayoffScorer,
  [ScorerId.CanonViolation]: canonViolationScorer,
  [ScorerId.CharacterField]: characterFieldScorer,
  [ScorerId.SchemaValidity]: schemaValidityScorer,
  [ScorerId.SlopRate]: slopRateScorer,
  [ScorerId.SelfRepetition]: selfRepetitionScorer,
  [ScorerId.VoiceDistinctiveness]: voiceDistinctivenessScorer,
} as const

export const STRUCTURAL_EXPERIMENT_SCORERS = [
  causalGraphScorer,
  planCoverageScorer,
  setupPayoffScorer,
  canonViolationScorer,
  schemaValidityScorer,
  slopRateScorer,
  selfRepetitionScorer,
  voiceDistinctivenessScorer,
] as const
