import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateWithGrok } from '../generate-tile-grok'
import type { AiProviderConfig } from '@/shared/ai/ai-provider-config'

vi.mock('../generate-tile-output', () => ({
  toTilePngBase64: vi.fn().mockImplementation((b64: string) => Promise.resolve(`processed_${b64}`)),
}))

describe('generate-tile-grok', () => {
  const dummyConfig: AiProviderConfig = {
    apiKey: 'sk-or-grok-key',
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('generates first tile using OpenRouter Grok endpoint', async () => {
    const rawB64 = 'raw_grok_image_base64'

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ b64_json: rawB64 }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const result = await generateWithGrok(
      'A crystal cave with glowing gems',
      dummyConfig,
      true,
      ['https://cdn.example.com/style_crystal.png'],
      undefined,
      undefined
    )

    expect(result).toBe(`processed_${rawB64}`)
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const [calledUrl, calledInit] = fetchSpy.mock.calls[0]
    expect(calledUrl).toContain('/images')
    expect(calledInit?.method).toBe('POST')

    const body = typeof calledInit?.body === 'string' ? JSON.parse(calledInit.body) : {}
    expect(body.prompt).toContain('A crystal cave with glowing gems')
    expect(body.input_references).toHaveLength(1)
  })

  it('generates follow-up tile with context image input reference', async () => {
    const rawB64 = 'raw_grok_followup_base64'

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ b64_json: rawB64 }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const contextBase64 = 'base64contextdata'

    const result = await generateWithGrok(
      'Crystal bridge connecting cavern',
      dummyConfig,
      false,
      undefined,
      contextBase64,
      undefined
    )

    expect(result).toBe(`processed_${rawB64}`)
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const [, calledInit] = fetchSpy.mock.calls[0]
    const body = typeof calledInit?.body === 'string' ? JSON.parse(calledInit.body) : {}
    expect(body.prompt).toContain('Crystal bridge connecting cavern')
    expect(body.input_references).toHaveLength(1)
  })

  it('throws error on non-OK OpenRouter response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Rate limit exceeded', { status: 429 })
    )

    await expect(
      generateWithGrok('Lava lake', dummyConfig, true, undefined, undefined, undefined)
    ).rejects.toThrow('OpenRouter Grok image error: 429 - Rate limit exceeded')
  })

  it('throws error when response has no image data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await expect(
      generateWithGrok('Lava lake', dummyConfig, true, undefined, undefined, undefined)
    ).rejects.toThrow('No image data in OpenRouter Grok response')
  })
})
