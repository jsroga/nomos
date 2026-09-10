import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateWithOpenAI } from '../generate-tile-openai'
import type { AiProviderConfig } from '@/shared/ai/ai-provider-config'

vi.mock('@/shared/data/server/image-service', () => ({
  imageService: {
    assembleContext: vi.fn().mockResolvedValue({
      mask: new Uint8Array(1024 * 1024),
    }),
    crop: vi.fn().mockImplementation((buf: Buffer) => Promise.resolve(buf)),
  },
}))

describe('generate-tile-openai', () => {
  const dummyConfig: AiProviderConfig = {
    apiKey: 'sk-test-openai-key',
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('generates first tile using OpenAI generations endpoint and returns base64', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ b64_json: 'fake_base64_data' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const result = await generateWithOpenAI(
      'Enchanted forest canopy with fireflies',
      dummyConfig,
      true
    )

    expect(result).toBe('fake_base64_data')
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const [calledUrl, calledInit] = fetchSpy.mock.calls[0]
    expect(calledUrl).toContain('/images/generations')
    expect(calledInit?.method).toBe('POST')
  })

  it('generates follow-up tile using OpenAI edits inpainting endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ b64_json: 'fake_inpaint_data' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const result = await generateWithOpenAI(
      'Path leading deeper into forest',
      dummyConfig,
      false,
      undefined,
      'base64image'
    )

    expect(result).toBeDefined()
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const [calledUrl, calledInit] = fetchSpy.mock.calls[0]
    expect(calledUrl).toContain('/images/edits')
    expect(calledInit?.method).toBe('POST')
  })

  it('throws error when OpenAI API returns non-OK status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Billing quota exceeded', { status: 400 })
    )

    await expect(
      generateWithOpenAI('Forest glade', dummyConfig, true)
    ).rejects.toThrow('OpenAI API error: 400 - Billing quota exceeded')
  })

  it('throws error when response contains no image data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await expect(
      generateWithOpenAI('Forest glade', dummyConfig, true)
    ).rejects.toThrow('No image data in OpenAI response')
  })
})
