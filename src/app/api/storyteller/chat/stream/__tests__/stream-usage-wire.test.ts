/**
 * The chat stream is the largest spender and the hardest to meter: usage
 * arrives after the response. These pin the two decisions that matter — an
 * abandoned stream is still recorded, and a stream whose provider never
 * reported usage is *not* written in at zero cost.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { recordLlmCall } = vi.hoisted(() => ({ recordLlmCall: vi.fn() }))
vi.mock('@/shared/ai/gateway/record', () => ({ recordLlmCall }))

import { SystemScopeReason, systemScope } from '@/shared/auth/project-scope'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { recordStreamedCall } from '../stream-usage-wire'
import { ToolResultDetectedSection } from '@/domains/storyteller/config/constants/tool-result-wire'
import type { StreamSession } from '../stream-session-wire'

const SCOPE = systemScope('11111111-1111-4111-8111-111111111111', SystemScopeReason.ProviderSmoke)

function session(overrides: Partial<StreamSession> = {}): StreamSession {
  const base: StreamSession = {
    writer: { enqueue: () => true, close: () => undefined },
    traceId: 'trace-1',
    scope: SCOPE,
    model: 'openai/gpt-4o',
    episodeId: undefined,
    isSectionUpdate: false,
    existingBibleData: {},
    toolCallStartTimes: new Map<string, number>(),
    emittedActionKeys: new Set<string>(),
    pendingActions: [],
    detectedSection: ToolResultDetectedSection.Beats,
    fullText: '',
  }
  return { ...base, ...overrides }
}

beforeEach(() => recordLlmCall.mockReset())

describe('recordStreamedCall', () => {
  it('records the turn when the provider reported usage', async () => {
    await recordStreamedCall(session({ usage: { promptTokens: 900, completionTokens: 120 } }))

    expect(recordLlmCall).toHaveBeenCalledTimes(1)
    expect(recordLlmCall.mock.calls[0]?.[0]).toMatchObject({
      feature: LlmFeature.StorytellerChat,
      promptTokens: 900,
      completionTokens: 120,
    })
  })

  it('records an abandoned stream — it still cost money', async () => {
    await recordStreamedCall(
      session({ fullText: '', usage: { promptTokens: 500, completionTokens: 8 } })
    )

    expect(recordLlmCall).toHaveBeenCalledTimes(1)
  })

  it('records nothing when usage never arrived, rather than a free-looking row', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await recordStreamedCall(session())

    expect(recordLlmCall).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('records nothing for a turn with no project behind it', async () => {
    await recordStreamedCall(session({ scope: undefined }))

    expect(recordLlmCall).not.toHaveBeenCalled()
  })
})
