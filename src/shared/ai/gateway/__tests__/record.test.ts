/**
 * The recorder's two contracts: cost is computed from the committed table and
 * refuses to guess, and a write failure never reaches the caller.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const insertMock = vi.fn()
vi.mock('@/shared/persistence/client', () => ({
  db: { insert: () => ({ values: insertMock }) },
}))

import { LlmFeature, LlmOutcome } from '@/shared/ai/gateway/constants/llm-call'
import { costUsdFor, recordFailureCount, recordLlmCall } from '@/shared/ai/gateway/record'

const CALL = {
  projectId: '11111111-1111-4111-8111-111111111111',
  userId: 'user-1',
  feature: LlmFeature.StorytellerChat,
  model: 'openai/gpt-4o',
  provider: 'openrouter',
  promptTokens: 1_000_000,
  completionTokens: 0,
  latencyMs: 1200,
  outcome: LlmOutcome.Ok,
}

beforeEach(() => {
  insertMock.mockReset()
  insertMock.mockResolvedValue(undefined)
})

describe('costUsdFor', () => {
  it('prices a known model from the committed table', () => {
    expect(costUsdFor('openai/gpt-4o', 1_000_000, 0)).toBeCloseTo(2.5, 6)
    expect(costUsdFor('openai/gpt-4o', 0, 1_000_000)).toBeCloseTo(10, 6)
  })

  it('throws on an unknown model rather than recording zero', () => {
    expect(() => costUsdFor('someone/unreleased-model', 1000, 1000)).toThrow(
      /unreleased-model/
    )
  })

  it('charges nothing for zero tokens', () => {
    expect(costUsdFor('openai/gpt-4o', 0, 0)).toBe(0)
  })
})

describe('recordLlmCall', () => {
  it('writes one row with the computed cost', async () => {
    await recordLlmCall(CALL)

    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(insertMock.mock.calls[0]?.[0]).toMatchObject({
      feature: LlmFeature.StorytellerChat,
      costUsd: '2.500000',
      outcome: LlmOutcome.Ok,
    })
  })

  it('swallows a database failure and counts it — generation is unaffected', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    insertMock.mockRejectedValue(new Error('connection reset'))
    const before = recordFailureCount()

    await expect(recordLlmCall(CALL)).resolves.toBeUndefined()

    expect(recordFailureCount()).toBe(before + 1)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('swallows an unknown model too, rather than throwing into the caller', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await expect(recordLlmCall({ ...CALL, model: 'nope/nope' })).resolves.toBeUndefined()

    expect(insertMock).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
