/**
 * Tests for server-side API key resolution in tile generation routes.
 * Verifies that trigger-tile, trigger-upscale, and trigger-fidelity
 * correctly resolve API keys from process.env and reject when missing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockTrigger = vi.fn().mockResolvedValue({
  id: 'run_test123',
  publicAccessToken: 'tok_test',
})

vi.mock('@trigger.dev/sdk/v3', () => ({
  tasks: { trigger: (...args: unknown[]) => mockTrigger(...args) },
}))

type RouteHandler = (req: Request, auth?: unknown) => Promise<Response> | Response

vi.mock('@/lib/api-utils', () => ({
  withAuth: (handler: RouteHandler) => async (req: Request) => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: { id: 'proj_1', style_reference_urls: [], style_preset: null },
            }),
          }),
        }),
      }),
    }
    const auth = {
      session: { user: { id: 'user_1', email: 'test@test.com' } },
      supabase: mockSupabase,
    }
    return handler(req, auth)
  },
  withRateLimit: (handler: RouteHandler) => handler,
  verifyProjectAccess: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/config/style-presets', () => ({
  resolveStyleReferenceUrls: () => ['https://example.com/style.png'],
  resolveStyleContext: () => 'A dark fantasy world',
}))

function jsonRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function responseJson(res: Response) {
  return res.json()
}

// ─── trigger-tile ───

describe('POST /api/trigger-tile', () => {
  let POST: RouteHandler

  const savedEnv = { ...process.env }

  beforeEach(async () => {
    vi.resetModules()
    process.env = { ...savedEnv }
    mockTrigger.mockClear()
  })

  afterEach(() => {
    process.env = savedEnv
  })

  async function importRoute() {
    const mod = await import('../trigger-tile/route')
    return mod.POST
  }

  it('uses LEGNEXT_API_KEY for first tile (midjourney)', async () => {
    process.env.LEGNEXT_API_KEY = 'leg-key-123'
    process.env.GOOGLE_API_KEY = 'goog-key'
    POST = await importRoute()

    const req = jsonRequest({
      projectId: 'proj_1',
      x: 0,
      y: 0,
      prompt: 'forest',
      isFirstTile: true,
    })

    const res = await POST(req)
    const body = await responseJson(res)

    expect(body.success).toBe(true)
    expect(mockTrigger).toHaveBeenCalledOnce()

    const [, payload] = mockTrigger.mock.calls[0]
    expect(payload.aiProvider).toBe('midjourney')
    expect(payload.aiConfig.apiKey).toBe('leg-key-123')
  })

  it('uses GOOGLE_API_KEY for follow-up tile (nano-banana)', async () => {
    process.env.LEGNEXT_API_KEY = 'leg-key-123'
    process.env.GOOGLE_API_KEY = 'goog-key-456'
    process.env.FOLLOW_UP_IMAGE_PROVIDER = 'nano-banana'
    POST = await importRoute()

    const req = jsonRequest({
      projectId: 'proj_1',
      x: 1,
      y: 0,
      prompt: 'river',
      isFirstTile: false,
    })

    const res = await POST(req)
    const body = await responseJson(res)

    expect(body.success).toBe(true)
    const [, payload] = mockTrigger.mock.calls[0]
    expect(payload.aiProvider).toBe('nano-banana')
    expect(payload.aiConfig.apiKey).toBe('goog-key-456')
    expect(payload.aiConfig.model).toBe('gemini-3-pro-image-preview')
  })

  it('uses LEGNEXT_API_KEY for follow-up tile when FOLLOW_UP_IMAGE_PROVIDER is legnext-upload-paint', async () => {
    process.env.LEGNEXT_API_KEY = 'leg-key-123'
    process.env.GOOGLE_API_KEY = 'goog-key-456'
    process.env.FOLLOW_UP_IMAGE_PROVIDER = 'legnext-upload-paint'
    POST = await importRoute()

    const req = jsonRequest({
      projectId: 'proj_1',
      x: 1,
      y: 0,
      prompt: 'river',
      isFirstTile: false,
    })

    const res = await POST(req)
    const body = await responseJson(res)

    expect(body.success).toBe(true)
    const [, payload] = mockTrigger.mock.calls[0]
    expect(payload.aiProvider).toBe('legnext-upload-paint')
    expect(payload.aiConfig.apiKey).toBe('leg-key-123')
  })

  it('falls back to legacy env flags when FOLLOW_UP_IMAGE_PROVIDER is unset', async () => {
    process.env.LEGNEXT_API_KEY = 'leg-key-123'
    process.env.GOOGLE_API_KEY = 'goog-key-456'
    delete process.env.FOLLOW_UP_IMAGE_PROVIDER
    process.env.USE_LEGNEXT_FOR_FOLLOWUP = 'true'
    delete process.env.USE_NANO_BANANA_FOR_FOLLOWUP
    POST = await importRoute()

    const req = jsonRequest({
      projectId: 'proj_1',
      x: 1,
      y: 0,
      prompt: 'river',
      isFirstTile: false,
    })

    const res = await POST(req)
    const body = await responseJson(res)

    expect(body.success).toBe(true)
    const [, payload] = mockTrigger.mock.calls[0]
    expect(payload.aiProvider).toBe('legnext-upload-paint')
    expect(payload.aiConfig.apiKey).toBe('leg-key-123')
  })

  it('falls back to gemini when LEGNEXT_API_KEY is missing for first tile', async () => {
    delete process.env.LEGNEXT_API_KEY
    process.env.GOOGLE_API_KEY = 'goog-key'
    POST = await importRoute()

    const req = jsonRequest({
      projectId: 'proj_1',
      x: 0,
      y: 0,
      prompt: 'forest',
      isFirstTile: true,
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await responseJson(res)
    expect(body.success).toBe(true)
    const [, payload] = mockTrigger.mock.calls[0]
    expect(payload.aiProvider).toBe('gemini')
    expect(payload.aiConfig.apiKey).toBe('goog-key')
  })

  it('returns 500 when no AI provider keys are configured', async () => {
    delete process.env.LEGNEXT_API_KEY
    delete process.env.GOOGLE_API_KEY
    POST = await importRoute()

    const req = jsonRequest({
      projectId: 'proj_1',
      x: 0,
      y: 0,
      prompt: 'forest',
      isFirstTile: true,
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
    const body = await responseJson(res)
    expect(body.error).toMatch(/LEGNEXT_API_KEY|GOOGLE_API_KEY/)
  })

  it('returns 500 when GOOGLE_API_KEY is missing for follow-up tile', async () => {
    process.env.LEGNEXT_API_KEY = 'leg'
    delete process.env.GOOGLE_API_KEY
    process.env.FOLLOW_UP_IMAGE_PROVIDER = 'nano-banana'
    POST = await importRoute()

    const req = jsonRequest({
      projectId: 'proj_1',
      x: 1,
      y: 0,
      prompt: 'river',
      isFirstTile: false,
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
    const body = await responseJson(res)
    expect(body.error).toContain('GOOGLE_API_KEY')
  })

  it('falls back to nano-banana when LEGNEXT is missing for legnext follow-up tile', async () => {
    delete process.env.LEGNEXT_API_KEY
    process.env.GOOGLE_API_KEY = 'goog'
    process.env.FOLLOW_UP_IMAGE_PROVIDER = 'legnext-upload-paint'
    POST = await importRoute()

    const req = jsonRequest({
      projectId: 'proj_1',
      x: 1,
      y: 0,
      prompt: 'river',
      isFirstTile: false,
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await responseJson(res)
    expect(body.success).toBe(true)
    const [, payload] = mockTrigger.mock.calls[0]
    expect(payload.aiProvider).toBe('nano-banana')
  })

  it('returns 400 when required fields are missing', async () => {
    process.env.LEGNEXT_API_KEY = 'leg'
    process.env.GOOGLE_API_KEY = 'goog'
    POST = await importRoute()

    const res = await POST(jsonRequest({ projectId: 'proj_1' }))
    expect(res.status).toBe(400)
  })
})

// ─── trigger-upscale ───

describe('POST /api/trigger-upscale', () => {
  let POST: RouteHandler
  const savedEnv = { ...process.env }

  beforeEach(async () => {
    vi.resetModules()
    process.env = { ...savedEnv }
    mockTrigger.mockClear()
  })

  afterEach(() => {
    process.env = savedEnv
  })

  async function importRoute() {
    const mod = await import('../trigger-upscale/route')
    return mod.POST
  }

  const basePayload = {
    tileId: 'tile_1',
    projectId: 'proj_1',
    imageBase64: 'base64data',
    prompt: 'enhance',
    creativity: 0.5,
  }

  it('resolves STABILITY_API_KEY for default provider', async () => {
    process.env.STABILITY_API_KEY = 'stab-key'
    process.env.GOOGLE_API_KEY = 'goog-key'
    POST = await importRoute()

    const res = await POST(jsonRequest(basePayload))
    const body = await responseJson(res)

    expect(body.success).toBe(true)
    const [, payload] = mockTrigger.mock.calls[0]
    expect(payload.provider).toBe('stability')
    expect(payload.providerConfig.apiKey).toBe('stab-key')
    expect(payload.geminiConfig.apiKey).toBe('goog-key')
  })

  it('resolves LEGNEXT_API_KEY for midjourney provider', async () => {
    process.env.LEGNEXT_API_KEY = 'leg-key'
    process.env.GOOGLE_API_KEY = 'goog-key'
    POST = await importRoute()

    const res = await POST(jsonRequest({ ...basePayload, provider: 'midjourney' }))
    const body = await responseJson(res)

    expect(body.success).toBe(true)
    const [, payload] = mockTrigger.mock.calls[0]
    expect(payload.providerConfig.apiKey).toBe('leg-key')
  })

  it('resolves REPLICATE_API_TOKEN for replicate provider', async () => {
    process.env.REPLICATE_API_TOKEN = 'rep-tok'
    process.env.GOOGLE_API_KEY = 'goog-key'
    POST = await importRoute()

    const res = await POST(jsonRequest({ ...basePayload, provider: 'replicate' }))
    const body = await responseJson(res)

    expect(body.success).toBe(true)
    const [, payload] = mockTrigger.mock.calls[0]
    expect(payload.providerConfig.apiKey).toBe('rep-tok')
  })

  it('returns 500 when provider key is missing', async () => {
    delete process.env.STABILITY_API_KEY
    process.env.GOOGLE_API_KEY = 'goog'
    POST = await importRoute()

    const res = await POST(jsonRequest(basePayload))
    expect(res.status).toBe(500)
    const body = await responseJson(res)
    expect(body.error).toContain('stability')
  })

  it('returns 500 when GOOGLE_API_KEY is missing and gemini pre-upscale is not skipped', async () => {
    process.env.STABILITY_API_KEY = 'stab'
    delete process.env.GOOGLE_API_KEY
    POST = await importRoute()

    const res = await POST(jsonRequest(basePayload))
    expect(res.status).toBe(500)
    const body = await responseJson(res)
    expect(body.error).toContain('GOOGLE_API_KEY')
  })

  it('skips gemini key check when skipGeminiPreUpscale is true', async () => {
    process.env.STABILITY_API_KEY = 'stab'
    delete process.env.GOOGLE_API_KEY
    POST = await importRoute()

    const res = await POST(jsonRequest({ ...basePayload, skipGeminiPreUpscale: true }))
    const body = await responseJson(res)
    expect(body.success).toBe(true)
  })
})

// ─── trigger-fidelity ───

describe('POST /api/trigger-fidelity', () => {
  let POST: RouteHandler
  const savedEnv = { ...process.env }

  beforeEach(async () => {
    vi.resetModules()
    process.env = { ...savedEnv }
    mockTrigger.mockClear()
  })

  afterEach(() => {
    process.env = savedEnv
  })

  async function importRoute() {
    const mod = await import('../trigger-fidelity/route')
    return mod.POST
  }

  const basePayload = {
    tileId: 'tile_1',
    projectId: 'proj_1',
    imageBase64: 'base64data',
    stylePrompt: 'dark fantasy',
    creativity: 0.3,
  }

  it('resolves GOOGLE_API_KEY for gemini config', async () => {
    process.env.GOOGLE_API_KEY = 'goog-fid'
    POST = await importRoute()

    const res = await POST(jsonRequest(basePayload))
    const body = await responseJson(res)

    expect(body.success).toBe(true)
    const [, payload] = mockTrigger.mock.calls[0]
    expect(payload.geminiConfig.apiKey).toBe('goog-fid')
    expect(payload.geminiConfig.model).toBe('gemini-3-pro-image-preview')
  })

  it('returns 500 when GOOGLE_API_KEY is missing', async () => {
    delete process.env.GOOGLE_API_KEY
    POST = await importRoute()

    const res = await POST(jsonRequest(basePayload))
    expect(res.status).toBe(500)
    const body = await responseJson(res)
    expect(body.error).toContain('GOOGLE_API_KEY')
  })

  it('returns 400 when required fields are missing', async () => {
    process.env.GOOGLE_API_KEY = 'goog'
    POST = await importRoute()

    const res = await POST(jsonRequest({ tileId: 'tile_1' }))
    expect(res.status).toBe(400)
  })
})
