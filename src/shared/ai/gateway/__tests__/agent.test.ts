/**
 * Metering an agent call hinges on one rule: a call outside a billing context
 * is left unrecorded rather than attributed to a guess. A row against the
 * wrong project is worse than a missing one.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { recordLlmCall } = vi.hoisted(() => ({ recordLlmCall: vi.fn() }))
vi.mock('@/shared/ai/gateway/record', () => ({ recordLlmCall }))

import { SystemScopeReason, systemScope } from '@/shared/auth/project-scope'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { withGatewayContext } from '@/shared/ai/gateway/call-context'
import { meteredCall } from '@/shared/ai/gateway/agent'

const SCOPE = systemScope('11111111-1111-4111-8111-111111111111', SystemScopeReason.ProviderSmoke)
const RESULT = { text: 'a beat', usage: { inputTokens: 1200, outputTokens: 300 } }

beforeEach(() => recordLlmCall.mockReset())

describe('meteredCall', () => {
  it('records the call with the context project and the reported tokens', async () => {
    const result = await withGatewayContext({ scope: SCOPE, traceId: 't-1' }, () =>
      meteredCall(LlmFeature.StorytellerBeatPlan, async () => RESULT)
    )

    expect(result).toBe(RESULT)
    expect(recordLlmCall.mock.calls[0]?.[0]).toMatchObject({
      projectId: SCOPE.projectId,
      feature: LlmFeature.StorytellerBeatPlan,
      promptTokens: 1200,
      completionTokens: 300,
      traceId: 't-1',
    })
  })

  it('records nothing outside a context, rather than guessing a project', async () => {
    const result = await meteredCall(LlmFeature.StorytellerBeatPlan, async () => RESULT)

    expect(result).toBe(RESULT)
    expect(recordLlmCall).not.toHaveBeenCalled()
  })

  it('records a failure and rethrows it', async () => {
    const boom = new Error('provider exploded')

    await expect(
      withGatewayContext({ scope: SCOPE }, () =>
        meteredCall(LlmFeature.StorytellerBeatPlan, async () => {
          throw boom
        })
      )
    ).rejects.toBe(boom)

    expect(recordLlmCall).toHaveBeenCalledTimes(1)
  })

  it('records zero tokens when the agent reports no usage, but still records the call', async () => {
    await withGatewayContext({ scope: SCOPE }, () =>
      meteredCall(LlmFeature.GameDesign, async () => ({ text: 'no usage here' }))
    )

    expect(recordLlmCall.mock.calls[0]?.[0]).toMatchObject({ promptTokens: 0, completionTokens: 0 })
  })

  it('keeps the context across nested async work', async () => {
    await withGatewayContext({ scope: SCOPE }, async () => {
      await new Promise(resolve => setTimeout(resolve, 1))
      return meteredCall(LlmFeature.LoopCreator, async () => RESULT)
    })

    expect(recordLlmCall).toHaveBeenCalledTimes(1)
  })
})
