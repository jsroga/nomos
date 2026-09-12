import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemScopeReason, systemScope } from '@/shared/auth/project-scope'
import { LlmFinishReason } from '@/shared/ai/gateway/constants/output-budget'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'

const { complete } = vi.hoisted(() => ({ complete: vi.fn() }))
vi.mock('@/shared/ai/gateway', () => ({ complete }))

vi.mock('../entity-graph-service', () => ({
  entityGraphService: {
    findRelatedEntitiesWithScoring: async () => [],
  },
}))

vi.mock('../relationship-enricher-service', () => ({
  relationshipEnricher: {
    enrichEntity: async () => ({ relationships: [] }),
  },
}))

import { generateContextualSummary } from '../contextual-summary-service'

const SCOPE = systemScope('11111111-1111-4111-8111-111111111111', SystemScopeReason.ProviderSmoke)
const BASE = 'The harbour master keeps the tide tables.'

describe('contextual summary truncation', () => {
  beforeEach(() => {
    complete.mockReset()
  })

  it('does not cache an empty completion', async () => {
    complete.mockResolvedValue({ text: '   ', finishReason: LlmFinishReason.Stop })
    const first = await generateContextualSummary({
      entityId: 'entity-empty',
      entityName: 'Elara',
      entityType: 'character',
      entityDescription: BASE,
      surroundingText: 'Elara waits at the quay.',
      scope: SCOPE,
    })
    expect(first.contextualSummary).toBe(BASE)
    expect(first.cacheHit).toBe(false)
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({ feature: LlmFeature.StorytellerContextualSummary })
    )

    complete.mockResolvedValue({ text: 'Elara holds the quay against the ledger.', finishReason: LlmFinishReason.Stop })
    const second = await generateContextualSummary({
      entityId: 'entity-empty',
      entityName: 'Elara',
      entityType: 'character',
      entityDescription: BASE,
      surroundingText: 'Elara waits at the quay.',
      scope: SCOPE,
    })
    expect(second.contextualSummary).toBe('Elara holds the quay against the ledger.')
    expect(complete).toHaveBeenCalledTimes(2)
  })

  it('does not cache a length finishReason', async () => {
    complete.mockResolvedValue({ text: 'cut', finishReason: LlmFinishReason.Length })
    const result = await generateContextualSummary({
      entityId: 'entity-length',
      entityName: 'Elara',
      entityType: 'character',
      entityDescription: BASE,
      surroundingText: 'Elara waits at the quay.',
      scope: SCOPE,
    })
    expect(result.contextualSummary).toBe(BASE)
    expect(result.cacheHit).toBe(false)
  })
})
