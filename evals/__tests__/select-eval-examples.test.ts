import { describe, expect, it } from 'vitest'
import { STORYTELLER_GOLDEN_EXAMPLES } from '../datasets/storyteller-golden'
import {
  GoldenQualityError,
  GoldenQualityItemMeta,
  GoldenQualityScorerId,
  goldenQualityTaskOutput,
  selectGoldenQualityExamples,
} from '../golden-quality-items'
import { examplesMatchingScorers } from '../select-eval-examples'

function example(id: string, scorers?: string[]) {
  return { id, metadata: { scorers } }
}

describe('examplesMatchingScorers', () => {
  it('returns the full pool when no scorer filter is set', () => {
    const pool = [example('a', ['magic']), example('b', ['hallucination'])]
    expect(examplesMatchingScorers(pool, undefined).map(row => row.id)).toEqual(['a', 'b'])
  })

  it('keeps promotion-floor examples out of fixture scorer filters', () => {
    const selected = examplesMatchingScorers(STORYTELLER_GOLDEN_EXAMPLES, ['magic'])
    expect(selected.some(row => row.metadata.category === 'promotion')).toBe(false)
    expect(
      STORYTELLER_GOLDEN_EXAMPLES.filter(row => row.metadata.category === 'promotion').every(
        row => row.metadata.scorers.includes('promotion-floor'),
      ),
    ).toBe(true)
  })

  it('keeps only examples whose allowlist intersects the filter', () => {
    const pool = [
      example('beat', ['beat-plan-concreteness']),
      example('grounded', ['hallucination']),
      example('slop', ['magic']),
    ]
    expect(examplesMatchingScorers(pool, ['hallucination']).map(row => row.id)).toEqual(['grounded'])
  })
})

describe('selectGoldenQualityExamples', () => {
  it('keeps the golden hallucination and magic items', () => {
    const selected = selectGoldenQualityExamples(STORYTELLER_GOLDEN_EXAMPLES)
    expect(selected.map(row => row.id).sort()).toEqual([
      'halluc-fabricated-01',
      'halluc-grounded-01',
      'halluc-partial-01',
      'magic-motion-01',
      'magic-slop-01',
      'magic-strong-01',
    ])
    expect(
      selected.every(row =>
        row.metadata.scorers.some(
          id => id === GoldenQualityScorerId.Hallucination || id === GoldenQualityScorerId.Magic,
        ),
      ),
    ).toBe(true)
  })

  it('attaches voice_distinctiveness to the golden row that claims specific voices', () => {
    const row = STORYTELLER_GOLDEN_EXAMPLES.find(example => example.id === 'magic-strong-01')
    expect(row?.metadata.scorers).toContain('voice_distinctiveness')
  })

  it('returns frozen referenceOutput for the experiment task', () => {
    expect(
      goldenQualityTaskOutput({ [GoldenQualityItemMeta.ReferenceOutput]: 'the envoy waited' }),
    ).toBe('the envoy waited')
    expect(() => goldenQualityTaskOutput({})).toThrow(GoldenQualityError.MissingReferenceOutput)
  })
})
