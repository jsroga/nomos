/**
 * Score frozen Aeternum beats. Writes a dated baseline; never overwrites.
 *
 *   npx tsx evals/scripts/run-aeternum-baseline.ts
 */

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import {
  CanonBucket,
  castPeopleFromUnknown,
  dumpedBeatFromUnknown,
  lexiconEntriesFromUnknown,
  matchingRulesFromUnknown,
  scoreCanonViolation,
  scoreCausalGraph,
  scoreCharacterFieldAdherence,
  scorePlanCoverage,
  scoreSchemaValidity,
  scoreSelfRepetition,
  scoreSetupPayoff,
  scoreSlopRate,
  ScorerId,
} from '../structural'
import type { CastPerson, DumpedBeat, StructuralScore } from '../structural/types'

enum ResultState {
  Number = 'number',
  NotApplicable = 'NOT_APPLICABLE',
  Error = 'ERROR',
}

const WORLD_DIR = resolve(process.cwd(), 'evals/fixtures/aeternum')
const CORPUS_PATH = resolve(process.cwd(), 'evals/fixtures/structural/negative-corpus.json')
const OUT_PATH = resolve(process.cwd(), 'evals/baselines/aeternum-episode-01.2026-08-16.json')
const STRUCTURAL_DIR = resolve(process.cwd(), 'evals/structural')
const JSON_INDENT = 2

const S6_FIELDS = ['wants', 'fears', 'wontBreak', 'desires', 'actualMotivation', 'willNotBreak'] as const

interface ScorerRecord {
  state: ResultState
  value?: unknown
  reason?: string
  traceback?: string
  findings?: unknown[]
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function gitSha(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

function scorerCodeSha(): string {
  const fromGit = gitSha(['log', '-1', '--format=%H', '--', 'evals/structural'])
  if (fromGit.length > 0) return fromGit
  const files = readdirSync(STRUCTURAL_DIR)
    .filter(name => name.endsWith('.ts'))
    .sort()
  const hash = createHash('sha256')
  for (const name of files) {
    hash.update(readFileSync(join(STRUCTURAL_DIR, name)))
  }
  return hash.digest('hex')
}

function loadBeats(raw: unknown): DumpedBeat[] {
  if (!Array.isArray(raw)) {
    throw new Error('episode-01.beats.json is not an array')
  }
  const beats: DumpedBeat[] = []
  for (const row of raw) {
    const beat = dumpedBeatFromUnknown(row)
    if (!beat) {
      throw new Error('dumpedBeatFromUnknown returned null; refusing to drop a beat')
    }
    beats.push(beat)
  }
  return beats
}

function planPointsFromFrozenPlan(plan: unknown): string[] {
  const root = recordFromJson(plan)
  const premise = recordFromJson(recordFromJson(root.storyPlan).premise)
  const nested = premise.tenPointsPlan
  if (!Array.isArray(nested)) return []
  return nested.filter(item => typeof item === 'string' && item.length > 0)
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

function numbered(value: unknown, findings: unknown[] = []): ScorerRecord {
  return { state: ResultState.Number, value, findings }
}

function notApplicable(reason: string): ScorerRecord {
  return { state: ResultState.NotApplicable, reason }
}

function errored(error: unknown): ScorerRecord {
  const err = error instanceof Error ? error : new Error(String(error))
  return { state: ResultState.Error, reason: err.message, traceback: err.stack ?? err.message }
}

function runOrError(fn: () => StructuralScore, map: (score: StructuralScore) => ScorerRecord): ScorerRecord {
  try {
    return map(fn())
  } catch (error) {
    return errored(error)
  }
}

function s3Findings(score: StructuralScore): unknown[] {
  return score.flags.map(flag => {
    const row = recordFromJson(flag)
    return {
      term: row.term,
      matchedString: row.term,
      firstMentionSequence: row.firstMention,
      payoffSequence: row.sequence,
      beatType: row.beatType,
    }
  })
}

function s5Lists(score: StructuralScore): {
  unknownEntity: Array<{ matchedString: string; count: number; sequences: number[] }>
  newCharacter: Array<{ matchedString: string; count: number; sequences: number[] }>
} {
  const unknown = new Map<string, { count: number; sequences: number[] }>()
  const characters = new Map<string, { count: number; sequences: number[] }>()
  for (const flag of score.flags) {
    const row = recordFromJson(flag)
    const matched = readString(row.matchedString) ?? ''
    const sequence = typeof row.sequence === 'number' ? row.sequence : 0
    const bucket = row.bucket
    const target = bucket === CanonBucket.UnknownEntity ? unknown : characters
    const current = target.get(matched) ?? { count: 0, sequences: [] }
    current.count += 1
    current.sequences.push(sequence)
    target.set(matched, current)
  }
  const toList = (map: Map<string, { count: number; sequences: number[] }>) =>
    [...map.entries()].map(([matchedString, entry]) => ({
      matchedString,
      count: entry.count,
      sequences: entry.sequences,
    }))
  return { unknownEntity: toList(unknown), newCharacter: toList(characters) }
}

function printTable(rows: Array<{ scorer: string; state: string; value: string }>): void {
  process.stdout.write('| scorer | state | value |\n|---|---|---|\n')
  for (const row of rows) {
    process.stdout.write(`| ${row.scorer} | ${row.state} | ${row.value} |\n`)
  }
}

function main(): void {
  if (existsSync(OUT_PATH)) {
    throw new Error(`Refusing to overwrite ${OUT_PATH}`)
  }

  const beatsRaw = readJson(join(WORLD_DIR, 'episode-01.beats.json'))
  const plan = readJson(join(WORLD_DIR, 'episode-01.plan.json'))
  const lexiconRaw = readJson(join(WORLD_DIR, 'canon-lexicon.json'))
  const castRaw = readJson(join(WORLD_DIR, 'cast.json'))
  const manifest = recordFromJson(readJson(join(WORLD_DIR, 'manifest.json')))
  const corpusRaw = readJson(CORPUS_PATH)
  const corpus = Array.isArray(corpusRaw)
    ? corpusRaw.filter(item => typeof item === 'string')
    : []

  const beats = loadBeats(beatsRaw)
  const planPoints = planPointsFromFrozenPlan(plan)
  const lexicon = lexiconEntriesFromUnknown(lexiconRaw)
  const rules = matchingRulesFromUnknown(recordFromJson(lexiconRaw).matching)
  const cast = castPeopleFromUnknown(castRaw)
  const s6Applicable = castHasBehaviouralFields(cast)

  const notRun: Array<{ scorer: string; reason: string }> = [
    { scorer: ScorerId.CharacterField, reason: s6Applicable ? '' : 'cast psychology has no wants/fears/wontBreak' },
  ].filter(item => item.reason.length > 0)
  notRun.push({
    scorer: 'agency_ratio (S4)',
    reason: 'judge scorer; skipped by measurement plan',
  })

  const scorers: Record<string, ScorerRecord> = {}

  const s1 = runOrError(
    () => scoreCausalGraph(beats),
    score => numbered(score.metrics, score.flags),
  )
  scorers[ScorerId.CausalGraph] = s1
  if (s1.state === ResultState.Error) {
    finish(scorers, notRun, manifest, s1)
    return
  }

  const s2 = runOrError(
    () => scorePlanCoverage(beats, planPoints),
    score => numbered(score.metrics, score.flags),
  )
  scorers[ScorerId.PlanCoverage] = s2
  if (s2.state === ResultState.Error) {
    finish(scorers, notRun, manifest, s2)
    return
  }

  const s3 = runOrError(
    () => scoreSetupPayoff(beats, lexicon, rules),
    score => numbered(score.metrics, s3Findings(score)),
  )
  scorers[ScorerId.SetupPayoff] = s3
  if (s3.state === ResultState.Error) {
    finish(scorers, notRun, manifest, s3)
    return
  }

  const s5 = runOrError(
    () => scoreCanonViolation(beats, lexicon, cast, rules),
    score => numbered({ ...score.metrics, buckets: s5Lists(score) }, score.flags),
  )
  scorers[ScorerId.CanonViolation] = s5
  if (s5.state === ResultState.Error) {
    finish(scorers, notRun, manifest, s5)
    return
  }

  const s7 = runOrError(
    () => scoreSchemaValidity(Array.isArray(beatsRaw) ? beatsRaw : []),
    score => numbered(score.metrics, score.flags),
  )
  scorers[ScorerId.SchemaValidity] = s7
  if (s7.state === ResultState.Error) {
    finish(scorers, notRun, manifest, s7)
    return
  }

  const s8 = runOrError(
    () => scoreSlopRate(beats, corpus),
    score => numbered(score.metrics, score.flags),
  )
  scorers[ScorerId.SlopRate] = s8
  if (s8.state === ResultState.Error) {
    finish(scorers, notRun, manifest, s8)
    return
  }

  if (s6Applicable) {
    const s6 = runOrError(
      () => scoreCharacterFieldAdherence(beats, cast, rules),
      score => numbered(score.metrics, score.flags),
    )
    scorers[ScorerId.CharacterField] = s6
    if (s6.state === ResultState.Error) {
      finish(scorers, notRun, manifest, s6)
      return
    }
  } else {
    scorers[ScorerId.CharacterField] = notApplicable(
      'cast psychology has no wants, fears, or wontBreak (all records empty)',
    )
  }

  const s9 = runOrError(
    () => scoreSelfRepetition(beats),
    score =>
      numbered({
        distinct3: { state: ResultState.Number, value: score.metrics.distinct3 },
        distinct4: { state: ResultState.Number, value: score.metrics.distinct4 },
        pairwiseSimilarityMean: {
          state: ResultState.NotApplicable,
          reason: 'single run; cross-run similarity cannot be computed',
        },
      }),
  )
  scorers[ScorerId.SelfRepetition] = s9

  finish(scorers, notRun, manifest, undefined)
}

function metricLine(record: ScorerRecord): string {
  if (record.state === ResultState.NotApplicable) return record.reason ?? ''
  if (record.state === ResultState.Error) return record.reason ?? ''
  return JSON.stringify(record.value)
}

function finish(
  scorers: Record<string, ScorerRecord>,
  notRun: Array<{ scorer: string; reason: string }>,
  manifest: Record<string, unknown>,
  crashed: ScorerRecord | undefined,
): void {
  const rows = [
    { scorer: ScorerId.CausalGraph, record: scorers[ScorerId.CausalGraph] },
    { scorer: ScorerId.PlanCoverage, record: scorers[ScorerId.PlanCoverage] },
    { scorer: ScorerId.SetupPayoff, record: scorers[ScorerId.SetupPayoff] },
    { scorer: ScorerId.CanonViolation, record: scorers[ScorerId.CanonViolation] },
    { scorer: ScorerId.SchemaValidity, record: scorers[ScorerId.SchemaValidity] },
    { scorer: ScorerId.SlopRate, record: scorers[ScorerId.SlopRate] },
    { scorer: ScorerId.CharacterField, record: scorers[ScorerId.CharacterField] },
    { scorer: ScorerId.SelfRepetition, record: scorers[ScorerId.SelfRepetition] },
  ]
  const printed: Array<{ scorer: string; state: string; value: string }> = []
  for (const row of rows) {
    if (!row.record) continue
    printed.push({
      scorer: row.scorer,
      state: row.record.state,
      value: metricLine(row.record),
    })
  }

  const payload = {
    world: 'aeternum',
    fixture: 'evals/fixtures/aeternum/episode-01.beats.json',
    dated: '2026-08-16',
    scoredAt: new Date().toISOString(),
    headSha: gitSha(['rev-parse', 'HEAD']),
    scorerCodeSha: scorerCodeSha(),
    manifestSha256: recordFromJson(recordFromJson(manifest).inputs),
    applicability: {
      causal_graph_integrity: 'beats include causalDependencies (empty arrays preserved)',
      plan_coverage_evenness: '10-point plan read from storyPlan.premise.tenPointsPlan',
      setup_payoff_distance: 'lexicon has place/institution/object entries',
      canon_violation: 'lexicon + cast present',
      schema_validity: 'raw beat rows present',
      slop_rate: 'negative corpus present',
      character_field_adherence: 'NOT_APPLICABLE: no wants/fears/wontBreak on cast',
      self_repetition: 'intra-set applicable; cross-run NOT_APPLICABLE (one run)',
    },
    scorers,
    notRun,
  }

  mkdirSync(resolve(process.cwd(), 'evals/baselines'), { recursive: true })
  if (existsSync(OUT_PATH)) {
    throw new Error(`refusing to overwrite ${OUT_PATH}`)
  }
  writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, JSON_INDENT)}\n`)
  printTable(printed)
  printS5(scorers[ScorerId.CanonViolation])
  if (crashed?.state === ResultState.Error) {
    process.stderr.write(`${crashed.traceback ?? crashed.reason}\n`)
    process.exit(1)
  }
}

function printS5(record: ScorerRecord | undefined): void {
  if (!record || record.state !== ResultState.Number) return
  const value = recordFromJson(record.value)
  const buckets = recordFromJson(value.buckets)
  process.stdout.write('\nS5 unknown_entity:\n')
  process.stdout.write(`${JSON.stringify(buckets.unknownEntity, null, JSON_INDENT)}\n`)
  process.stdout.write('\nS5 new_character:\n')
  process.stdout.write(`${JSON.stringify(buckets.newCharacter, null, JSON_INDENT)}\n`)
}

try {
  main()
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error))
  process.stderr.write(`${err.stack ?? err.message}\n`)
  process.exit(1)
}
