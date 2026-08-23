import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateWithStability } from '../generate-tile-stability'
import type { AiProviderConfig } from '@/shared/ai/ai-provider-config'

vi.mock('@/shared/data/server/image-service', () => ({
  imageService: {
    assembleContext: vi.fn().mockResolvedValue({
      mask: Buffer.alloc(1024 * 1024),
    }),
    crop: vi.fn().mockImplementation((buf: Buffer) => Promise.resolve(buf)),
  },
}))

describe('generate-tile-stability', () => {
  const dummyConfig: AiProviderConfig = {
    apiKey: 'sk-test-stability-key',
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('generates first tile using Stability text-to-image endpoint and returns base64', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          artifacts: [{ base64: 'fake_base64_stability_data' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const result = await generateWithStability(
      'Snowy mountain peak with frozen waterfalls',
      dummyConfig,
      true
    )

    expect(result).toBe('fake_base64_stability_data')
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const [calledUrl, calledInit] = fetchSpy.mock.calls[0]
    expect(calledUrl).toContain('generation/stable-diffusion-xl-1024-v1-0/text-to-image')
    expect(calledInit?.method).toBe('POST')
  })

  it('generates follow-up tile using Stability inpaint endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          artifacts: [{ base64: 'fake_inpaint_stability_data' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const result = await generateWithStability(
      'Frozen river valley',
      dummyConfig,
      false,
      undefined,
      'base64image'
    )

    expect(result).toBeDefined()
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const [calledUrl, calledInit] = fetchSpy.mock.calls[0]
    expect(calledUrl).toContain('image-to-image/masking')
    expect(calledInit?.method).toBe('POST')
  })

  it('throws error when Stability API returns non-OK status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Invalid authorization header', { status: 401 })
    )

    await expect(
      generateWithStability('Mountain lake', dummyConfig, true)
    ).rejects.toThrow('Stability API error: 401 - Invalid authorization header')
  })

  it('throws error when response contains no image string', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await expect(
      generateWithStability('Mountain lake', dummyConfig, true)
    ).rejects.toThrow('No image data in Stability response')
  })
})
