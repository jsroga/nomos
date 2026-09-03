import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MeshyGenerationApiUrl, MeshyGenerationMetadataKey } from '../../constants/meshy-generation-wire'
import { MeshyTaskStatusValue } from '../../constants/meshy-task-types'

const { metadataStore, clearMetadata } = vi.hoisted(() => {
  const metadataStore: Record<string, unknown> = {}
  function clearMetadata() {
    for (const key of Object.keys(metadataStore)) {
      metadataStore[key] = undefined
    }
  }
  return { metadataStore, clearMetadata }
})

const persistEq = vi.fn(async () => ({}))

vi.mock('@trigger.dev/sdk', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  metadata: {
    current: () => metadataStore,
    set: async (key: string, value: unknown) => {
      metadataStore[key] = value
    },
  },
}))

vi.mock('@/shared/auth/supabase-admin', () => ({
  supabaseAdmin: {
    from: () => ({
      update: () => ({
        eq: persistEq,
      }),
    }),
  },
}))

vi.mock('../stream-meshy-image-to-3d', () => ({
  MeshyStreamFallbackError: class MeshyStreamFallbackError extends Error {},
  streamMeshyImageTo3dTask: vi.fn(async () => ({
    status: MeshyTaskStatusValue.Succeeded,
    modelUrls: { glb: 'https://meshy.example/model.glb' },
  })),
}))

import { runMeshyImageTo3d } from '../run-meshy-image-to-3d'

const PARAMS = {
  assetId: 'asset-1',
  finalImageUrl: 'https://cdn.example/ref.png',
  apiKey: 'meshy-key',
}

describe('runMeshyImageTo3d checkpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearMetadata()
    persistEq.mockResolvedValue({})
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === MeshyGenerationApiUrl.OpenApiImageTo3d) {
        return new Response(JSON.stringify({ result: 'task-abc' }), { status: 200 })
      }
      throw new Error(`unexpected fetch ${url}`)
    })
  })

  it('does not create a second Meshy task when metadata already has the id', async () => {
    persistEq.mockRejectedValueOnce(new Error('db down'))

    await expect(runMeshyImageTo3d(PARAMS)).rejects.toThrow('db down')
    expect(metadataStore[MeshyGenerationMetadataKey.MeshyTaskId]).toBe('task-abc')

    persistEq.mockResolvedValue({})
    await runMeshyImageTo3d(PARAMS)

    const createCalls = vi.mocked(global.fetch).mock.calls.filter(
      ([input]) => String(input) === MeshyGenerationApiUrl.OpenApiImageTo3d,
    )
    expect(createCalls).toHaveLength(1)
  })

  it('rethrows persist failures so a retry can finish the write', async () => {
    persistEq.mockRejectedValue(new Error('db down'))
    await expect(runMeshyImageTo3d(PARAMS)).rejects.toThrow('db down')
  })
})
