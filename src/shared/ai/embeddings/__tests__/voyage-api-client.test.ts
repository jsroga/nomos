import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/config/env', () => ({
  env: {
    OPENROUTER_API_KEY: 'sk-test',
    EMBEDDING_MODEL: 'openai/text-embedding-3-small',
  },
}))

vi.mock('@/shared/data/constants/feature-flags', async () => {
  const actual = await vi.importActual<typeof import('@/shared/data/constants/feature-flags')>(
    '@/shared/data/constants/feature-flags'
  )
  return { ...actual, isFeatureEnabled: () => true }
})

import { callVoyageAPI } from '../voyage-api-client'

function jsonResponse(tokens: number, delayMs: number): Promise<Response> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(
        new Response(
          JSON.stringify({
            object: 'list',
            data: [{ object: 'embedding', embedding: [0.1, 0.2], index: 0 }],
            model: 'openai/text-embedding-3-small',
            usage: { total_tokens: tokens },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    }, delayMs)
  })
}

describe('callVoyageAPI usage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns per-call tokens when two requests overlap', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse(11, 40))
      .mockImplementationOnce(() => jsonResponse(22, 5))
    vi.stubGlobal('fetch', fetchMock)

    const wait = async () => undefined
    const [slow, fast] = await Promise.all([
      callVoyageAPI(['alpha'], {}, 0, wait),
      callVoyageAPI(['beta'], {}, 0, wait),
    ])

    expect(slow.promptTokens).toBe(11)
    expect(fast.promptTokens).toBe(22)
    expect(slow.embeddings).toHaveLength(1)
    expect(fast.embeddings).toHaveLength(1)
  })
})
