/**
 * Author generate is billed as storyteller.beat-draft, not beat-plan.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { generate, recordLlmCall } = vi.hoisted(() => ({
  generate: vi.fn(),
  recordLlmCall: vi.fn(),
}))

vi.mock('../stateless-agents', () => ({
  statelessGrrmAuthor: { generate },
  statelessBeatPlanner: { generate: vi.fn() },
}))

vi.mock('@/shared/ai/gateway/record', () => ({ recordLlmCall }))

import { SystemScopeReason, systemScope } from '@/shared/auth/project-scope'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { withGatewayContext } from '@/shared/ai/gateway/call-context'
import { generateAuthorDraft } from '../beat-draft-default-deps'

const SCOPE = systemScope('11111111-1111-4111-8111-111111111111', SystemScopeReason.JobContext)

beforeEach(() => {
  generate.mockReset()
  recordLlmCall.mockReset()
  generate.mockResolvedValue({
    text: 'INT. CHAPEL — DUSK\nVERA: You already know.',
    usage: { inputTokens: 80, outputTokens: 40 },
    model: 'openai/gpt-5.6-luna',
  })
})

describe('generateAuthorDraft cost', () => {
  it('records llm_calls with storyteller.beat-draft', async () => {
    const script = await withGatewayContext({ scope: SCOPE, traceId: 'draft-1' }, () =>
      generateAuthorDraft('Draft the chapel confrontation.')
    )

    expect(script).toContain('INT. CHAPEL')
    expect(recordLlmCall.mock.calls[0]?.[0]).toMatchObject({
      projectId: SCOPE.projectId,
      feature: LlmFeature.StorytellerBeatDraft,
      promptTokens: 80,
      completionTokens: 40,
      traceId: 'draft-1',
    })
  })
})
