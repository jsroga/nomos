import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { recordFromJson } from '@/shared/data/json-guards'
import { dumpedBeatFromUnknown } from '../beat-text'
import { CanonBucket, CharacterFieldName, EntityKind, ScorerId } from '../constants'
import {
  castPeopleFromUnknown,
  findPhraseHits,
  lexiconEntriesFromUnknown,
  matchingRulesFromUnknown,
} from '../phrase-match'
import { scoreCausalGraph } from '../s1-causal-graph'
import { scorePlanCoverage } from '../s2-plan-coverage'
import { scoreSetupPayoff } from '../s3-setup-payoff'
import { scoreCanonViolation } from '../s5-canon-violation'
import { scoreCharacterFieldAdherence } from '../s6-character-field'
import { scoreSchemaValidity } from '../s7-schema-validity'
import { scoreSlopRate } from '../s8-slop-rate'
import { scoreSelfRepetition } from '../s9-self-repetition'
import type { DumpedBeat } from '../types'

const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../fixtures/structural')

function readFixture(name: string): Record<string, unknown> {
  return recordFromJson(JSON.parse(readFileSync(join(FIXTURE_DIR, name), 'utf8')))
}

function loadBeats(raw: unknown): DumpedBeat[] {
  if (!Array.isArray(raw)) return []
  const beats: DumpedBeat[] = []
  for (const row of raw) {
    const beat = dumpedBeatFromUnknown(row)
    if (beat) beats.push(beat)
  }
  return beats
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter(item => typeof item === 'string')
}

describe('lexicon matching rules', () => {
  const rules = {
    caseInsensitive: true,
    ignoreLeadingThe: true,
    singularPlural: true,
    explicitAliases: true,
    wholePhraseWordBoundaries: true,
  }
  const stillness = [{ term: 'The Stillness', aliases: ['Stillness'], kind: EntityKind.Event }]
  const lethe = [{ term: 'Veins of Lethe', aliases: ['Lethe'], kind: EntityKind.Object }]
  const wardens = [{ term: 'Death Wardens', aliases: ['Wardens', 'Warden'], kind: EntityKind.Institution }]

  it('ignores a leading the and matches on word boundaries', () => {
    const hits = findPhraseHits('the stillness holds', stillness, rules)
    expect(hits.map(hit => hit.term)).toContain('The Stillness')
  })

  it('does not match Lethe as a substring of together', () => {
    const hits = findPhraseHits('they stood together at dusk', lethe, rules)
    expect(hits).toHaveLength(0)
  })

  it('matches Warden and Wardens via the singular/plural rule', () => {
    const hits = findPhraseHits('A Warden waits with the Wardens', wardens, rules)
    expect(hits.length).toBeGreaterThan(0)
  })
})

describe('S1 causal_graph_integrity', () => {
  it('fails when later beats have empty causalDependencies', () => {
    const fixture = readFixture('s1-empty-causal.json')
    const result = scoreCausalGraph(loadBeats(fixture.beats))
    expect(result.id).toBe(ScorerId.CausalGraph)
    expect(result.metrics.shareNonEmptyCausal).toBe(0)
    expect(result.metrics.orphanCount).toBe(2)
    expect(result.metrics.plainChain).toBe(false)
  })
})

describe('S2 plan_coverage_evenness', () => {
  it('flags a perfectly even split as grid-filling', () => {
    const fixture = readFixture('s2-grid-filling.json')
    const result = scorePlanCoverage(loadBeats(fixture.beats), stringList(fixture.planPoints))
    expect(result.id).toBe(ScorerId.PlanCoverage)
    expect(result.metrics.gridFillingSuspected).toBe(true)
    expect(result.metrics.coverageVariance).toBe(0)
  })
})

describe('S3 setup_payoff_distance', () => {
  it('flags an object first named in a late climax beat', () => {
    const fixture = readFixture('s3-late-climax-object.json')
    const lexicon = lexiconEntriesFromUnknown(fixture.lexicon)
    const rules = matchingRulesFromUnknown(recordFromJson(fixture.lexicon).matching)
    const result = scoreSetupPayoff(loadBeats(fixture.beats), lexicon, rules)
    expect(result.id).toBe(ScorerId.SetupPayoff)
    expect(result.metrics.lateClimaxIntroductionCount).toBeGreaterThan(0)
    const terms = result.flags.map(flag => recordFromJson(flag).term)
    expect(terms).toContain('Sun Dagger')
  })
})

describe('S5 canon_violation', () => {
  it('splits unknown entities from new characters and does not merge buckets', () => {
    const fixture = readFixture('s5-unknown-entity.json')
    const lexicon = lexiconEntriesFromUnknown(fixture.lexicon)
    const rules = matchingRulesFromUnknown(recordFromJson(fixture.lexicon).matching)
    const cast = castPeopleFromUnknown(fixture.cast)
    const result = scoreCanonViolation(loadBeats(fixture.beats), lexicon, cast, rules)
    expect(result.id).toBe(ScorerId.CanonViolation)
    expect(result.metrics.unknownEntityCount).toBeGreaterThan(0)
    expect(result.metrics.newCharacterCount).toBeGreaterThan(0)
    const buckets = result.flags.map(flag => recordFromJson(flag).bucket)
    expect(buckets).toContain(CanonBucket.UnknownEntity)
    expect(buckets).toContain(CanonBucket.NewCharacter)
    const entityStrings = result.flags
      .filter(flag => recordFromJson(flag).bucket === CanonBucket.UnknownEntity)
      .map(flag => recordFromJson(flag).matchedString)
    expect(entityStrings.join(' ')).toMatch(/Iron Tithe/)
    const characterStrings = result.flags
      .filter(flag => recordFromJson(flag).bucket === CanonBucket.NewCharacter)
      .map(flag => recordFromJson(flag).matchedString)
    expect(characterStrings.join(' ')).toMatch(/Jorik Hale/)
  })
})

describe('S6 character_field_adherence', () => {
  it('hard-fails a wontBreak contradiction', () => {
    const fixture = readFixture('s6-wontbreak-violation.json')
    const result = scoreCharacterFieldAdherence(
      loadBeats(fixture.beats),
      castPeopleFromUnknown(fixture.cast),
      matchingRulesFromUnknown(fixture.matching),
    )
    expect(result.id).toBe(ScorerId.CharacterField)
    expect(result.metrics.wontBreakHardFailCount).toBe(1)
    const fields = result.flags.map(flag => recordFromJson(flag).field)
    expect(fields).toContain(CharacterFieldName.WontBreak)
  })
})

describe('S7 schema_validity', () => {
  it('separates raw parse failures from valid rows', () => {
    const fixture = readFixture('s7-schema-invalid.json')
    const rawBeats = Array.isArray(fixture.beats) ? fixture.beats : []
    const result = scoreSchemaValidity(rawBeats)
    expect(result.id).toBe(ScorerId.SchemaValidity)
    expect(result.metrics.rawFailures).toBeGreaterThan(0)
    expect(result.metrics.parseRate).toBeLessThan(1)
  })
})

describe('S8 slop_rate', () => {
  it('counts seeded negative-corpus phrases', () => {
    const fixture = readFixture('s8-slop-hits.json')
    const result = scoreSlopRate(loadBeats(fixture.beats), stringList(fixture.corpus))
    expect(result.id).toBe(ScorerId.SlopRate)
    expect(result.metrics.hitCount).toBeGreaterThan(0)
    expect(result.flags.map(flag => recordFromJson(flag).phrase)).toContain(
      'smile didn\'t reach his eyes',
    )
  })
})

describe('S9 self_repetition', () => {
  it('reports low distinct-n on a repeated beat set', () => {
    const fixture = readFixture('s9-self-repetition.json')
    const result = scoreSelfRepetition(loadBeats(fixture.beats))
    expect(result.id).toBe(ScorerId.SelfRepetition)
    expect(result.metrics.distinct3).toBeLessThan(0.5)
    expect(result.metrics.pairwiseSimilarityMean).toBeNull()
  })
})
