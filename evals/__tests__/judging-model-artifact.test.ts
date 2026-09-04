import { describe, expect, it } from 'vitest'
import { resolveJudgingModelId, DEFAULT_JUDGING_MODEL_ID } from '../constants/thresholds'

describe('evals/run judgingModelId shape', () => {
  it('stores a resolved judging model id suitable for latest.json', () => {
    const judgingModelId = resolveJudgingModelId(process.env.JUDGING_MODEL)
    const artifact = {
      inputHash: 'abc',
      judgingModelId,
    }
    expect(artifact.judgingModelId).toBe(DEFAULT_JUDGING_MODEL_ID)
    expect(artifact).toHaveProperty('judgingModelId')
  })
})
