import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpMethod, MeshyTopology } from '@/shared/data/constants/protocol'
import { MeshyTaskStatusValue } from '../constants/meshy-task-types'
import type { Remesh3dModelPayload } from '../constants/meshy-payloads'

const { metadataStore, clearMetadata } = vi.hoisted(() => {
  const metadataStore: Record<string, unknown> = {}
  function clearMetadata() {
    for (const key of Object.keys(metadataStore)) {
      metadataStore[key] = undefined
    }
  }
  return { metadataStore, clearMetadata }
})

const persistUpdateEq = vi.fn(async () => ({}))

vi.mock('@trigger.dev/sdk', async importOriginal => {
  function isModuleNamespace(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
  }
  const actual = await importOriginal()
  const extras = {
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    metadata: {
      current: () => metadataStore,
      set: async (key: string, value: unknown) => {
        metadataStore[key] = value
      },
    },
  }
  if (isModuleNamespace(actual)) {
    return { ...actual, ...extras }
  }
  return extras
})

vi.mock('@/shared/auth/supabase-admin', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { metadata: {} } }),
        }),
      }),
      update: () => ({
        eq: persistUpdateEq,
      }),
    }),
  },
}))

import { RemeshMetadataKey, runRemesh3dModel } from '../remesh-3d-model.task'

const REMESH_CREATE_URL = 'https://api.meshy.ai/openapi/v1/remesh'

const PAYLOAD: Remesh3dModelPayload = {
  projectId: '11111111-1111-4111-8111-111111111111',
  requestId: 'nonce-1',
  assetId: 'asset-1',
  meshyTaskId: 'orig-task',
  apiKey: 'meshy-key',
  topology: MeshyTopology.Triangle,
  targetPolycount: 30000,
}

describe('runRemesh3dModel checkpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearMetadata()
    persistUpdateEq.mockResolvedValue({})
    const nativeSetTimeout = globalThis.setTimeout.bind(globalThis)
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback, _ms, ...args) => {
      if (typeof callback === 'function') {
        callback(...args)
      }
      return nativeSetTimeout(() => undefined, 0)
    })
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === REMESH_CREATE_URL && init?.method === HttpMethod.Post) {
        return new Response(JSON.stringify({ result: 'remesh-abc' }), { status: 200 })
      }
      if (url.startsWith(`${REMESH_CREATE_URL}/`)) {
        return new Response(
          JSON.stringify({
            status: MeshyTaskStatusValue.Succeeded,
            progress: 100,
            model_urls: { glb: 'https://meshy.example/remesh.glb' },
          }),
          { status: 200 }
        )
      }
      throw new Error(`unexpected fetch ${url}`)
    })
  })

  it('does not POST create twice when remesh_task_id is already stored', async () => {
    persistUpdateEq.mockRejectedValueOnce(new Error('db down'))

    await expect(runRemesh3dModel(PAYLOAD)).rejects.toThrow('db down')
    expect(metadataStore[RemeshMetadataKey.RemeshTaskId]).toBe('remesh-abc')

    persistUpdateEq.mockResolvedValue({})
    await runRemesh3dModel(PAYLOAD)

    const createPosts = vi.mocked(global.fetch).mock.calls.filter(([, init]) => {
      return String(init?.method) === HttpMethod.Post
    })
    expect(createPosts).toHaveLength(1)
  })
})
