/**
 * Voyage cache hits must not double-bill: skip recordLlmCall when cacheHit.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { recordLlmCall, embedDocumentsMetered } = vi.hoisted(() => ({
  recordLlmCall: vi.fn(),
  embedDocumentsMetered: vi.fn(),
}))

vi.mock('@/shared/ai/gateway/record', () => ({ recordLlmCall }))
vi.mock('@/shared/ai/embeddings/voyage-embeddings', () => ({
  getVoyageEmbeddings: () => ({
    modelId: () => 'voyage-3',
    embedDocumentsMetered,
  }),
}))

import { SystemScopeReason, systemScope } from '@/shared/auth/project-scope'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { embed } from '@/shared/ai/gateway'

const SCOPE = systemScope('11111111-1111-4111-8111-111111111111', SystemScopeReason.JobContext)

beforeEach(() => {
  recordLlmCall.mockReset()
  embedDocumentsMetered.mockReset()
})

describe('embed cache billing', () => {
  it('skips recordLlmCall on a Voyage cache hit', async () => {
    embedDocumentsMetered.mockResolvedValue({
      vectors: [[0.1, 0.2]],
      promptTokens: 0,
      cacheHit: true,
    })

    const vectors = await embed({
      scope: SCOPE,
      feature: LlmFeature.RagEmbedding,
      texts: ['harbour bells'],
    })

    expect(vectors).toEqual([[0.1, 0.2]])
    expect(recordLlmCall).not.toHaveBeenCalled()
  })

  it('records RagEmbedding when the Voyage path is a cache miss', async () => {
    embedDocumentsMetered.mockResolvedValue({
      vectors: [[0.3]],
      promptTokens: 12,
      cacheHit: false,
    })

    await embed({
      scope: SCOPE,
      feature: LlmFeature.RagEmbedding,
      texts: ['harbour bells'],
    })

    expect(recordLlmCall.mock.calls[0]?.[0]).toMatchObject({
      projectId: SCOPE.projectId,
      feature: LlmFeature.RagEmbedding,
      promptTokens: 12,
    })
  })
})
