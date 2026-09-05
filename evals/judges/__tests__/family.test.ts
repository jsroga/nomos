import { describe, expect, it } from 'vitest'
import { assertJudgeFamilyDiffers, modelFamily, SameFamilyJudgeErrorMessage } from '../family'

describe('judge family vs author family', () => {
  it('accepts a judge from a different family than the author', () => {
    expect(() => assertJudgeFamilyDiffers('openai/gpt-5.6-sol', 'moonshotai/kimi-k3')).not.toThrow()
    expect(modelFamily('anthropic/claude-sonnet-4.5')).toBe('anthropic')
  })

  it('rejects a same-family judge', () => {
    expect(() => assertJudgeFamilyDiffers('openai/gpt-5.6-sol', 'openai/gpt-5.6-luna')).toThrow(
      SameFamilyJudgeErrorMessage.Rejected
    )
  })
})
