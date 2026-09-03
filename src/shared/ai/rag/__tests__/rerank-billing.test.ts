import { beforeEach, describe, expect, it, vi } from 'vitest'

const { recordLlmCall } = vi.hoisted(() => ({ recordLlmCall: vi.fn() }))

vi.mock('@/shared/ai/gateway/record', () => ({ recordLlmCall }))
vi.mock('@/shared/config/env', () => ({ env: { OPENROUTER_API_KEY: 'sk-test' } }))

import { SystemScopeReason, systemScope } from '@/shared/auth/project-scope'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { RerankerProviderId } from '@/shared/ai/constants/reranker'
import { Reranker } from '@/shared/ai/rag/reranker'
import type { SearchResult } from '@/shared/ai/rag/hybrid-search'

const SCOPE = systemScope('11111111-1111-4111-8111-111111111111', SystemScopeReason.JobContext)

const RESULTS: SearchResult[] = [
  {
    id: 'a',
    chunkId: 'a',
    content: 'the bells ring at dusk',
    metadata: {},
    vectorScore: 0.9,
    keywordScore: 0.2,
    combinedScore: 0.7,
  },
]

beforeEach(() => {
  recordLlmCall.mockReset()
  vi.unstubAllGlobals()
})

describe('rerank billing', () => {
  it('records RagRerank after a paid OpenRouter success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ results: [{ index: 0, relevance_score: 0.9 }] }),
      }))
    )

    const reranker = new Reranker({ provider: RerankerProviderId.Cohere, minScore: 0.1 })
    await reranker.rerank(SCOPE, 'bells', RESULTS)

    expect(recordLlmCall.mock.calls[0]?.[0]).toMatchObject({
      feature: LlmFeature.RagRerank,
      model: 'rerank-2',
      projectId: SCOPE.projectId,
    })
  })

  it('records nothing on the heuristic path', async () => {
    const reranker = new Reranker({ provider: RerankerProviderId.Heuristic })
    await reranker.rerank(SCOPE, 'bells', RESULTS)
    expect(recordLlmCall).not.toHaveBeenCalled()
  })
})
