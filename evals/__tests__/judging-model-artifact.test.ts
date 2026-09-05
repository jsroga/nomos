import { describe, expect, it } from 'vitest'
import { resolveJudgingModelId, DEFAULT_JUDGING_MODEL_ID } from '../constants/thresholds'
import { judgePromptHash } from '../judges/prompt-hash'

describe('evals/run judgingModelId shape', () => {
  it('stores a resolved judging model id suitable for latest.json', () => {
    const judgingModelId = resolveJudgingModelId(process.env.JUDGING_MODEL)
    const artifact = {
      inputHash: 'abc',
      judgingModelId,
      judgePromptHash: judgePromptHash(),
    }
    expect(artifact.judgingModelId).toBe(DEFAULT_JUDGING_MODEL_ID)
    expect(artifact).toHaveProperty('judgingModelId')
    expect(artifact.judgePromptHash).toMatch(/^[a-f0-9]{64}$/)
  })
})

