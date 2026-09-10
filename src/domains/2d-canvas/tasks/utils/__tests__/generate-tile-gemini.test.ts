import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateWithGemini } from '../generate-tile-gemini'
import type { AiProviderConfig } from '@/shared/ai/ai-provider-config'

vi.mock('../generate-tile-gemini-response', () => ({
  extractGeminiImageData: vi.fn().mockReturnValue('extracted_gemini_b64'),
}))

vi.mock('../generate-tile-output', () => ({
  toTilePngBase64: vi.fn().mockImplementation((b64: string) => Promise.resolve(`processed_${b64}`)),
}))

describe('generate-tile-gemini', () => {
  const dummyConfig: AiProviderConfig = {
    apiKey: 'ai-gemini-key',
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('generates first tile using Google Generative Language API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('style_ref.png')) {
        return Promise.resolve(
          new Response(new Uint8Array([1, 2, 3, 4]), {
            status: 200,
            headers: { 'Content-Type': 'image/png' },
          })
        )
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ inlineData: { data: 'gemini_b64_data' } }] } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    })

    const result = await generateWithGemini(
      'Desert oasis at sunset',
      dummyConfig,
      true,
      ['https://cdn.example.com/style_ref.png']
    )

    expect(result).toBe('extracted_gemini_b64')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('generates follow-up tile with context image in inlineData', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ inlineData: { data: 'gemini_followup_b64' } }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const result = await generateWithGemini(
      'Sand dunes adjacent to oasis',
      dummyConfig,
      false,
      undefined,
      'base64context'
    )

    expect(result).toBe('extracted_gemini_b64')
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const [calledUrl, calledInit] = fetchSpy.mock.calls[0]
    expect(calledUrl).toContain('models/gemini')
    expect(calledInit?.method).toBe('POST')

    const body = typeof calledInit?.body === 'string' ? JSON.parse(calledInit.body) : {}
    expect(body.contents).toBeDefined()
    expect(body.contents[0].parts).toHaveLength(2)
  })

  it('throws error when Gemini API returns non-OK status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Resource has been exhausted', { status: 429 })
    )

    await expect(
      generateWithGemini('Dunes', dummyConfig, true)
    ).rejects.toThrow('Gemini API error: 429 - Resource has been exhausted')
  })
})
