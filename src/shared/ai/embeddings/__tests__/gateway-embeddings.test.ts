import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { SystemScopeReason, systemScope } from '@/shared/auth/project-scope'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { withGatewayContext } from '@/shared/ai/gateway/call-context'

const { embed } = vi.hoisted(() => ({
  embed: vi.fn(),
}))

vi.mock('@/shared/ai/gateway', () => ({ embed }))

import {
  GatewayEmbedError,
  embedQueryFromGatewayContext,
  embedTextsFromGatewayContext,
} from '@/shared/ai/embeddings/gateway-embeddings'

const SCOPE = systemScope('11111111-1111-4111-8111-111111111111', SystemScopeReason.JobContext)

describe('gateway context embeddings', () => {
  beforeEach(() => {
    embed.mockReset()
  })

  it('throws when no ProjectScope is on the request', async () => {
    await expect(embedTextsFromGatewayContext(['harbour bells'])).rejects.toThrow(
      GatewayEmbedError.NoContext
    )
  })

  it('meters RagEmbedding through gateway embed', async () => {
    embed.mockResolvedValue([[0.1, 0.2]])
    const vectors = await withGatewayContext({ scope: SCOPE }, () =>
      embedTextsFromGatewayContext(['harbour bells'])
    )
    expect(vectors).toEqual([[0.1, 0.2]])
    expect(embed).toHaveBeenCalledWith({
      scope: SCOPE,
      feature: LlmFeature.RagEmbedding,
      texts: ['harbour bells'],
      traceId: undefined,
    })
  })

  it('returns the first vector for a query', async () => {
    embed.mockResolvedValue([[0.3]])
    const vector = await withGatewayContext({ scope: SCOPE }, () =>
      embedQueryFromGatewayContext('harbour bells')
    )
    expect(vector).toEqual([0.3])
  })
})

describe('game-design pattern index embedding path', () => {
  it('does not call unmetered embedDocuments', () => {
    const source = readFileSync('src/domains/game-design/ai/agents/memory.ts', 'utf8')
    expect(source).not.toContain('embedDocuments(')
    expect(source).not.toContain('getVoyageEmbeddings')
    expect(source).toContain('embedTextsFromGatewayContext')
    expect(source).toContain('embedQueryFromGatewayContext')
  })
})
