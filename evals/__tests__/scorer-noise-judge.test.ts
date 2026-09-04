import { describe, expect, it } from 'vitest'
import {
  DEFAULT_JUDGING_MODEL_ID,
  regressionThreshold,
  resolveJudgingModelId,
} from '../constants/thresholds'

describe('SCORER_NOISE by judge model', () => {
  it('resolves default judging model id', () => {
    expect(resolveJudgingModelId(undefined)).toBe(DEFAULT_JUDGING_MODEL_ID)
    expect(resolveJudgingModelId('openai/gpt-5.6-sol (default)')).toBe(
      DEFAULT_JUDGING_MODEL_ID
    )
  })

  it('returns a threshold for the default judge', () => {
    expect(regressionThreshold('magic', DEFAULT_JUDGING_MODEL_ID)).toBeGreaterThan(0)
  })

  it('fails closed when the judge model id has no noise row', () => {
    expect(() => regressionThreshold('magic', 'openai/never-measured-judge')).toThrow(
      /SCORER_NOISE has no row/
    )
  })
})
